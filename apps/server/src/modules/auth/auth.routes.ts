import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authController } from './auth.controller';
import { validateBody } from '../../middleware/validate';
import { authenticateJwt } from '../../middleware/auth';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordRequestSchema,
  forgotPasswordVerifySchema,
  changePasswordSchema,
  resubmitVerificationSchema,
} from '@anvaya/shared';

const router = Router();

// Rate limiter for password reset requests (5 requests per 15 minutes per IP & identifier)
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => {
    const id = req.body?.identifier || '';
    return `${req.ip}_${String(id).toLowerCase().trim()}`;
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'TooManyRequests',
    message: 'Too many password reset requests. Please try again in 15 minutes.',
    timestamp: new Date().toISOString(),
  },
});

router.post('/register', validateBody(registerSchema), (req, res, next) =>
  authController.register(req, res, next)
);

router.post('/login', validateBody(loginSchema), (req, res, next) =>
  authController.login(req, res, next)
);

router.post('/refresh', validateBody(refreshTokenSchema), (req, res, next) =>
  authController.refreshToken(req, res, next)
);

router.post('/logout', (req, res, next) =>
  authController.logout(req, res, next)
);

router.get('/me', authenticateJwt, (req, res, next) =>
  authController.getMe(req, res, next)
);

router.post(
  '/forgot-password/request',
  forgotPasswordLimiter,
  validateBody(forgotPasswordRequestSchema),
  (req, res, next) => authController.forgotPasswordRequest(req, res, next)
);

router.post(
  '/forgot-password/verify',
  validateBody(forgotPasswordVerifySchema),
  (req, res, next) => authController.forgotPasswordVerify(req, res, next)
);

router.post(
  '/change-password',
  authenticateJwt,
  validateBody(changePasswordSchema),
  (req, res, next) => authController.changePassword(req, res, next)
);

router.post(
  '/logout-all',
  authenticateJwt,
  (req, res, next) => authController.logoutAll(req, res, next)
);

const resubmitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => (req as any).user?.userId || req.ip || 'anonymous',
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'TooManyRequests',
    message: 'Too many verification resubmissions. Please wait an hour.',
    timestamp: new Date().toISOString(),
  },
});

router.post(
  '/resubmit-verification',
  authenticateJwt,
  resubmitLimiter,
  validateBody(resubmitVerificationSchema),
  (req, res, next) => authController.resubmitVerification(req, res, next)
);

export const authRoutes = router;
