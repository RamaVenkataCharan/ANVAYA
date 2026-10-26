import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { prescriptionController } from './prescription.controller';
import { authenticateJwt } from '../../middleware/auth';
import { requireRole } from '../../middleware/roleGuard';
import { requireVerified } from '../../middleware/verificationGuard';
import { validateBody } from '../../middleware/validate';
import { createPrescriptionSchema, dispensePrescriptionSchema } from '@anvaya/shared';
import { Role } from '@anvaya/shared';

const router = Router();

// Tight rate limiter for the fraud-sensitive QR verify endpoint:
// 30 scan attempts per 10 minutes per IP prevents enumeration attacks.
const verifyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  keyGenerator: (req) => {
    // Key by authenticated userId when available, fall back to IP
    return (req.user?.userId ?? req.ip) as string;
  },
  message: {
    success: false,
    error: 'TooManyRequests',
    message: 'Too many verification attempts. Please wait 10 minutes before retrying.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// All prescription routes require authentication
router.use(authenticateJwt);

/**
 * POST /prescriptions
 * Issue a new e-prescription (Doctor only, must be APPROVED)
 */
router.post(
  '/',
  requireRole(Role.DOCTOR),
  requireVerified,
  validateBody(createPrescriptionSchema),
  (req, res, next) => prescriptionController.createPrescription(req, res, next)
);

/**
 * GET /prescriptions
 * List prescriptions scoped by caller role (Doctor: own issued; Patient: own wallet; Shop: all dispensed by shop)
 */
router.get(
  '/',
  requireRole(Role.DOCTOR, Role.PATIENT, Role.SHOP),
  (req, res, next) => prescriptionController.getPrescriptions(req, res, next)
);

/**
 * POST /prescriptions/verify
 * Verify a prescription via QR token or code (Shop only, must be APPROVED)
 * Note: placed before /:id to avoid route conflict
 */
router.post(
  '/verify',
  requireRole(Role.SHOP),
  requireVerified,
  verifyLimiter,
  (req, res, next) => prescriptionController.verifyPrescription(req, res, next)
);

/**
 * POST /prescriptions/dispense
 * Dispense a prescription and lock it to DISPENSED (Shop only, must be APPROVED)
 */
router.post(
  '/dispense',
  requireRole(Role.SHOP),
  requireVerified,
  validateBody(dispensePrescriptionSchema),
  (req, res, next) => prescriptionController.dispensePrescription(req, res, next)
);

/**
 * GET /prescriptions/:id
 * Get a specific prescription by ID
 */
router.get(
  '/:id',
  requireRole(Role.DOCTOR, Role.PATIENT),
  (req, res, next) => prescriptionController.getPrescriptionById(req, res, next)
);

/**
 * PATCH /prescriptions/:id/cancel
 * Cancel an issued prescription (Doctor only, own prescriptions)
 */
router.patch(
  '/:id/cancel',
  requireRole(Role.DOCTOR),
  requireVerified,
  (req, res, next) => prescriptionController.cancelPrescription(req, res, next)
);

export const prescriptionRoutes = router;
