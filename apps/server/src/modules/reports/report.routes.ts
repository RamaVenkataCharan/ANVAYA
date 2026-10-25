import { Router } from 'express';
import { reportController } from './report.controller';
import { authenticateJwt } from '../../middleware/auth';
import { requireRole } from '../../middleware/roleGuard';
import { validateBody } from '../../middleware/validate';
import { createReportSchema } from '@anvaya/shared';
import { Role } from '@anvaya/shared';

const router = Router();

// All report routes require authentication
router.use(authenticateJwt);

/**
 * POST /reports
 * Upload a health report to the digital vault (Patient only)
 */
router.post(
  '/',
  requireRole(Role.PATIENT),
  validateBody(createReportSchema),
  (req, res, next) => reportController.createReport(req, res, next)
);

/**
 * GET /reports
 * List health reports:
 *   - Patient: their own vault
 *   - Doctor: patient's reports with active consent (requires ?patientId= query)
 */
router.get(
  '/',
  requireRole(Role.PATIENT, Role.DOCTOR),
  (req, res, next) => reportController.getReports(req, res, next)
);

/**
 * GET /reports/:id
 * Get a specific report (Patient: own; Doctor: with consent; Admin: any)
 */
router.get(
  '/:id',
  requireRole(Role.PATIENT, Role.DOCTOR, Role.ADMIN),
  (req, res, next) => reportController.getReportById(req, res, next)
);

/**
 * DELETE /reports/:id
 * Delete a report from the digital vault (Patient only)
 */
router.delete(
  '/:id',
  requireRole(Role.PATIENT),
  (req, res, next) => reportController.deleteReport(req, res, next)
);

export const reportRoutes = router;
