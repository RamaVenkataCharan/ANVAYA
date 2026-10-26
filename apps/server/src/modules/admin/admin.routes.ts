import { Router } from 'express';
import { adminController } from './admin.controller';
import { authenticateJwt } from '../../middleware/auth';
import { requireRole } from '../../middleware/roleGuard';
import { validateBody } from '../../middleware/validate';
import { verifyEntitySchema, Role } from '@anvaya/shared';

const router = Router();

// Protect all admin endpoints: must be authenticated and have ADMIN role
router.use(authenticateJwt, requireRole(Role.ADMIN));

router.get('/pending-verifications', (req, res, next) =>
  adminController.getPendingVerifications(req, res, next)
);

router.post('/verify/doctor/:id', validateBody(verifyEntitySchema), (req, res, next) =>
  adminController.verifyDoctor(req, res, next)
);

router.post('/verify/shop/:id', validateBody(verifyEntitySchema), (req, res, next) =>
  adminController.verifyShop(req, res, next)
);

router.get('/stats', (req, res, next) =>
  adminController.getStats(req, res, next)
);

// Audit logs: supports both /audit and /audit-logs
router.get('/audit', (req, res, next) =>
  adminController.getAuditLogs(req, res, next)
);

router.get('/audit-logs', (req, res, next) =>
  adminController.getAuditLogs(req, res, next)
);

// Users management
router.get('/users', (req, res, next) =>
  adminController.getUsers(req, res, next)
);

router.patch('/users/:id/status', (req, res, next) =>
  adminController.updateUserStatus(req, res, next)
);

router.post('/users/:id/suspend', (req, res, next) =>
  adminController.suspendUser(req, res, next)
);

router.post('/users/:id/reactivate', (req, res, next) =>
  adminController.reactivateUser(req, res, next)
);

// Verification history
router.get('/verifications/history', (req, res, next) =>
  adminController.getVerificationHistory(req, res, next)
);

export const adminRoutes = router;

