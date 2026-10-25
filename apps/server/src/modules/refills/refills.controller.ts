import { Request, Response, NextFunction } from 'express';
import { refillsService } from './refills.service';
import { AuthRequest } from '../../middleware/auth';
import { Role } from '@anvaya/shared';
import { ForbiddenError } from '../../utils/errors';

export class RefillsController {
  async createReminder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const { shopId, userId } = authReq.user;

      if (!shopId) {
        throw new ForbiddenError('Shop profile not found in authentication context');
      }

      const reminder = await refillsService.createReminder(shopId, req.body, userId);

      res.status(201).json({
        success: true,
        message: 'Refill reminder scheduled successfully',
        data: reminder,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getReminders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const { role, shopId, patientId } = authReq.user;
      const prescriptionId = req.query.prescriptionId as string | undefined;

      const filters: { shopId?: string; patientId?: string; prescriptionId?: string } = {
        prescriptionId,
      };

      if (role === Role.SHOP) {
        filters.shopId = shopId;
      } else if (role === Role.PATIENT) {
        filters.patientId = patientId;
      }

      const reminders = await refillsService.getReminders(filters);

      res.status(200).json({
        success: true,
        data: reminders,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async cancelReminder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const { role, shopId, patientId } = authReq.user;
      const { id } = req.params;

      const callerShopId = role === Role.SHOP ? shopId : undefined;
      const callerPatientId = role === Role.PATIENT ? patientId : undefined;

      const result = await refillsService.cancelReminder(id, callerShopId, callerPatientId);

      res.status(200).json({
        success: true,
        message: 'Refill reminder cancelled successfully',
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const refillsController = new RefillsController();
