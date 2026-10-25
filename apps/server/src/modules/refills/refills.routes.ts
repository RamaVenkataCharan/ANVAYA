import { Router } from 'express';
import { refillsController } from './refills.controller';
import { authenticateJwt } from '../../middleware/auth';
import { requireRole } from '../../middleware/roleGuard';
import { requireVerified } from '../../middleware/verificationGuard';
import { validateBody } from '../../middleware/validate';
import { createRefillReminderSchema } from '@anvaya/shared';
import { Role } from '@anvaya/shared';

const router = Router();

router.use(authenticateJwt);

/**
 * POST /refills
 * Create a refill reminder for a dispensed prescription (Shop only, must be APPROVED)
 */
router.post(
  '/',
  requireRole(Role.SHOP),
  requireVerified,
  validateBody(createRefillReminderSchema),
  (req, res, next) => refillsController.createReminder(req, res, next)
);

/**
 * GET /refills
 * List refill reminders (Shop sees shop's reminders; Patient sees their own reminders)
 */
router.get(
  '/',
  requireRole(Role.SHOP, Role.PATIENT),
  (req, res, next) => refillsController.getReminders(req, res, next)
);

/**
 * DELETE /refills/:id
 * Cancel / remove a pending refill reminder
 */
router.delete(
  '/:id',
  requireRole(Role.SHOP, Role.PATIENT),
  (req, res, next) => refillsController.cancelReminder(req, res, next)
);

export const refillRoutes = router;
