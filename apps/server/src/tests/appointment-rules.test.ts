import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { connectDatabase } from '../config/prisma';

const app = createApp();
const API = '/api/v1';

describe('APPT-03 & APPT-04: Appointment Past Date & Role Transition Rules', () => {
  let docToken: string;
  let docId: string;
  let patToken: string;
  let patId: string;
  let otherDocToken: string;
  let otherDocId: string;
  const ts = Date.now();

  beforeAll(async () => {
    if (process.env.TEST_DB === 'postgres') {
      await connectDatabase();
    }

    // Login admin to approve doctors
    const adminLogin = await request(app)
      .post(`${API}/auth/login`)
      .send({ identifier: 'admin@anvaya.health', password: 'Password123' });
    const adminToken = adminLogin.body.data.tokens.accessToken;

    // Register Doctor 1
    const regDoc = await request(app)
      .post(`${API}/auth/register`)
      .send({
        name: 'Dr. Appointment Lead',
        email: `doc.appt.${ts}@test.anvaya`,
        phone: `+91920${String(ts).slice(-7)}`,
        password: 'Password123',
        role: 'DOCTOR',
        specialization: 'General Physician',
        registrationNo: `MCI-APPT-${ts}`,
        clinicAddress: '101 Health Way',
      });
    expect(regDoc.status).toBe(201);
    docToken = regDoc.body.data.tokens.accessToken;
    docId = regDoc.body.data.user.doctorProfile.id;

    // Approve Doctor 1
    await request(app)
      .post(`${API}/admin/verify/doctor/${docId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED' });

    // Register Doctor 2
    const regDoc2 = await request(app)
      .post(`${API}/auth/register`)
      .send({
        name: 'Dr. Other Doctor',
        email: `doc.other.${ts}@test.anvaya`,
        phone: `+91921${String(ts).slice(-7)}`,
        password: 'Password123',
        role: 'DOCTOR',
        specialization: 'Surgeon',
        registrationNo: `MCI-OTH-${ts}`,
        clinicAddress: '202 Health Way',
      });
    otherDocToken = regDoc2.body.data.tokens.accessToken;
    otherDocId = regDoc2.body.data.user.doctorProfile.id;

    // Approve Doctor 2
    await request(app)
      .post(`${API}/admin/verify/doctor/${otherDocId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED' });

    // Register Patient 1
    const regPat = await request(app)
      .post(`${API}/auth/register`)
      .send({
        name: 'Patient Appt Tester',
        email: `pat.appt.${ts}@test.anvaya`,
        phone: `+91922${String(ts).slice(-7)}`,
        password: 'Password123',
        role: 'PATIENT',
        dob: '1990-01-01',
        gender: 'MALE',
        address: '303 Health Ave',
      });
    expect(regPat.status).toBe(201);
    patToken = regPat.body.data.tokens.accessToken;
    patId = regPat.body.data.user.patientProfile.id;
  });

  describe('APPT-04: Reject Past Dates', () => {
    it('rejects booking appointment with a past date (400 Bad Request)', async () => {
      const pastDate = new Date(Date.now() - 86400000 * 5).toISOString();
      const res = await request(app)
        .post(`${API}/appointments`)
        .set('Authorization', `Bearer ${patToken}`)
        .send({
          doctorId: docId,
          dateTime: pastDate,
          reason: 'Past Date Consultation Attempt',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects booking appointment with timestamp in year 2020 (400 Bad Request)', async () => {
      const res = await request(app)
        .post(`${API}/appointments`)
        .set('Authorization', `Bearer ${patToken}`)
        .send({
          doctorId: docId,
          dateTime: '2020-01-01T10:00:00.000Z',
          reason: 'Historical year check',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('accepts booking appointment with future date (201 Created)', async () => {
      const futureDate = new Date(Date.now() + 86400000 * 2).toISOString();
      const res = await request(app)
        .post(`${API}/appointments`)
        .set('Authorization', `Bearer ${patToken}`)
        .send({
          doctorId: docId,
          dateTime: futureDate,
          reason: 'Valid Future Consultation',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('SCHEDULED');
    });
  });

  describe('APPT-03: Per-Role Status Transition State Machine', () => {
    let apptId: string;

    beforeAll(async () => {
      const futureDate = new Date(Date.now() + 86400000 * 3).toISOString();
      const res = await request(app)
        .post(`${API}/appointments`)
        .set('Authorization', `Bearer ${patToken}`)
        .send({
          doctorId: docId,
          dateTime: futureDate,
          reason: 'State Machine Testing Appointment',
        });
      apptId = res.body.data.id;
    });

    it('patient CANNOT mark appointment COMPLETED (403 Forbidden)', async () => {
      const res = await request(app)
        .patch(`${API}/appointments/${apptId}/status`)
        .set('Authorization', `Bearer ${patToken}`)
        .send({ status: 'COMPLETED' });

      // APPT-03 finding: must return 403 Forbidden for patient attempting to mark COMPLETED
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('patient CANNOT mark appointment CONFIRMED (403 Forbidden)', async () => {
      const res = await request(app)
        .patch(`${API}/appointments/${apptId}/status`)
        .set('Authorization', `Bearer ${patToken}`)
        .send({ status: 'CONFIRMED' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('unassigned doctor CANNOT update status (403 Forbidden)', async () => {
      const res = await request(app)
        .patch(`${API}/appointments/${apptId}/status`)
        .set('Authorization', `Bearer ${otherDocToken}`)
        .send({ status: 'CONFIRMED' });

      expect(res.status).toBe(403);
    });

    it('assigned doctor CAN transition SCHEDULED -> CONFIRMED (200 OK)', async () => {
      const res = await request(app)
        .patch(`${API}/appointments/${apptId}/status`)
        .set('Authorization', `Bearer ${docToken}`)
        .send({ status: 'CONFIRMED' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('CONFIRMED');
    });

    it('assigned doctor CAN transition CONFIRMED -> COMPLETED (200 OK)', async () => {
      const res = await request(app)
        .patch(`${API}/appointments/${apptId}/status`)
        .set('Authorization', `Bearer ${docToken}`)
        .send({ status: 'COMPLETED' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('COMPLETED');
    });

    it('terminal state: cannot update a COMPLETED appointment (400 Bad Request)', async () => {
      const res = await request(app)
        .patch(`${API}/appointments/${apptId}/status`)
        .set('Authorization', `Bearer ${docToken}`)
        .send({ status: 'CANCELLED' });

      expect(res.status).toBe(400);
    });

    it('patient CAN cancel their own SCHEDULED appointment (200 OK)', async () => {
      const futureDate = new Date(Date.now() + 86400000 * 4).toISOString();
      const createRes = await request(app)
        .post(`${API}/appointments`)
        .set('Authorization', `Bearer ${patToken}`)
        .send({
          doctorId: docId,
          dateTime: futureDate,
          reason: 'Appointment to be cancelled by patient',
        });
      const cancelApptId = createRes.body.data.id;

      const cancelRes = await request(app)
        .patch(`${API}/appointments/${cancelApptId}/status`)
        .set('Authorization', `Bearer ${patToken}`)
        .send({ status: 'CANCELLED' });

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.data.status).toBe('CANCELLED');
    });
  });
});
