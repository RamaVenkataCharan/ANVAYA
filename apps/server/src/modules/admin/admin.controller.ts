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
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const action = req.query.action as string | undefined;
      const resource = req.query.resource as string | undefined;
      const fromDate = (req.query.fromDate || req.query.startDate) as string | undefined;
      const toDate = (req.query.toDate || req.query.endDate) as string | undefined;

      const result = await adminService.getAuditLogs({
        limit,
        page,
        action,
        resource,
        fromDate,
        toDate,
      });

      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const search = req.query.search as string | undefined;
      const role = req.query.role as string | undefined;
      const status = req.query.status as string | undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      const result = await adminService.getUsers({
        search,
        role,
        status,
        page,
        limit,
      });

      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async updateUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { isActive, reason } = req.body;
      const adminUserId = req.user?.userId;

      const result = await adminService.updateUserStatus(id, Boolean(isActive), reason, adminUserId);

      res.status(200).json({
        success: true,
        message: `User status updated to ${isActive ? 'active' : 'suspended'}`,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async suspendUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const adminUserId = req.user?.userId;

      const result = await adminService.updateUserStatus(id, false, reason, adminUserId);

      res.status(200).json({
        success: true,
        message: 'User account suspended',
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async reactivateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const adminUserId = req.user?.userId;

      const result = await adminService.updateUserStatus(id, true, reason, adminUserId);

      res.status(200).json({
        success: true,
        message: 'User account reactivated',
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getVerificationHistory(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await adminService.getVerificationHistory();

      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const adminController = new AdminController();
