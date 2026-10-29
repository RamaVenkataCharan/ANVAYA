import { Router } from 'express';
import { authController } from './auth.controller';
import { validateBody } from '../../middleware/validate';
import { authenticateJwt } from '../../middleware/auth';
import { registerSchema, loginSchema, refreshTokenSchema, forgotPasswordRequestSchema, forgotPasswordVerifySchema, changePasswordSchema, resubmitVerificationSchema } from '@anvaya/shared';

const router = Router();

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


router.post('/forgot-password/request', validateBody(forgotPasswordRequestSchema), (req, res, next) =>
  authController.forgotPasswordRequest(req, res, next)
);

router.post('/forgot-password/verify', validateBody(forgotPasswordVerifySchema), (req, res, next) =>
  authController.forgotPasswordVerify(req, res, next)
);

router.post('/change-password', authenticateJwt, validateBody(changePasswordSchema), (req, res, next) =>
  authController.changePassword(req, res, next)
);

router.post('/logout-all', authenticateJwt, (req, res, next) =>
  authController.logoutAll(req, res, next)
);

router.post('/resubmit-verification', authenticateJwt, validateBody(resubmitVerificationSchema), (req, res, next) =>
  authController.resubmitVerification(req, res, next)
);

export const authRoutes = router;
