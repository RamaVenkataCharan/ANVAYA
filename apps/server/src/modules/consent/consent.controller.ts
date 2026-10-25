import { Request, Response, NextFunction } from 'express';
import { consentService } from './consent.service';
import { AuthRequest } from '../../middleware/auth';
import { Role } from '@anvaya/shared';

export class ConsentController {
  /**
   * POST /consent/grant
   * Grant clinical access to a doctor (Patient only)
   */
  async grantConsent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const { patientId, userId } = authReq.user;

      if (!patientId) {
        res.status(403).json({
          success: false,
          error: 'ForbiddenError',
          message: 'Patient profile not found in token',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const consent = await consentService.grantConsent(patientId, req.body, userId);

      res.status(201).json({
        success: true,
        message: 'Consent granted successfully. The doctor now has access to your health records.',
        data: consent,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /consent/revoke
   * Revoke clinical access from a doctor (Patient only)
   */
  async revokeConsent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const { patientId, userId } = authReq.user;

      if (!patientId) {
        res.status(403).json({
          success: false,
          error: 'ForbiddenError',
          message: 'Patient profile not found in token',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const consent = await consentService.revokeConsent(patientId, req.body, userId);

      res.status(200).json({
        success: true,
        message: 'Consent revoked. The doctor can no longer access your health records.',
        data: consent,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /consent/my
   * List all consent records for the calling patient (active and historical)
   */
  async getMyConsents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const { patientId } = authReq.user;

      if (!patientId) {
        res.status(403).json({
          success: false,
          error: 'ForbiddenError',
          message: 'Patient profile not found in token',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const consents = await consentService.getMyConsents(patientId);

      res.status(200).json({
        success: true,
        data: consents,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /consent/patients
   * List patients who have granted consent to the calling doctor
   */
  async getPatientsWithConsent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const { doctorId } = authReq.user;

      if (!doctorId) {
        res.status(403).json({
          success: false,
          error: 'ForbiddenError',
          message: 'Doctor profile not found in token',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const patients = await consentService.getPatientsWithConsent(doctorId);

      res.status(200).json({
        success: true,
        data: patients,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const consentController = new ConsentController();
