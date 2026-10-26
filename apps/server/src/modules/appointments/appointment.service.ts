import { AppointmentStatus, CreateAppointmentInput, UpdateAppointmentStatusInput, Role } from '@anvaya/shared';
import { prisma, isDbConnected } from '../../config/prisma';
import { inMemoryDb, DbAppointment } from '../../db/inMemoryDb';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../utils/errors';
import { recordAuditLog } from '../../middleware/audit';
import crypto from 'crypto';

export class AppointmentService {
  /**
   * Books a new appointment for a patient with a verified doctor
   */
  async createAppointment(patientId: string, input: CreateAppointmentInput, patientUserId?: string) {
    const apptDate = new Date(input.dateTime);
    if (isNaN(apptDate.getTime()) || apptDate.getTime() <= Date.now()) {
      throw new BadRequestError('Appointment date and time must be in the future');
    }

    if (isDbConnected()) {
      // Verify the doctor exists and is approved
      const doctor = await prisma.doctor.findUnique({ where: { id: input.doctorId } });
      if (!doctor) throw new NotFoundError('Doctor not found');

      const appointment = await prisma.appointment.create({
        data: {
          doctorId: input.doctorId,
          patientId,
          dateTime: new Date(input.dateTime),
          status: AppointmentStatus.SCHEDULED,
          reason: input.reason,
          notes: input.notes,
        },
        include: {
          doctor: {
            include: { user: { select: { name: true, email: true, phone: true } } },
          },
          patient: {
            include: { user: { select: { name: true, email: true, phone: true } } },
          },
        },
      });

      recordAuditLog({
        userId: patientUserId,
        action: 'APPOINTMENT_BOOKED',
        resource: 'APPOINTMENT',
        resourceId: appointment.id,
        metadata: { doctorId: input.doctorId, dateTime: input.dateTime },
      });

      return appointment;
    } else {
      const doctor = inMemoryDb.doctors.find((d) => d.id === input.doctorId);
      if (!doctor) throw new NotFoundError('Doctor not found');

      const apptId = crypto.randomUUID();
      const newAppt: DbAppointment = {
        id: apptId,
        doctorId: input.doctorId,
        patientId,
        dateTime: new Date(input.dateTime),
        status: AppointmentStatus.SCHEDULED,
        reason: input.reason,
        notes: input.notes || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      inMemoryDb.appointments.unshift(newAppt);

      recordAuditLog({
        userId: patientUserId,
        action: 'APPOINTMENT_BOOKED',
        resource: 'APPOINTMENT',
        resourceId: apptId,
        metadata: { doctorId: input.doctorId, dateTime: input.dateTime },
      });

      return this.formatAppointment(newAppt);
    }
  }

  /**
   * Returns appointments scoped by caller role
   */
  async getAppointments(user: { role: Role; doctorId?: string; patientId?: string }) {
    if (isDbConnected()) {
      const where: any = {};
      if (user.role === Role.DOCTOR && user.doctorId) {
        where.doctorId = user.doctorId;
      } else if (user.role === Role.PATIENT && user.patientId) {
        where.patientId = user.patientId;
      }

      return prisma.appointment.findMany({
        where,
        include: {
          doctor: {
            include: { user: { select: { id: true, name: true, email: true, phone: true } } },
          },
          patient: {
            include: { user: { select: { id: true, name: true, email: true, phone: true } } },
          },
        },
        orderBy: { dateTime: 'desc' },
      });
    } else {
      let appts = [...inMemoryDb.appointments];

      if (user.role === Role.DOCTOR && user.doctorId) {
        appts = appts.filter((a) => a.doctorId === user.doctorId);
      } else if (user.role === Role.PATIENT && user.patientId) {
        appts = appts.filter((a) => a.patientId === user.patientId);
      }

      return appts
        .sort((a, b) => b.dateTime.getTime() - a.dateTime.getTime())
        .map((a) => this.formatAppointment(a));
    }
  }

  /**
   * Returns a single appointment by ID with caller ownership enforcement
   */
  async getAppointmentById(
    id: string,
    caller?: { role?: Role; doctorId?: string; patientId?: string }
  ) {
    if (isDbConnected()) {
      const appt = await prisma.appointment.findUnique({
        where: { id },
        include: {
          doctor: {
            include: { user: { select: { id: true, name: true, email: true, phone: true } } },
          },
          patient: {
            include: { user: { select: { id: true, name: true, email: true, phone: true } } },
          },
        },
      });

      if (!appt) throw new NotFoundError('Appointment not found');

      if (caller) {
        if (caller.role === Role.DOCTOR && appt.doctorId !== caller.doctorId) {
          throw new ForbiddenError('You can only view your own appointments');
        }
        if (caller.role === Role.PATIENT && appt.patientId !== caller.patientId) {
          throw new ForbiddenError('You can only view your own appointments');
        }
        if (caller.role !== Role.DOCTOR && caller.role !== Role.PATIENT) {
          throw new ForbiddenError('Access forbidden: Appointments can only be viewed by the patient or doctor');
        }
      }

      return appt;
    } else {
      const appt = inMemoryDb.appointments.find((a) => a.id === id);
      if (!appt) throw new NotFoundError('Appointment not found');

      if (caller) {
        if (caller.role === Role.DOCTOR && appt.doctorId !== caller.doctorId) {
          throw new ForbiddenError('You can only view your own appointments');
        }
        if (caller.role === Role.PATIENT && appt.patientId !== caller.patientId) {
          throw new ForbiddenError('You can only view your own appointments');
        }
        if (caller.role !== Role.DOCTOR && caller.role !== Role.PATIENT) {
          throw new ForbiddenError('Access forbidden: Appointments can only be viewed by the patient or doctor');
        }
      }

      return this.formatAppointment(appt);
    }
  }

  /**
   * Updates appointment status (Doctor can CONFIRM, COMPLETE, CANCEL; Patient can CANCEL)
   */
  async updateAppointmentStatus(
    id: string,
    input: UpdateAppointmentStatusInput,
    callerRole: Role,
    doctorId?: string,
    patientId?: string,
    callerUserId?: string
  ) {
    // Validate allowed transitions by role
    const doctorAllowed = [AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED];
    const patientAllowed = [AppointmentStatus.CANCELLED];

    if (callerRole === Role.PATIENT && !patientAllowed.includes(input.status)) {
      throw new ForbiddenError('Patients are only permitted to cancel appointments');
    }
    if (callerRole === Role.DOCTOR && !doctorAllowed.includes(input.status)) {
      throw new BadRequestError(`Doctors can only set status to: ${doctorAllowed.join(', ')}`);
    }
    if (callerRole !== Role.DOCTOR && callerRole !== Role.PATIENT) {
      throw new ForbiddenError('Only assigned doctors or patients can update appointment status');
    }

    if (isDbConnected()) {
      const existing = await prisma.appointment.findUnique({ where: { id } });
      if (!existing) throw new NotFoundError('Appointment not found');

      if (callerRole === Role.DOCTOR && existing.doctorId !== doctorId) {
        throw new ForbiddenError('You can only manage your own appointments');
      }
      if (callerRole === Role.PATIENT && existing.patientId !== patientId) {
        throw new ForbiddenError('You can only manage your own appointments');
      }
      if (existing.status === AppointmentStatus.COMPLETED || existing.status === AppointmentStatus.CANCELLED) {
        throw new BadRequestError(`Cannot update a ${existing.status} appointment`);
      }

      const updated = await prisma.appointment.update({
        where: { id },
        data: {
          status: input.status,
          notes: input.notes !== undefined ? input.notes : existing.notes,
        },
        include: {
          doctor: {
            include: { user: { select: { id: true, name: true, email: true, phone: true } } },
          },
          patient: {
            include: { user: { select: { id: true, name: true, email: true, phone: true } } },
          },
        },
      });

      recordAuditLog({
        userId: callerUserId,
        action: `APPOINTMENT_${input.status}`,
        resource: 'APPOINTMENT',
        resourceId: id,
        metadata: { previousStatus: existing.status },
      });

      return updated;
    } else {
      const appt = inMemoryDb.appointments.find((a) => a.id === id);
      if (!appt) throw new NotFoundError('Appointment not found');

      if (callerRole === Role.DOCTOR && appt.doctorId !== doctorId) {
        throw new ForbiddenError('You can only manage your own appointments');
      }
      if (callerRole === Role.PATIENT && appt.patientId !== patientId) {
        throw new ForbiddenError('You can only manage your own appointments');
      }
      if (appt.status === AppointmentStatus.COMPLETED || appt.status === AppointmentStatus.CANCELLED) {
        throw new BadRequestError(`Cannot update a ${appt.status} appointment`);
      }

      appt.status = input.status;
      if (input.notes !== undefined) appt.notes = input.notes;
      appt.updatedAt = new Date();

      recordAuditLog({
        userId: callerUserId,
        action: `APPOINTMENT_${input.status}`,
        resource: 'APPOINTMENT',
        resourceId: id,
      });

      return this.formatAppointment(appt);
    }
  }

  private formatAppointment(a: DbAppointment) {
    const doctor = inMemoryDb.doctors.find((d) => d.id === a.doctorId);
    const doctorUser = doctor ? inMemoryDb.users.find((u) => u.id === doctor.userId) : null;
    const patient = inMemoryDb.patients.find((p) => p.id === a.patientId);
    const patientUser = patient ? inMemoryDb.users.find((u) => u.id === patient.userId) : null;

    return {
      ...a,
      dateTime: a.dateTime.toISOString(),
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      doctor: doctor
        ? {
            id: doctor.id,
            specialization: doctor.specialization,
            clinicAddress: doctor.clinicAddress,
            user: doctorUser
              ? { id: doctorUser.id, name: doctorUser.name, email: doctorUser.email, phone: doctorUser.phone }
              : null,
          }
        : null,
      patient: patient
        ? {
            id: patient.id,
            gender: patient.gender,
            bloodGroup: patient.bloodGroup,
            user: patientUser
              ? { id: patientUser.id, name: patientUser.name, email: patientUser.email, phone: patientUser.phone }
              : null,
          }
        : null,
    };
  }
}

export const appointmentService = new AppointmentService();
