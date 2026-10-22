import { Request, Response, NextFunction } from 'express';
import { usersService } from './users.service';

export class UsersController {
  async getShops(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const search = req.query.search as string | undefined;
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
      const specialization = req.query.specialization as string | undefined;
      const doctors = await usersService.getVerifiedDoctors(specialization);

      res.status(200).json({
        success: true,
        data: doctors,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const usersController = new UsersController();
