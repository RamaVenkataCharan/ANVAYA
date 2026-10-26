import { PaymentStatus, LedgerType, CreateBillInput, CreateLedgerEntryInput, Role } from '@anvaya/shared';
import { prisma, isDbConnected } from '../../config/prisma';
import { inMemoryDb, DbBill, DbBillItem, DbLedgerEntry } from '../../db/inMemoryDb';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../utils/errors';
import { recordAuditLog } from '../../middleware/audit';
import crypto from 'crypto';

/**
 * Financial Calculation & Rounding Specification:
 * - Currency: INR (Indian Rupee).
 * - Minor unit: Paise (1 Rupee = 100 Paise).
 * - Rounding rule: Half-Up rounding to nearest integer paise (Math.round(val * 100)).
 * - All intermediate arithmetic (line item totals, subtotal, tax, invoice total, ledger entries)
 *   is strictly computed in integer minor units (paise) to prevent IEEE-754 binary floating point drift.
 * - Client-supplied totals are strictly verified against server calculation. Any deviation
 *   is rejected with 400 Bad Request to prevent price tampering and accounting manipulation.
 */
function toPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

function toRupees(paise: number): number {
  return paise / 100;
}

interface ValidatedBillMath {
  items: Array<{
    medicine: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
}

function calculateAndValidateBillMath(input: CreateBillInput): ValidatedBillMath {
  let subtotalPaise = 0;

  const items = input.items.map((item) => {
    const unitPricePaise = toPaise(item.unitPrice);
    const lineTotalPaise = item.quantity * unitPricePaise;

    if (item.totalPrice !== undefined) {
      const clientLineTotalPaise = toPaise(item.totalPrice);
      if (clientLineTotalPaise !== lineTotalPaise) {
        throw new BadRequestError(
          `Line total mismatch for ${item.medicine}: calculated ${toRupees(lineTotalPaise)} but received ${item.totalPrice}`
        );
      }
    }

    subtotalPaise += lineTotalPaise;

    return {
      medicine: item.medicine,
      quantity: item.quantity,
      unitPrice: toRupees(unitPricePaise),
      totalPrice: toRupees(lineTotalPaise),
    };
  });

  const computedSubtotal = toRupees(subtotalPaise);
  if (input.subtotal !== undefined) {
    const clientSubtotalPaise = toPaise(input.subtotal);
    if (clientSubtotalPaise !== subtotalPaise) {
      throw new BadRequestError(
        `Subtotal mismatch: calculated ${computedSubtotal} but received ${input.subtotal}`
      );
    }
  }

  const taxPaise = input.tax !== undefined ? toPaise(input.tax) : 0;
  const totalPaise = subtotalPaise + taxPaise;
  const computedTotal = toRupees(totalPaise);

  if (input.total !== undefined) {
    const clientTotalPaise = toPaise(input.total);
    if (clientTotalPaise !== totalPaise) {
      throw new BadRequestError(
        `Total mismatch: calculated ${computedTotal} but received ${input.total}`
      );
    }
  }

  return {
    items,
    subtotal: computedSubtotal,
    tax: toRupees(taxPaise),
    total: computedTotal,
  };
}

export class BillingService {
  private generateBillNumber(): string {
    const year = new Date().getFullYear();
    const seq = String(inMemoryDb.bills.length + 1).padStart(4, '0');
    return `INV-${year}-${seq}`;
  }

