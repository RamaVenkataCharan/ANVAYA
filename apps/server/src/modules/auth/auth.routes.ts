import { Router } from 'express';
import { authController } from './auth.controller';
import { validateBody } from '../../middleware/validate';
import { authenticateJwt } from '../../middleware/auth';
import { registerSchema, loginSchema, refreshTokenSchema } from '@anvaya/shared';

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

export const authRoutes = router;
