import { Request, Response, NextFunction } from 'express';
import { usersService } from './users.service';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../../utils/errors';
import { recordAuditLog } from '../../middleware/audit';

export class UsersController {
  async getShops(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const search = (req.query.q || req.query.search) as string | undefined;
      const shops = await usersService.getVerifiedShops(search);

      res.status(200).json({
        success: true,
        data: shops,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getShopById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const shop = await usersService.getShopById(id);

      res.status(200).json({
        success: true,
        data: shop,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getDoctors(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const search = (req.query.q || req.query.search || req.query.specialization) as string | undefined;
      const doctors = await usersService.getVerifiedDoctors(search);

      res.status(200).json({
        success: true,
        data: doctors,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getDoctorById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const doctor = await usersService.getDoctorById(id);

      res.status(200).json({
        success: true,
        data: doctor,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async searchPatients(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query.q as string | undefined;
      const patients = await usersService.searchPatients(query);

      res.status(200).json({
        success: true,
        data: patients,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async lookupPatient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const phone = req.query.phone as string | undefined;
      if (!phone || !phone.trim()) {
        throw new BadRequestError('Phone number query parameter (?phone=) is required');
      }

      const cleanPhone = phone.trim();
      const patient = await usersService.lookupPatientByPhone(cleanPhone);

      // Record audit log for all lookups (found or not)
      recordAuditLog({
        userId: req.user?.userId,
        action: 'PATIENT_LOOKUP',
        resource: 'PATIENT',
        resourceId: patient?.id || 'NOT_FOUND',
        ipAddress: req.ip,
        metadata: { phone: cleanPhone, found: !!patient },
      });

      // Indistinguishable response status (HTTP 200) to prevent phone enumeration
      res.status(200).json({
        success: true,
        data: patient || null,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async savePushToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new UnauthorizedError('User authentication required');
      }

      const token = (req.body.token || req.body.pushToken) as string;
      const result = await usersService.savePushToken(userId, token);

      res.status(200).json({
        success: true,
        message: 'Push token registered successfully',
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const usersController = new UsersController();
