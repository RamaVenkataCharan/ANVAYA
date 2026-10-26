import { Router } from 'express';
import { billingController } from './billing.controller';
import { authenticateJwt } from '../../middleware/auth';
import { requireRole } from '../../middleware/roleGuard';
import { requireVerified } from '../../middleware/verificationGuard';
import { validateBody } from '../../middleware/validate';
import { createBillSchema, createLedgerEntrySchema } from '@anvaya/shared';
import { Role } from '@anvaya/shared';

const router = Router();

// All billing routes require authentication
router.use(authenticateJwt);

// ─── Bills ───────────────────────────────────────────────────────────────────

/**
 * POST /billing/bills
 * Create a digital bill/invoice (Shop only, must be APPROVED)
 */
router.post(
  '/bills',
  requireRole(Role.SHOP),
  requireVerified,
  validateBody(createBillSchema),
  (req, res, next) => billingController.createBill(req, res, next)
);

/**
 * GET /billing/bills
 * List bills (Shop sees own bills; Patient sees own receipts)
 */
router.get(
  '/bills',
  requireRole(Role.SHOP, Role.PATIENT),
  (req, res, next) => billingController.getBills(req, res, next)
);

/**
 * GET /billing/bills/:id
 * Get specific bill by ID
 */
router.get(
  '/bills/:id',
  requireRole(Role.SHOP, Role.PATIENT),
  (req, res, next) => billingController.getBillById(req, res, next)
);

// ─── Khata / Ledger ───────────────────────────────────────────────────────────

/**
 * POST /billing/ledger
 * Manually create a Khata ledger entry (Shop only)
 */
router.post(
  '/ledger',
  requireRole(Role.SHOP),
  requireVerified,
  validateBody(createLedgerEntrySchema),
  (req, res, next) => billingController.createLedgerEntry(req, res, next)
);

/**
 * GET /billing/ledger
 * List all ledger entries for the shop (optional ?patientId= filter)
 */
router.get(
  '/ledger',
  requireRole(Role.SHOP),
  (req, res, next) => billingController.getLedgerEntries(req, res, next)
);

/**
 * GET /billing/ledger/balance/:patientId
 * Get outstanding Khata balance for a patient at the caller's shop
 */
router.get(
  '/ledger/balance/:patientId',
  requireRole(Role.SHOP, Role.PATIENT),
  (req, res, next) => billingController.getPatientKhataBalance(req, res, next)
);

export const billingRoutes = router;
