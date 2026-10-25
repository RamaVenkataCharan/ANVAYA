import { ReportType, CreateReportInput } from '@anvaya/shared';
import { prisma, isDbConnected } from '../../config/prisma';
import { inMemoryDb, DbReport } from '../../db/inMemoryDb';
import { NotFoundError, ForbiddenError } from '../../utils/errors';
import { recordAuditLog } from '../../middleware/audit';
import crypto from 'crypto';

export class ReportService {
  /**
   * Uploads a new health report to the patient's digital vault
   */
  async createReport(patientId: string, input: CreateReportInput, patientUserId?: string) {
    if (isDbConnected()) {
      const report = await prisma.report.create({
        data: {
          patientId,
          title: input.title,
          fileUrl: input.fileUrl,
          type: input.type,
          notes: input.notes,
          uploadedAt: new Date(),
        },
      });

      recordAuditLog({
        userId: patientUserId,
        action: 'REPORT_UPLOADED',
        resource: 'REPORT',
        resourceId: report.id,
        metadata: { title: input.title, type: input.type },
      });

      return report;
    } else {
      const reportId = crypto.randomUUID();
      const newReport: DbReport = {
        id: reportId,
        patientId,
        title: input.title,
        fileUrl: input.fileUrl,
        type: input.type,
        notes: input.notes || null,
        uploadedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      inMemoryDb.reports.unshift(newReport);

      recordAuditLog({
        userId: patientUserId,
        action: 'REPORT_UPLOADED',
        resource: 'REPORT',
        resourceId: reportId,
        metadata: { title: input.title, type: input.type },
      });

      return this.formatReport(newReport);
    }
  }

  /**
   * Returns all health reports for a patient.
   * Doctors can only view if they have an active consent from the patient.
   */
  async getReports(patientId: string, callerId?: string, callerDoctorId?: string) {
    // Enforce consent check for doctors
    if (callerDoctorId) {
      await this.assertConsent(patientId, callerDoctorId);
    }

    if (isDbConnected()) {
      return prisma.report.findMany({
        where: { patientId },
        orderBy: { uploadedAt: 'desc' },
      });
    } else {
      return inMemoryDb.reports
        .filter((r) => r.patientId === patientId)
        .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())
        .map((r) => this.formatReport(r));
    }
  }

  /**
   * Returns a single report by ID (owner or consented doctor only)
   */
  async getReportById(id: string, patientId?: string, callerDoctorId?: string) {
    if (isDbConnected()) {
      const report = await prisma.report.findUnique({ where: { id } });
      if (!report) throw new NotFoundError('Report not found');

      // Enforce ownership or consent
      if (patientId && report.patientId !== patientId) {
        throw new ForbiddenError('You do not have access to this report');
      }
      if (callerDoctorId) {
        await this.assertConsent(report.patientId, callerDoctorId);
      }

      return report;
    } else {
      const report = inMemoryDb.reports.find((r) => r.id === id);
      if (!report) throw new NotFoundError('Report not found');

      if (patientId && report.patientId !== patientId) {
        throw new ForbiddenError('You do not have access to this report');
      }
      if (callerDoctorId) {
        await this.assertConsent(report.patientId, callerDoctorId);
      }

      return this.formatReport(report);
    }
  }

  /**
   * Deletes a report from the vault (patient only)
   */
  async deleteReport(id: string, patientId: string, patientUserId?: string) {
    if (isDbConnected()) {
      const report = await prisma.report.findUnique({ where: { id } });
      if (!report) throw new NotFoundError('Report not found');
      if (report.patientId !== patientId) {
        throw new ForbiddenError('You can only delete your own reports');
      }

      await prisma.report.delete({ where: { id } });

      recordAuditLog({
        userId: patientUserId,
        action: 'REPORT_DELETED',
        resource: 'REPORT',
        resourceId: id,
      });
    } else {
      const index = inMemoryDb.reports.findIndex((r) => r.id === id);
      if (index === -1) throw new NotFoundError('Report not found');
      if (inMemoryDb.reports[index].patientId !== patientId) {
        throw new ForbiddenError('You can only delete your own reports');
      }

      inMemoryDb.reports.splice(index, 1);

      recordAuditLog({
        userId: patientUserId,
        action: 'REPORT_DELETED',
        resource: 'REPORT',
        resourceId: id,
      });
    }
  }

  /**
   * Asserts that an active consent exists between patient and doctor
   */
  private async assertConsent(patientId: string, doctorId: string) {
    if (isDbConnected()) {
      const consent = await prisma.consent.findFirst({
        where: { patientId, doctorId, isActive: true },
      });
      if (!consent) {
        throw new ForbiddenError('Access denied: No active consent from this patient');
      }
    } else {
      const consent = inMemoryDb.consents.find(
        (c) => c.patientId === patientId && c.doctorId === doctorId && c.isActive
      );
      if (!consent) {
        throw new ForbiddenError('Access denied: No active consent from this patient');
      }
    }
  }

  private formatReport(r: DbReport) {
    return {
      ...r,
      uploadedAt: r.uploadedAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }
}

export const reportService = new ReportService();
