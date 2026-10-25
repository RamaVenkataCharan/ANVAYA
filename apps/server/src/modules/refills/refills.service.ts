import { prisma, isDbConnected } from '../../config/prisma';
import { inMemoryDb, DbRefillReminder } from '../../db/inMemoryDb';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../utils/errors';
import { recordAuditLog } from '../../middleware/audit';
import crypto from 'crypto';

export interface CreateRefillInput {
  prescriptionId: string;
  remindAt: string;
}

export class RefillsService {
  /**
   * Create a refill reminder for a dispensed prescription (Shop only)
   */
  async createReminder(shopId: string, input: CreateRefillInput, shopUserId?: string) {
    const remindDate = new Date(input.remindAt);
    if (isNaN(remindDate.getTime())) {
      throw new BadRequestError('Invalid remindAt date format');
    }

    if (isDbConnected()) {
      const prescription = await prisma.prescription.findUnique({
        where: { id: input.prescriptionId },
        include: { patient: { include: { user: true } } },
      });

      if (!prescription) {
        throw new NotFoundError('Prescription not found');
      }

      // Check if prescription was dispensed by this shop or belongs to this shop
      if (prescription.shopId && prescription.shopId !== shopId) {
        throw new ForbiddenError('Prescription was not dispensed by your pharmacy');
      }

      const reminder = await prisma.refillReminder.create({
        data: {
          prescriptionId: input.prescriptionId,
          patientId: prescription.patientId,
          remindAt: remindDate,
          sent: false,
        },
        include: {
          prescription: {
            select: {
              id: true,
              code: true,
              diagnosis: true,
              status: true,
              items: true,
            },
          },
          patient: {
            include: {
              user: { select: { id: true, name: true, phone: true } },
            },
          },
        },
      });

      recordAuditLog({
        userId: shopUserId,
        action: 'REFILL_REMINDER_CREATED',
        resource: 'REFILL_REMINDER',
        resourceId: reminder.id,
        metadata: {
          prescriptionId: input.prescriptionId,
          remindAt: remindDate.toISOString(),
          patientId: prescription.patientId,
        },
      });

      return reminder;
    } else {
      const prescription = inMemoryDb.prescriptions.find((p) => p.id === input.prescriptionId);
      if (!prescription) {
        throw new NotFoundError('Prescription not found');
      }

      if (prescription.shopId && prescription.shopId !== shopId) {
        throw new ForbiddenError('Prescription was not dispensed by your pharmacy');
      }

      const reminderId = crypto.randomUUID();
      const newReminder: DbRefillReminder = {
        id: reminderId,
        prescriptionId: input.prescriptionId,
        patientId: prescription.patientId,
        remindAt: remindDate,
        sent: false,
        sentAt: null,
        createdAt: new Date(),
      };

      inMemoryDb.refillReminders.unshift(newReminder);

      const patient = inMemoryDb.patients.find((p) => p.id === prescription.patientId);
      const user = patient ? inMemoryDb.users.find((u) => u.id === patient.userId) : null;
      const items = inMemoryDb.prescriptionItems.filter((i) => i.prescriptionId === prescription.id);

      recordAuditLog({
        userId: shopUserId,
        action: 'REFILL_REMINDER_CREATED',
        resource: 'REFILL_REMINDER',
        resourceId: reminderId,
        metadata: {
          prescriptionId: input.prescriptionId,
          remindAt: remindDate.toISOString(),
          patientId: prescription.patientId,
        },
      });

      return {
        id: newReminder.id,
        prescriptionId: newReminder.prescriptionId,
        patientId: newReminder.patientId,
        remindAt: newReminder.remindAt.toISOString(),
        sent: newReminder.sent,
        sentAt: newReminder.sentAt ? newReminder.sentAt.toISOString() : null,
        createdAt: newReminder.createdAt.toISOString(),
        prescription: {
          id: prescription.id,
          code: prescription.code,
          diagnosis: prescription.diagnosis,
          status: prescription.status,
          items,
        },
        patient: {
          id: prescription.patientId,
          user: user ? { id: user.id, name: user.name, phone: user.phone } : null,
        },
      };
    }
  }

