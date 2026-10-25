import { Request, Response, NextFunction } from 'express';
import { adminService } from './admin.service';
import { VerificationStatus } from '@anvaya/shared';

export class AdminController {
  async getPendingVerifications(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await adminService.getPendingVerifications();
      res.status(200).json({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async verifyDoctor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;
      const adminUserId = req.user?.userId;

      const result = await adminService.verifyDoctor(
        id,
        status as VerificationStatus.APPROVED | VerificationStatus.REJECTED,
        reason,
        adminUserId
      );

      res.status(200).json({
        success: true,
        message: `Doctor status updated to ${status}`,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async verifyShop(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;
      const adminUserId = req.user?.userId;

      const result = await adminService.verifyShop(
        id,
        status as VerificationStatus.APPROVED | VerificationStatus.REJECTED,
        reason,
        adminUserId
      );

      res.status(200).json({
        success: true,
        message: `Shop status updated to ${status}`,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await adminService.getSystemStats();
      res.status(200).json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const logs = await adminService.getAuditLogs(limit);
      res.status(200).json({
        success: true,
        data: logs,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const adminController = new AdminController();
