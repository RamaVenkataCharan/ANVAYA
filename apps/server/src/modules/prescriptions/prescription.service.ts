import { Role, VerificationStatus, PrescriptionStatus, CreatePrescriptionInput, DispensePrescriptionInput } from '@anvaya/shared';
import { prisma, isDbConnected } from '../../config/prisma';
import { inMemoryDb, DbPrescription } from '../../db/inMemoryDb';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../utils/errors';
import { recordAuditLog } from '../../middleware/audit';
import crypto from 'crypto';

export class PrescriptionService {
  private generatePrescriptionCode(): string {
    const part1 = Math.floor(1000 + Math.random() * 9000);
    const part2 = Math.floor(1000 + Math.random() * 9000);
    return `ANV-${part1}-${part2}`;
  }

  /**
   * Issues a new e-prescription with structured medicines, unique code, and QR token
   */
  async createPrescription(doctorId: string, input: CreatePrescriptionInput, doctorUserId?: string) {
    const code = this.generatePrescriptionCode();
    const qrToken = crypto.randomBytes(32).toString('hex');

    if (isDbConnected()) {
      const prescription = await prisma.prescription.create({
        data: {
          doctorId,
          patientId: input.patientId,
          code,
          qrToken,
          status: PrescriptionStatus.ISSUED,
          diagnosis: input.diagnosis,
          notes: input.notes,
          items: {
            create: input.items.map((item) => ({
              medicine: item.medicine,
              dosage: item.dosage,
              frequency: item.frequency,
              duration: item.duration,
              quantity: item.quantity,
              instructions: item.instructions,
            })),
          },
        },
        include: {
          items: true,
          doctor: {
            include: { user: { select: { name: true, email: true, phone: true } } },
          },
          patient: {
            include: { user: { select: { name: true, email: true, phone: true } } },
          },
        },
      });

      recordAuditLog({
        userId: doctorUserId,
        action: 'PRESCRIPTION_ISSUED',
        resource: 'PRESCRIPTION',
        resourceId: prescription.id,
        metadata: { code: prescription.code, patientId: input.patientId },
      });

      return prescription;
    } else {
      const presId = crypto.randomUUID();
      const newPres: DbPrescription = {
        id: presId,
        doctorId,
        patientId: input.patientId,
        shopId: null,
        code,
        qrToken,
        status: PrescriptionStatus.ISSUED,
        diagnosis: input.diagnosis,
        notes: input.notes || null,
        issuedAt: new Date(),
        dispensedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      inMemoryDb.prescriptions.unshift(newPres);

      const items = input.items.map((item) => {
        const itemObj = {
          id: crypto.randomUUID(),
          prescriptionId: presId,
          medicine: item.medicine,
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
          quantity: item.quantity,
          instructions: item.instructions || null,
        };
        inMemoryDb.prescriptionItems.push(itemObj);
        return itemObj;
      });

      recordAuditLog({
        userId: doctorUserId,
        action: 'PRESCRIPTION_ISSUED',
        resource: 'PRESCRIPTION',
        resourceId: presId,
        metadata: { code, patientId: input.patientId },
      });

      return this.formatPrescription(newPres, items);
    }
  }

  /**
   * Retrieves prescriptions according to caller role
   */
  async getPrescriptions(user: { role: Role; doctorId?: string; patientId?: string; shopId?: string }) {
    if (isDbConnected()) {
      const where: any = {};
      if (user.role === Role.DOCTOR && user.doctorId) {
        where.doctorId = user.doctorId;
      } else if (user.role === Role.PATIENT && user.patientId) {
        where.patientId = user.patientId;
      }

      return prisma.prescription.findMany({
        where,
        include: {
          items: true,
          doctor: {
            include: { user: { select: { name: true, email: true, phone: true } } },
          },
          patient: {
            include: { user: { select: { name: true, email: true, phone: true } } },
          },
          shop: {
            select: { id: true, shopName: true, phone: true, address: true },
          },
        },
        orderBy: { issuedAt: 'desc' },
      });
    } else {
      let presList = [...inMemoryDb.prescriptions];
      if (user.role === Role.DOCTOR && user.doctorId) {
        presList = presList.filter((p) => p.doctorId === user.doctorId);
      } else if (user.role === Role.PATIENT && user.patientId) {
        presList = presList.filter((p) => p.patientId === user.patientId);
      }

      return presList
        .sort((a, b) => b.issuedAt.getTime() - a.issuedAt.getTime())
        .map((p) => {
          const items = inMemoryDb.prescriptionItems.filter((i) => i.prescriptionId === p.id);
          return this.formatPrescription(p, items);
        });
    }
  }

  /**
   * Retrieves single prescription by ID
   */
  async getPrescriptionById(id: string) {
    if (isDbConnected()) {
      const prescription = await prisma.prescription.findUnique({
        where: { id },
        include: {
          items: true,
          doctor: {
            include: { user: { select: { name: true, email: true, phone: true } } },
          },
          patient: {
            include: { user: { select: { name: true, email: true, phone: true } } },
          },
          shop: {
            select: { id: true, shopName: true, phone: true, address: true },
          },
        },
      });

      if (!prescription) {
        throw new NotFoundError('Prescription not found');
      }

      return prescription;
    } else {
      const pres = inMemoryDb.prescriptions.find((p) => p.id === id);
      if (!pres) {
        throw new NotFoundError('Prescription not found');
      }
      const items = inMemoryDb.prescriptionItems.filter((i) => i.prescriptionId === pres.id);
      return this.formatPrescription(pres, items);
    }
  }

  /**
   * Verifies prescription by either human-readable code or QR cryptographic token
   */
  async verifyPrescription(codeOrToken: string, shopUserId?: string, shopId?: string) {
    const cleanToken = codeOrToken.trim();

    if (isDbConnected()) {
      const prescription = await prisma.prescription.findFirst({
        where: {
          OR: [{ code: cleanToken }, { qrToken: cleanToken }],
        },
        include: {
          items: true,
          doctor: {
            include: { user: { select: { name: true, email: true, phone: true } } },
          },
          patient: {
            include: { user: { select: { name: true, email: true, phone: true } } },
          },
          shop: {
            select: { id: true, shopName: true, phone: true, address: true },
          },
        },
      });

      if (!prescription) {
        throw new NotFoundError('No prescription found matching the scanned QR token or code');
      }

      recordAuditLog({
        userId: shopUserId,
        action: 'PRESCRIPTION_VERIFIED',
        resource: 'PRESCRIPTION',
        resourceId: prescription.id,
        metadata: {
          code: prescription.code,
          status: prescription.status,
          isValid: prescription.status === PrescriptionStatus.ISSUED,
          shopId,
        },
      });

      return {
        isValid: prescription.status === PrescriptionStatus.ISSUED,
        status: prescription.status,
        prescription,
      };
    } else {
      const pres = inMemoryDb.prescriptions.find(
        (p) => p.code.toLowerCase() === cleanToken.toLowerCase() || p.qrToken === cleanToken
      );

      if (!pres) {
        throw new NotFoundError('No prescription found matching the scanned QR token or code');
      }

      const items = inMemoryDb.prescriptionItems.filter((i) => i.prescriptionId === pres.id);
      const formatted = this.formatPrescription(pres, items);

      recordAuditLog({
        userId: shopUserId,
        action: 'PRESCRIPTION_VERIFIED',
        resource: 'PRESCRIPTION',
        resourceId: pres.id,
        metadata: {
          code: pres.code,
          status: pres.status,
          isValid: pres.status === PrescriptionStatus.ISSUED,
          shopId,
        },
      });

      return {
        isValid: pres.status === PrescriptionStatus.ISSUED,
        status: pres.status,
        prescription: formatted,
      };
    }
  }

  /**
   * Fulfills and dispenses prescription. Irreversibly locks prescription from further redemptions.
   */
  async dispensePrescription(shopId: string, input: DispensePrescriptionInput, shopUserId?: string) {
    const cleanToken = input.codeOrToken.trim();

    if (isDbConnected()) {
      // First resolve the prescription ID from code or QR token
      const existing = await prisma.prescription.findFirst({
        where: { OR: [{ code: cleanToken }, { qrToken: cleanToken }] },
        select: { id: true, code: true, status: true },
      });

      if (!existing) throw new NotFoundError('Prescription not found');

      if (existing.status === PrescriptionStatus.CANCELLED) {
        throw new BadRequestError('Prescription was cancelled by the physician');
      }

      // Atomic conditional update: only succeeds when status is currently ISSUED.
      // Uses updateMany so we can check the count — avoids a check-then-update race condition.
      const result = await prisma.prescription.updateMany({
        where: {
          id: existing.id,
          status: PrescriptionStatus.ISSUED, // guard — prevents double-dispense at DB level
        },
        data: {
          status: PrescriptionStatus.DISPENSED,
          shopId,
          dispensedAt: new Date(),
        },
      });

      if (result.count === 0) {
        // Another request beat us to it (or status was already DISPENSED)
        throw new BadRequestError(
          'Fraud prevention alert: This prescription has ALREADY been dispensed and cannot be fulfilled again'
        );
      }

      // Fetch the full record now that we own the dispense
      const dispensed = await prisma.prescription.findUniqueOrThrow({
        where: { id: existing.id },
        include: {
          items: true,
          doctor: { include: { user: { select: { name: true, email: true, phone: true } } } },
          patient: { include: { user: { select: { name: true, email: true, phone: true } } } },
          shop: true,
        },
      });

      recordAuditLog({
        userId: shopUserId,
        action: 'PRESCRIPTION_DISPENSED',
        resource: 'PRESCRIPTION',
        resourceId: dispensed.id,
        metadata: { code: dispensed.code, shopId },
      });

      return dispensed;
    } else {
      // In-memory path: resolve then do a synchronous compare-and-swap
      const pres = inMemoryDb.prescriptions.find(
        (p) => p.code.toLowerCase() === cleanToken.toLowerCase() || p.qrToken === cleanToken
      );

      if (!pres) throw new NotFoundError('Prescription not found');

      if (pres.status === PrescriptionStatus.CANCELLED) {
        throw new BadRequestError('Prescription was cancelled by the physician');
      }

      // Atomic compare-and-swap: only transition from ISSUED -> DISPENSED
      if (pres.status !== PrescriptionStatus.ISSUED) {
        throw new BadRequestError(
          'Fraud prevention alert: This prescription has ALREADY been dispensed and cannot be fulfilled again'
        );
      }

      // Single assignment — no gap between the check and the write in the synchronous event loop
      pres.status = PrescriptionStatus.DISPENSED;
      pres.shopId = shopId;
      pres.dispensedAt = new Date();
      pres.updatedAt = new Date();

      const items = inMemoryDb.prescriptionItems.filter((i) => i.prescriptionId === pres.id);

      recordAuditLog({
        userId: shopUserId,
        action: 'PRESCRIPTION_DISPENSED',
        resource: 'PRESCRIPTION',
        resourceId: pres.id,
        metadata: { code: pres.code, shopId },
      });

      return this.formatPrescription(pres, items);
    }
  }

  /**
   * Cancels an issued prescription
   */
  async cancelPrescription(id: string, doctorId: string, doctorUserId?: string) {
    if (isDbConnected()) {
      const existing = await prisma.prescription.findUnique({ where: { id } });
      if (!existing) throw new NotFoundError('Prescription not found');
      if (existing.doctorId !== doctorId) throw new ForbiddenError('Unauthorized to cancel this prescription');
      if (existing.status === PrescriptionStatus.DISPENSED) {
        throw new BadRequestError('Cannot cancel a prescription that has already been dispensed');
      }

      const updated = await prisma.prescription.update({
        where: { id },
        data: { status: PrescriptionStatus.CANCELLED },
      });

      recordAuditLog({
        userId: doctorUserId,
        action: 'PRESCRIPTION_CANCELLED',
        resource: 'PRESCRIPTION',
        resourceId: id,
      });

      return updated;
    } else {
      const pres = inMemoryDb.prescriptions.find((p) => p.id === id);
      if (!pres) throw new NotFoundError('Prescription not found');
      if (pres.doctorId !== doctorId) throw new ForbiddenError('Unauthorized to cancel this prescription');
      if (pres.status === PrescriptionStatus.DISPENSED) {
        throw new BadRequestError('Cannot cancel a prescription that has already been dispensed');
      }

      pres.status = PrescriptionStatus.CANCELLED;
      pres.updatedAt = new Date();

      recordAuditLog({
        userId: doctorUserId,
        action: 'PRESCRIPTION_CANCELLED',
        resource: 'PRESCRIPTION',
        resourceId: id,
      });

      const items = inMemoryDb.prescriptionItems.filter((i) => i.prescriptionId === pres.id);
      return this.formatPrescription(pres, items);
    }
  }

  private formatPrescription(p: DbPrescription, items: any[]) {
    const doctor = inMemoryDb.doctors.find((d) => d.id === p.doctorId);
    const doctorUser = doctor ? inMemoryDb.users.find((u) => u.id === doctor.userId) : null;
    const patient = inMemoryDb.patients.find((pt) => pt.id === p.patientId);
    const patientUser = patient ? inMemoryDb.users.find((u) => u.id === patient.userId) : null;
    const shop = p.shopId ? inMemoryDb.shops.find((s) => s.id === p.shopId) : null;

    return {
      ...p,
      items,
      doctor: doctor
        ? {
            id: doctor.id,
            specialization: doctor.specialization,
            registrationNo: doctor.registrationNo,
            clinicAddress: doctor.clinicAddress,
            user: doctorUser
              ? { name: doctorUser.name, email: doctorUser.email, phone: doctorUser.phone }
              : null,
          }
        : null,
      patient: patient
        ? {
            id: patient.id,
            gender: patient.gender,
            dob: patient.dob.toISOString().split('T')[0],
            bloodGroup: patient.bloodGroup,
            user: patientUser
              ? { name: patientUser.name, email: patientUser.email, phone: patientUser.phone }
              : null,
          }
        : null,
      shop: shop
        ? {
            id: shop.id,
            shopName: shop.shopName,
            address: shop.address,
            phone: shop.phone,
          }
        : null,
    };
  }
}

export const prescriptionService = new PrescriptionService();