  /**
   * List refill reminders for shop or patient
   */
  async getReminders(filters: { shopId?: string; patientId?: string; prescriptionId?: string }) {
    if (isDbConnected()) {
      const where: any = {};
      if (filters.prescriptionId) {
        where.prescriptionId = filters.prescriptionId;
      }
      if (filters.patientId) {
        where.patientId = filters.patientId;
      }
      if (filters.shopId) {
        where.prescription = { shopId: filters.shopId };
      }

      return prisma.refillReminder.findMany({
        where,
        include: {
          prescription: {
            select: {
              id: true,
              code: true,
              diagnosis: true,
              status: true,
              items: true,
            },
          },
          patient: {
            include: {
              user: { select: { id: true, name: true, phone: true } },
            },
          },
        },
        orderBy: { remindAt: 'asc' },
      });
    } else {
      let reminders = inMemoryDb.refillReminders;

      if (filters.prescriptionId) {
        reminders = reminders.filter((r) => r.prescriptionId === filters.prescriptionId);
      }
      if (filters.patientId) {
        reminders = reminders.filter((r) => r.patientId === filters.patientId);
      }
      if (filters.shopId) {
        reminders = reminders.filter((r) => {
          const pres = inMemoryDb.prescriptions.find((p) => p.id === r.prescriptionId);
          return pres?.shopId === filters.shopId;
        });
      }

      return reminders.map((r) => {
        const pres = inMemoryDb.prescriptions.find((p) => p.id === r.prescriptionId);
        const patient = inMemoryDb.patients.find((p) => p.id === r.patientId);
        const user = patient ? inMemoryDb.users.find((u) => u.id === patient.userId) : null;
        const items = inMemoryDb.prescriptionItems.filter((i) => i.prescriptionId === r.prescriptionId);

        return {
          id: r.id,
          prescriptionId: r.prescriptionId,
          patientId: r.patientId,
          remindAt: r.remindAt.toISOString(),
          sent: r.sent,
          sentAt: r.sentAt ? r.sentAt.toISOString() : null,
          createdAt: r.createdAt.toISOString(),
          prescription: pres
            ? {
                id: pres.id,
                code: pres.code,
                diagnosis: pres.diagnosis,
                status: pres.status,
                items,
              }
            : null,
          patient: {
            id: r.patientId,
            user: user ? { id: user.id, name: user.name, phone: user.phone } : null,
          },
        };
      });
    }
  }

  /**
   * Cancel or remove a pending refill reminder
   */
  async cancelReminder(reminderId: string, callerShopId?: string, callerPatientId?: string) {
    if (isDbConnected()) {
      const existing = await prisma.refillReminder.findUnique({
        where: { id: reminderId },
        include: { prescription: true },
      });

      if (!existing) throw new NotFoundError('Refill reminder not found');

      if (callerShopId && existing.prescription.shopId !== callerShopId) {
        throw new ForbiddenError('You can only cancel reminders created by your pharmacy');
      }

      if (callerPatientId && existing.patientId !== callerPatientId) {
        throw new ForbiddenError('You can only cancel your own reminders');
      }

      await prisma.refillReminder.delete({ where: { id: reminderId } });
      return { id: reminderId, cancelled: true };
    } else {
      const idx = inMemoryDb.refillReminders.findIndex((r) => r.id === reminderId);
      if (idx === -1) throw new NotFoundError('Refill reminder not found');

      const existing = inMemoryDb.refillReminders[idx];
      const pres = inMemoryDb.prescriptions.find((p) => p.id === existing.prescriptionId);

      if (callerShopId && pres?.shopId !== callerShopId) {
        throw new ForbiddenError('You can only cancel reminders created by your pharmacy');
      }

      if (callerPatientId && existing.patientId !== callerPatientId) {
        throw new ForbiddenError('You can only cancel your own reminders');
      }

      inMemoryDb.refillReminders.splice(idx, 1);
      return { id: reminderId, cancelled: true };
    }
  }
}

export const refillsService = new RefillsService();
