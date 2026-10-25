import { Request, Response, NextFunction } from 'express';
import { appointmentService } from './appointment.service';
import { AuthRequest } from '../../middleware/auth';

export class AppointmentController {
  /**
   * POST /appointments
   * Book a new appointment (Patient only)
   */
  async createAppointment(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const appointment = await appointmentService.createAppointment(patientId, req.body, userId);

      res.status(201).json({
        success: true,
        message: 'Appointment booked successfully',
        data: appointment,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /appointments
   * List appointments scoped to caller role
   */
  async getAppointments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const { role, doctorId, patientId } = authReq.user;

      const appointments = await appointmentService.getAppointments({ role, doctorId, patientId });

      res.status(200).json({
        success: true,
        data: appointments,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /appointments/:id
   * Get a specific appointment by ID
   */
  async getAppointmentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const appointment = await appointmentService.getAppointmentById(id);

      res.status(200).json({
        success: true,
        data: appointment,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /appointments/:id/status
   * Update appointment status (Doctor: CONFIRMED/COMPLETED/CANCELLED; Patient: CANCELLED)
   */
  async updateAppointmentStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const { role, doctorId, patientId, userId } = authReq.user;
      const { id } = req.params;

      const updated = await appointmentService.updateAppointmentStatus(
        id,
        req.body,
        role,
        doctorId,
        patientId,
        userId
      );

      res.status(200).json({
        success: true,
        message: 'Appointment status updated successfully',
        data: updated,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const appointmentController = new AppointmentController();
