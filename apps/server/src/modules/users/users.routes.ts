import { Router } from 'express';
import { usersController } from './users.controller';
import { authenticateJwt } from '../../middleware/auth';

const router = Router();

// Directory endpoints: accessible by authenticated users
router.use(authenticateJwt);

router.get('/shops', (req, res, next) =>
  usersController.getShops(req, res, next)
);

router.get('/shops/:id', (req, res, next) =>
  usersController.getShopById(req, res, next)
);

router.get('/doctors', (req, res, next) =>
  usersController.getDoctors(req, res, next)
);

export const usersRoutes = router;
