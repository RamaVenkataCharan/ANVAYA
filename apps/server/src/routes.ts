import { Router } from 'express';
import { authRoutes } from './modules/auth/auth.routes';
import { adminRoutes } from './modules/admin/admin.routes';
import { usersRoutes } from './modules/users/users.routes';
import { prisma } from './config/prisma';

const router = Router();

// Health Check
router.get('/health', async (_req, res) => {
  let dbStatus = 'disconnected';
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch (error) {
    dbStatus = 'error';
  }

  res.status(200).json({
    status: 'ok',
    service: 'ANVAYA API Gateway',
    timestamp: new Date().toISOString(),
    database: dbStatus,
    uptime: process.uptime(),
  });
});

// Mount Feature Modules
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/directory', usersRoutes);
router.use('/', usersRoutes); // mounts /shops, /doctors directly under api prefix as per spec

export const apiRouter = router;