  /**
   * Creates a digital bill/invoice (Shop only)
   */
  async createBill(shopId: string, input: CreateBillInput, shopUserId?: string) {
    const { items, subtotal, tax, total } = calculateAndValidateBillMath(input);

    if (isDbConnected()) {
      if (input.paymentMethod === 'KHATA_CREDIT' && !input.patientId) {
        throw new BadRequestError('Patient is required for Khata Credit billing');
      }

      if (input.patientId) {
        const patient = await prisma.patient.findUnique({ where: { id: input.patientId } });
        if (!patient) throw new NotFoundError('Patient not found');
      }

      // Validate prescription linkage (outside tx — read-only check)
      if (input.prescriptionId) {
        const prescription = await prisma.prescription.findUnique({ where: { id: input.prescriptionId } });
        if (!prescription) throw new NotFoundError('Linked prescription not found');
        if (prescription.shopId !== shopId) {
          throw new ForbiddenError('Prescription was not dispensed by your shop');
        }
      }

      const billNumber = `INV-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

      // Single atomic transaction: bill + optional khata ledger entry
      const bill = await prisma.$transaction(async (tx) => {
        const created = await tx.bill.create({
          data: {
            billNumber,
            shopId,
            patientId: input.patientId,
            prescriptionId: input.prescriptionId,
            subtotal,
            tax,
            total,
            paymentStatus: input.paymentStatus,
            paymentMethod: input.paymentMethod,
            notes: input.notes,
            items: {
              create: items.map((item) => ({
                medicine: item.medicine,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
              })),
            },
          },
          include: {
            items: true,
            shop: { select: { id: true, shopName: true, licenseNo: true, address: true, phone: true } },
            patient: { include: { user: { select: { id: true, name: true, email: true, phone: true } } } },
          },
        });

        // Auto-create khata credit entry inside the same transaction
        if (input.paymentMethod === 'KHATA_CREDIT' && input.patientId) {
          await tx.ledgerEntry.create({
            data: {
              shopId,
              patientId: input.patientId,
              billId: created.id,
              amount: total,
              type: LedgerType.CREDIT,
              description: `Credit for bill ${billNumber}`,
            },
          });
        }

        return created;
      });

      recordAuditLog({
        userId: shopUserId,
        action: 'BILL_CREATED',
        resource: 'BILL',
        resourceId: bill.id,
        metadata: { billNumber: bill.billNumber, total, patientId: input.patientId },
      });

      return bill;
    } else {
      if (input.paymentMethod === 'KHATA_CREDIT' && !input.patientId) {
        throw new BadRequestError('Patient is required for Khata Credit billing');
      }

      if (input.patientId) {
        const patient = inMemoryDb.patients.find((p) => p.id === input.patientId);
        if (!patient) throw new NotFoundError('Patient not found');
      }

      if (input.prescriptionId) {
        const prescription = inMemoryDb.prescriptions.find((p) => p.id === input.prescriptionId);
        if (!prescription) throw new NotFoundError('Linked prescription not found');
        if (prescription.shopId !== shopId) {
          throw new ForbiddenError('Prescription was not dispensed by your shop');
        }
      }

      const billId = crypto.randomUUID();
      const billNumber = this.generateBillNumber();

      const newBill: DbBill = {
        id: billId,
        billNumber,
        shopId,
        patientId: input.patientId || null,
        prescriptionId: input.prescriptionId || null,
        subtotal,
        tax,
        total,
        paymentStatus: input.paymentStatus,
        paymentMethod: input.paymentMethod,
        notes: input.notes || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      inMemoryDb.bills.unshift(newBill);

      const billItems: DbBillItem[] = items.map((item) => ({
        id: crypto.randomUUID(),
        billId,
        medicine: item.medicine,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      }));
      inMemoryDb.billItems.push(...billItems);

      // Auto-create ledger entry for Khata credit
      if (input.paymentMethod === 'KHATA_CREDIT' && input.patientId) {
        const ledgerEntry: DbLedgerEntry = {
          id: crypto.randomUUID(),
          shopId,
          patientId: input.patientId,
          billId,
          amount: total,
          type: LedgerType.CREDIT,
          description: `Credit for bill ${billNumber}`,
          createdAt: new Date(),
        };
        inMemoryDb.ledgerEntries.unshift(ledgerEntry);
      }

      recordAuditLog({
        userId: shopUserId,
        action: 'BILL_CREATED',
        resource: 'BILL',
        resourceId: billId,
        metadata: { billNumber, total: input.total, patientId: input.patientId },
      });

      return this.formatBill(newBill, billItems);
    }
  }

  /**
   * Returns bills for a shop or patient depending on role
   */
  async getBills(user: { role: Role; shopId?: string; patientId?: string }) {
    if (isDbConnected()) {
      const where: any = {};
      if (user.role === Role.SHOP && user.shopId) {
        where.shopId = user.shopId;
      } else if (user.role === Role.PATIENT && user.patientId) {
        where.patientId = user.patientId;
      }

      return prisma.bill.findMany({
        where,
        include: {
          items: true,
          shop: { select: { id: true, shopName: true, licenseNo: true, address: true, phone: true } },
          patient: { include: { user: { select: { id: true, name: true, email: true, phone: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      let bills = [...inMemoryDb.bills];
      if (user.role === Role.SHOP && user.shopId) {
        bills = bills.filter((b) => b.shopId === user.shopId);
      } else if (user.role === Role.PATIENT && user.patientId) {
        bills = bills.filter((b) => b.patientId === user.patientId);
      }

      return bills
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((b) => {
          const items = inMemoryDb.billItems.filter((i) => i.billId === b.id);
          return this.formatBill(b, items);
        });
    }
  }

  /**
   * Returns a single bill by ID with caller ownership checks
   */
  async getBillById(
    id: string,
    caller?: { role?: Role; shopId?: string; patientId?: string }
  ) {
    if (isDbConnected()) {
      const bill = await prisma.bill.findUnique({
        where: { id },
        include: {
          items: true,
          shop: { select: { id: true, shopName: true, licenseNo: true, address: true, phone: true } },
          patient: { include: { user: { select: { id: true, name: true, email: true, phone: true } } } },
        },
      });
      if (!bill) throw new NotFoundError('Bill not found');

      if (caller) {
        if (caller.role === Role.SHOP && bill.shopId !== caller.shopId) {
          throw new ForbiddenError('You can only view bills issued by your shop');
        }
        if (caller.role === Role.PATIENT && bill.patientId !== caller.patientId) {
          throw new ForbiddenError('You can only view your own bills');
        }
        if (caller.role !== Role.SHOP && caller.role !== Role.PATIENT) {
          throw new ForbiddenError('Access forbidden: Bills can only be viewed by the issuing pharmacy or billed patient');
        }
      }

      return bill;
    } else {
      const bill = inMemoryDb.bills.find((b) => b.id === id);
      if (!bill) throw new NotFoundError('Bill not found');

      if (caller) {
        if (caller.role === Role.SHOP && bill.shopId !== caller.shopId) {
          throw new ForbiddenError('You can only view bills issued by your shop');
        }
        if (caller.role === Role.PATIENT && bill.patientId !== caller.patientId) {
          throw new ForbiddenError('You can only view your own bills');
        }
        if (caller.role !== Role.SHOP && caller.role !== Role.PATIENT) {
          throw new ForbiddenError('Access forbidden: Bills can only be viewed by the issuing pharmacy or billed patient');
        }
      }

      const items = inMemoryDb.billItems.filter((i) => i.billId === id);
      return this.formatBill(bill, items);
    }
  }

  /**
   * Creates a Khata (ledger) entry manually (Shop only)
   */
  async createLedgerEntry(shopId: string, input: CreateLedgerEntryInput, shopUserId?: string) {
    if (isDbConnected()) {
      const patient = await prisma.patient.findUnique({ where: { id: input.patientId } });
      if (!patient) throw new NotFoundError('Patient not found');

      const entry = await prisma.ledgerEntry.create({
        data: {
          shopId,
          patientId: input.patientId,
          amount: input.amount,
          type: input.type,
          description: input.description,
        },
        include: {
          patient: { include: { user: { select: { name: true, phone: true } } } },
        },
      });

      recordAuditLog({
        userId: shopUserId,
        action: 'LEDGER_ENTRY_CREATED',
        resource: 'LEDGER',
        resourceId: entry.id,
        metadata: { type: input.type, amount: input.amount, patientId: input.patientId },
      });

      return entry;
    } else {
      const patient = inMemoryDb.patients.find((p) => p.id === input.patientId);
      if (!patient) throw new NotFoundError('Patient not found');

      const entryId = crypto.randomUUID();
      const newEntry: DbLedgerEntry = {
        id: entryId,
        shopId,
        patientId: input.patientId,
        billId: null,
        amount: input.amount,
        type: input.type,
        description: input.description,
        createdAt: new Date(),
      };

      inMemoryDb.ledgerEntries.unshift(newEntry);

      recordAuditLog({
        userId: shopUserId,
        action: 'LEDGER_ENTRY_CREATED',
        resource: 'LEDGER',
        resourceId: entryId,
        metadata: { type: input.type, amount: input.amount, patientId: input.patientId },
      });

      return this.formatLedgerEntry(newEntry);
    }
  }

  /**
   * Returns all ledger entries for the caller's shop (scoped to a specific patient if patientId query is provided)
   */
  async getLedgerEntries(shopId: string, patientId?: string) {
    if (isDbConnected()) {
      const where: any = { shopId };
      if (patientId) where.patientId = patientId;

      return prisma.ledgerEntry.findMany({
        where,
        include: {
          patient: { include: { user: { select: { name: true, phone: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      let entries = inMemoryDb.ledgerEntries.filter((e) => e.shopId === shopId);
      if (patientId) {
        entries = entries.filter((e) => e.patientId === patientId);
      }
      return entries
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((e) => this.formatLedgerEntry(e));
    }
  }

  /**
   * Returns the outstanding Khata (credit) balance for a patient at a given shop
   */
  async getPatientKhataBalance(shopId: string | undefined, patientId: string) {
    if (isDbConnected()) {
      const patient = await prisma.patient.findUnique({ where: { id: patientId } });
      if (!patient) throw new NotFoundError('Patient not found');

      const where: any = { patientId };
      if (shopId) where.shopId = shopId;

      const entries = await prisma.ledgerEntry.findMany({
        where,
      });

      let totalCredit = 0;
      let totalPayment = 0;
      for (const e of entries) {
        const amount = Number(e.amount);
        if (e.type === LedgerType.CREDIT) totalCredit += amount;
        else totalPayment += amount;
      }
      const balance = totalCredit - totalPayment;

      return { patientId, shopId: shopId || null, balance, totalCredit, totalPayment };
    } else {
      const patient = inMemoryDb.patients.find((p) => p.id === patientId);
      if (!patient) throw new NotFoundError('Patient not found');

      const entries = inMemoryDb.ledgerEntries.filter(
        (e) => (shopId ? e.shopId === shopId : true) && e.patientId === patientId
      );

      let totalCredit = 0;
      let totalPayment = 0;
      for (const e of entries) {
        const amount = Number(e.amount);
        if (e.type === LedgerType.CREDIT) totalCredit += amount;
        else totalPayment += amount;
      }
      const balance = totalCredit - totalPayment;

      return { patientId, shopId: shopId || null, balance, totalCredit, totalPayment };
    }
  }

  private formatBill(b: DbBill, items: DbBillItem[]) {
    const shop = inMemoryDb.shops.find((s) => s.id === b.shopId);
    const patient = b.patientId ? inMemoryDb.patients.find((p) => p.id === b.patientId) : null;
    const patientUser = patient ? inMemoryDb.users.find((u) => u.id === patient.userId) : null;

    return {
      ...b,
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
      items,
      shop: shop
        ? { id: shop.id, shopName: shop.shopName, licenseNo: shop.licenseNo, address: shop.address, phone: shop.phone }
        : null,
      patient: patient
        ? {
            id: patient.id,
            user: patientUser
              ? { id: patientUser.id, name: patientUser.name, email: patientUser.email, phone: patientUser.phone }
              : null,
          }
        : null,
    };
  }

  private formatLedgerEntry(e: DbLedgerEntry) {
    const patient = inMemoryDb.patients.find((p) => p.id === e.patientId);
    const patientUser = patient ? inMemoryDb.users.find((u) => u.id === patient.userId) : null;

    return {
      ...e,
      createdAt: e.createdAt.toISOString(),
      patient: patient
        ? {
            id: patient.id,
            user: patientUser ? { name: patientUser.name, phone: patientUser.phone } : null,
          }
        : null,
    };
  }
}

export const billingService = new BillingService();
