import { Request, Response, NextFunction } from 'express';
import { reportService } from './report.service';
import { AuthRequest } from '../../middleware/auth';
import { Role } from '@anvaya/shared';

export class ReportController {
  /**
   * POST /reports
   * Upload a new health report to the digital vault (Patient only)
   */
  async createReport(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const report = await reportService.createReport(patientId, req.body, userId);

      res.status(201).json({
        success: true,
        message: 'Health report uploaded to your digital vault successfully',
        data: report,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /reports
   * List own reports (Patient) or patient's reports with consent (Doctor)
   * Doctor must pass ?patientId= query parameter
   */
  async getReports(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const { role, patientId: tokenPatientId, doctorId, userId } = authReq.user;

      let targetPatientId: string;

      if (role === Role.PATIENT) {
        if (!tokenPatientId) {
          res.status(403).json({
            success: false,
            error: 'ForbiddenError',
            message: 'Patient profile not found in token',
            timestamp: new Date().toISOString(),
          });
          return;
        }
        targetPatientId = tokenPatientId;
      } else {
        // Doctor accessing with consent
        targetPatientId = req.query.patientId as string;
        if (!targetPatientId) {
          res.status(400).json({
            success: false,
            error: 'ValidationError',
            message: 'patientId query parameter is required',
            timestamp: new Date().toISOString(),
          });
          return;
        }
      }

      const reports = await reportService.getReports(targetPatientId, userId, role === Role.DOCTOR ? doctorId : undefined);

      res.status(200).json({
        success: true,
        data: reports,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /reports/:id
   * Get a specific report (Patient: own; Doctor: with consent)
   */
  async getReportById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const { role, patientId, doctorId } = authReq.user;
      const { id } = req.params;

      const report = await reportService.getReportById(
        id,
        role === Role.PATIENT ? patientId : undefined,
        role === Role.DOCTOR ? doctorId : undefined
      );

      res.status(200).json({
        success: true,
        data: report,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /reports/:id
   * Delete a report from the digital vault (Patient only, own reports)
   */
  async deleteReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const { patientId, userId } = authReq.user;
      const { id } = req.params;

      if (!patientId) {
        res.status(403).json({
          success: false,
          error: 'ForbiddenError',
          message: 'Patient profile not found in token',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      await reportService.deleteReport(id, patientId, userId);

      res.status(200).json({
        success: true,
        message: 'Report deleted from your digital vault',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const reportController = new ReportController();
