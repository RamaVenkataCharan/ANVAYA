import { Router } from 'express';
import { appointmentController } from './appointment.controller';
import { authenticateJwt } from '../../middleware/auth';
import { requireRole } from '../../middleware/roleGuard';
import { validateBody } from '../../middleware/validate';
import { createAppointmentSchema, updateAppointmentStatusSchema } from '@anvaya/shared';
import { Role } from '@anvaya/shared';

const router = Router();

// All appointment routes require authentication
router.use(authenticateJwt);

/**
 * POST /appointments
 * Book a new appointment (Patient only)
 */
router.post(
  '/',
  requireRole(Role.PATIENT),
  validateBody(createAppointmentSchema),
  (req, res, next) => appointmentController.createAppointment(req, res, next)
);

/**
 * GET /appointments
 * List appointments scoped by caller role
 */
router.get(
  '/',
  requireRole(Role.DOCTOR, Role.PATIENT),
  (req, res, next) => appointmentController.getAppointments(req, res, next)
);

/**
 * GET /appointments/:id
 * Get specific appointment by ID
 */
router.get(
  '/:id',
  requireRole(Role.DOCTOR, Role.PATIENT, Role.ADMIN),
  (req, res, next) => appointmentController.getAppointmentById(req, res, next)
);

/**
 * PATCH /appointments/:id/status
 * Update appointment status (Doctor: CONFIRMED/COMPLETED/CANCELLED; Patient: CANCELLED only)
 */
router.patch(
  '/:id/status',
  requireRole(Role.DOCTOR, Role.PATIENT),
  validateBody(updateAppointmentStatusSchema),
  (req, res, next) => appointmentController.updateAppointmentStatus(req, res, next)
);

export const appointmentRoutes = router;
