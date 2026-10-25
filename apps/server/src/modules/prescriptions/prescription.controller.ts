import { Request, Response, NextFunction } from 'express';
import { prescriptionService } from './prescription.service';
import { AuthRequest } from '../../middleware/auth';
import { Role } from '@anvaya/shared';

export class PrescriptionController {
  /**
   * POST /prescriptions
   * Creates an e-prescription (Doctor only)
   */
  async createPrescription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const { doctorId, userId } = authReq.user;

      if (!doctorId) {
        res.status(403).json({
          success: false,
          error: 'ForbiddenError',
          message: 'Doctor profile not found in token',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const prescription = await prescriptionService.createPrescription(doctorId, req.body, userId);

      res.status(201).json({
        success: true,
        message: 'Prescription issued successfully',
        data: prescription,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /prescriptions
   * Returns prescriptions scoped by caller role (Doctor sees theirs, Patient sees theirs)
   */
  async getPrescriptions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const { role, doctorId, patientId, shopId } = authReq.user;

      const prescriptions = await prescriptionService.getPrescriptions({ role, doctorId, patientId, shopId });

      res.status(200).json({
        success: true,
        data: prescriptions,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /prescriptions/:id
   * Returns a single prescription by ID
   */
  async getPrescriptionById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const prescription = await prescriptionService.getPrescriptionById(id);

      res.status(200).json({
        success: true,
        data: prescription,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /prescriptions/verify
   * Verifies a prescription via QR token or human-readable code (Shop only)
   */
  async verifyPrescription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { codeOrToken } = req.body;

      if (!codeOrToken || typeof codeOrToken !== 'string') {
        res.status(400).json({
          success: false,
          error: 'ValidationError',
          message: 'codeOrToken is required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const authReq = req as AuthRequest;
      const { userId, shopId } = authReq.user;
      const result = await prescriptionService.verifyPrescription(codeOrToken, userId, shopId);

      res.status(200).json({
        success: true,
        message: result.isValid ? 'Prescription is valid and ready for dispensing' : `Prescription status: ${result.status}`,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /prescriptions/dispense
   * Dispenses a prescription (Shop only) — irreversibly locks status to DISPENSED
   */
  async dispensePrescription(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const dispensed = await prescriptionService.dispensePrescription(shopId, req.body, userId);

      res.status(200).json({
        success: true,
        message: 'Prescription dispensed successfully. Status locked to DISPENSED.',
        data: dispensed,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /prescriptions/:id/cancel
   * Cancels an issued prescription (Doctor only, own prescriptions only)
   */
  async cancelPrescription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const { doctorId, userId } = authReq.user;
      const { id } = req.params;

      if (!doctorId) {
        res.status(403).json({
          success: false,
          error: 'ForbiddenError',
          message: 'Doctor profile not found in token',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const cancelled = await prescriptionService.cancelPrescription(id, doctorId, userId);

      res.status(200).json({
        success: true,
        message: 'Prescription cancelled successfully',
        data: cancelled,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const prescriptionController = new PrescriptionController();
