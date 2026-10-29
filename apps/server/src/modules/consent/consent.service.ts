import { GrantConsentInput, RevokeConsentInput } from '@anvaya/shared';
import { prisma, isDbConnected } from '../../config/prisma';
import { inMemoryDb, DbConsent } from '../../db/inMemoryDb';
import { NotFoundError, BadRequestError } from '../../utils/errors';
import { recordAuditLog } from '../../middleware/audit';
import crypto from 'crypto';

export class ConsentService {
  /**
   * Grants clinical access to a specific doctor
   */
  async grantConsent(patientId: string, input: GrantConsentInput, patientUserId?: string) {
    if (isDbConnected()) {
      // Verify the doctor exists
      const doctor = await prisma.doctor.findUnique({ where: { id: input.doctorId } });
      if (!doctor) throw new NotFoundError('Doctor not found');

      // Check for existing active consent
      const existing = await prisma.consent.findFirst({
        where: { patientId, doctorId: input.doctorId, isActive: true },
      });
      if (existing) {
        throw new BadRequestError('Active consent already exists for this doctor');
      }

      const consent = await prisma.consent.create({
        data: {
          patientId,
          doctorId: input.doctorId,
          isActive: true,
          grantedAt: new Date(),
          notes: input.notes,
        },
        include: {
          doctor: {
            include: { user: { select: { name: true, email: true, phone: true } } },
          },
        },
      });

      recordAuditLog({
        userId: patientUserId,
        action: 'CONSENT_GRANTED',
        resource: 'CONSENT',
        resourceId: consent.id,
        metadata: { doctorId: input.doctorId },
      });

      return consent;
    } else {
      const doctor = inMemoryDb.doctors.find((d) => d.id === input.doctorId);
      if (!doctor) throw new NotFoundError('Doctor not found');

      const existing = inMemoryDb.consents.find(
        (c) => c.patientId === patientId && c.doctorId === input.doctorId && c.isActive
      );
      if (existing) {
        throw new BadRequestError('Active consent already exists for this doctor');
      }

      const consentId = crypto.randomUUID();
      const newConsent: DbConsent = {
        id: consentId,
        patientId,
        doctorId: input.doctorId,
        isActive: true,
        grantedAt: new Date(),
        revokedAt: null,
        notes: input.notes || null,
      };

      inMemoryDb.consents.unshift(newConsent);

      recordAuditLog({
        userId: patientUserId,
        action: 'CONSENT_GRANTED',
        resource: 'CONSENT',
        resourceId: consentId,
        metadata: { doctorId: input.doctorId },
      });

      return this.formatConsent(newConsent);
    }
  }

  /**
   * Revokes previously granted consent from a doctor
   */
  async revokeConsent(patientId: string, input: RevokeConsentInput, patientUserId?: string) {
    if (isDbConnected()) {
      const existing = await prisma.consent.findFirst({
        where: { patientId, doctorId: input.doctorId, isActive: true },
      });
      if (!existing) {
        throw new NotFoundError('No active consent found for this doctor');
      }

      const revoked = await prisma.consent.update({
        where: { id: existing.id },
        data: { isActive: false, revokedAt: new Date() },
        include: {
          doctor: {
            include: { user: { select: { name: true, email: true, phone: true } } },
          },
        },
      });

      recordAuditLog({
        userId: patientUserId,
        action: 'CONSENT_REVOKED',
        resource: 'CONSENT',
        resourceId: existing.id,
        metadata: { doctorId: input.doctorId },
      });

      return revoked;
    } else {
      const consent = inMemoryDb.consents.find(
        (c) => c.patientId === patientId && c.doctorId === input.doctorId && c.isActive
      );
      if (!consent) {
        throw new NotFoundError('No active consent found for this doctor');
      }

      consent.isActive = false;
      consent.revokedAt = new Date();

      recordAuditLog({
        userId: patientUserId,
        action: 'CONSENT_REVOKED',
        resource: 'CONSENT',
        resourceId: consent.id,
        metadata: { doctorId: input.doctorId },
      });

      return this.formatConsent(consent);
    }
  }

  /**
   * Returns all consent records for the patient (active and past)
   */
  async getMyConsents(patientId: string) {
    if (isDbConnected()) {
      return prisma.consent.findMany({
        where: { patientId },
        include: {
          doctor: {
            include: { user: { select: { name: true, email: true, phone: true } } },
          },
        },
        orderBy: { grantedAt: 'desc' },
      });
    } else {
      return inMemoryDb.consents
        .filter((c) => c.patientId === patientId)
        .sort((a, b) => b.grantedAt.getTime() - a.grantedAt.getTime())
        .map((c) => this.formatConsent(c));
    }
  }

