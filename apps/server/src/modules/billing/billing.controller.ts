import { Request, Response, NextFunction } from 'express';
import { billingService } from './billing.service';
import { AuthRequest } from '../../middleware/auth';

export class BillingController {
  /**
   * POST /billing/bills
   * Create a digital bill (Shop only)
   */
  async createBill(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const { shopId, userId } = authReq.user;

      if (!shopId) {
        res.status(403).json({
          success: false,
          error: 'ForbiddenError',
          message: 'Shop profile not found in token',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const bill = await billingService.createBill(shopId, req.body, userId);

      res.status(201).json({
        success: true,
        message: 'Bill created successfully',
        data: bill,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /billing/bills
   * List bills scoped to shop or patient
   */
  async getBills(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const { role, shopId, patientId } = authReq.user;

      const bills = await billingService.getBills({ role, shopId, patientId });

      res.status(200).json({
        success: true,
        data: bills,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /billing/bills/:id
   * Get a specific bill by ID
   */
  async getBillById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const bill = await billingService.getBillById(id);

      res.status(200).json({
        success: true,
        data: bill,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /billing/ledger
   * Create a manual Khata ledger entry (Shop only)
   */
  async createLedgerEntry(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const { shopId, userId } = authReq.user;

      if (!shopId) {
        res.status(403).json({
          success: false,
          error: 'ForbiddenError',
          message: 'Shop profile not found in token',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const entry = await billingService.createLedgerEntry(shopId, req.body, userId);

      res.status(201).json({
        success: true,
        message: 'Ledger entry recorded successfully',
        data: entry,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /billing/ledger
   * List Khata entries for the shop (optional ?patientId= filter)
   */
  async getLedgerEntries(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const { shopId } = authReq.user;

      if (!shopId) {
        res.status(403).json({
          success: false,
          error: 'ForbiddenError',
          message: 'Shop profile not found in token',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const patientId = req.query.patientId as string | undefined;
      const entries = await billingService.getLedgerEntries(shopId, patientId);

      res.status(200).json({
        success: true,
        data: entries,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /billing/ledger/balance/:patientId
   * Get outstanding Khata balance for a specific patient at the caller's shop
   */
  async getPatientKhataBalance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const { shopId } = authReq.user;
      const { patientId } = req.params;

      if (!shopId) {
        res.status(403).json({
          success: false,
          error: 'ForbiddenError',
          message: 'Shop profile not found in token',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const balance = await billingService.getPatientKhataBalance(shopId, patientId);

      res.status(200).json({
        success: true,
        data: balance,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const billingController = new BillingController();