  /**
   * Returns patients who have granted consent to the calling doctor
   */
  async getPatientsWithConsent(doctorId: string) {
    if (isDbConnected()) {
      return prisma.consent.findMany({
        where: { doctorId, isActive: true },
        include: {
          patient: {
            include: { user: { select: { id: true, name: true, email: true, phone: true } } },
          },
        },
        orderBy: { grantedAt: 'desc' },
      });
    } else {
      return inMemoryDb.consents
        .filter((c) => c.doctorId === doctorId && c.isActive)
        .sort((a, b) => b.grantedAt.getTime() - a.grantedAt.getTime())
        .map((c) => {
          const patient = inMemoryDb.patients.find((p) => p.id === c.patientId);
          const patientUser = patient ? inMemoryDb.users.find((u) => u.id === patient.userId) : null;
          return {
            ...this.formatConsent(c),
            patient: patient
              ? {
                  id: patient.id,
                  user: patientUser
                    ? { id: patientUser.id, name: patientUser.name, email: patientUser.email, phone: patientUser.phone }
                    : null,
                }
              : null,
          };
        });
    }
  }

  /**
   * Retrieves audit log history of external accesses to this patient's medical records (Tier B)
   * Scoped strictly to records owned by the calling patient.
   */
  async getAccessHistory(patientId: string, patientUserId: string) {
    if (isDbConnected()) {
      const [reports, prescriptions] = await Promise.all([
        prisma.report.findMany({ where: { patientId }, select: { id: true, title: true } }),
        prisma.prescription.findMany({ where: { patientId }, select: { id: true, code: true } }),
      ]);
      const reportMap = new Map(reports.map((r) => [r.id, r.title]));
      const prescriptionMap = new Map(prescriptions.map((p) => [p.id, p.code]));
      const resourceIds = [...reportMap.keys(), ...prescriptionMap.keys()];

      const logs = await prisma.auditLog.findMany({
        where: {
          resourceId: { in: resourceIds },
          NOT: { userId: patientUserId },
        },
        include: {
          user: { select: { name: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      return logs.map((l) => ({
        id: l.id,
        action: l.action,
        resource: l.resource,
        resourceId: l.resourceId,
        resourceTitle: reportMap.get(l.resourceId || '') || prescriptionMap.get(l.resourceId || '') || 'Clinical Record',
        actorName: l.user?.name || 'Authorized Practitioner',
        actorRole: l.user?.role || 'DOCTOR',
        timestamp: l.createdAt.toISOString(),
      }));
    } else {
      const patientReports = inMemoryDb.reports.filter((r) => r.patientId === patientId);
      const patientPrescriptions = inMemoryDb.prescriptions.filter((p) => p.patientId === patientId);

      const reportMap = new Map(patientReports.map((r) => [r.id, r.title]));
      const prescriptionMap = new Map(patientPrescriptions.map((p) => [p.id, p.code]));
      const targetIds = new Set([...reportMap.keys(), ...prescriptionMap.keys()]);

      const accessLogs = inMemoryDb.auditLogs
        .filter(
          (l) =>
            l.resourceId &&
            targetIds.has(l.resourceId) &&
            l.userId !== patientUserId
        )
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 50);

      return accessLogs.map((l) => {
        const actor = inMemoryDb.users.find((u) => u.id === l.userId);
        return {
          id: l.id,
          action: l.action,
          resource: l.resource,
          resourceId: l.resourceId,
          resourceTitle: reportMap.get(l.resourceId || '') || prescriptionMap.get(l.resourceId || '') || 'Clinical Record',
          actorName: actor?.name || 'Authorized Provider',
          actorRole: actor?.role || 'DOCTOR',
          timestamp: l.createdAt.toISOString(),
        };
      });
    }
  }

  private formatConsent(c: DbConsent) {
    const doctor = inMemoryDb.doctors.find((d) => d.id === c.doctorId);
    const doctorUser = doctor ? inMemoryDb.users.find((u) => u.id === doctor.userId) : null;

    return {
      ...c,
      grantedAt: c.grantedAt.toISOString(),
      revokedAt: c.revokedAt ? c.revokedAt.toISOString() : null,
      doctor: doctor
        ? {
            id: doctor.id,
            specialization: doctor.specialization,
            registrationNo: doctor.registrationNo,
            user: doctorUser
              ? { name: doctorUser.name, email: doctorUser.email, phone: doctorUser.phone }
              : null,
          }
        : null,
    };
  }
}

export const consentService = new ConsentService();
