import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { inMemoryDb } from '../db/inMemoryDb';
import { Role, PrescriptionStatus } from '@anvaya/shared';
import crypto from 'crypto';

const app = createApp();
const API = '/api/v1';

describe('Group B: Patient Endpoints & Access History (Tier B Suite)', () => {
  const ts = Date.now();
  let patientToken: string;
  let patientUserId: string;
  let patientId: string;
  let doctorToken: string;
  let doctorUserId: string;
  let doctorId: string;
  let prescriptionId: string;

  beforeAll(async () => {
    // 1. Register Doctor
    const docRes = await request(app)
      .post(`${API}/auth/register`)
      .send({
        name: 'Dr. Auditor',
        email: `doc.b.${ts}@test.anvaya`,
        phone: `+9198${String(ts).slice(-8)}`,
        password: 'Password123',
        role: 'DOCTOR',
        specialization: 'Internal Medicine',
        registrationNo: `MCI-GB-${ts}`,
        clinicAddress: '100 Medical Square, Hyderabad',
      });
    expect(docRes.status).toBe(201);
    doctorToken = docRes.body.data.tokens.accessToken;
    doctorUserId = docRes.body.data.user.id;
    doctorId = docRes.body.data.user.doctorProfile.id;

    // 2. Register Patient
    const patRes = await request(app)
      .post(`${API}/auth/register`)
      .send({
        name: 'Patient B Tester',
        email: `pat.b.${ts}@test.anvaya`,
        phone: `+9197${String(ts).slice(-8)}`,
        password: 'Password123',
        role: 'PATIENT',
        dob: '1992-08-10',
        gender: 'FEMALE',
        address: '500 Care Colony, Hyderabad',
      });
    expect(patRes.status).toBe(201);
    patientToken = patRes.body.data.tokens.accessToken;
    patientUserId = patRes.body.data.user.id;
    patientId = patRes.body.data.user.patientProfile.id;

    // 3. Create a prescription for this patient
    const rxId = crypto.randomUUID();
    prescriptionId = rxId;
    inMemoryDb.prescriptions.push({
      id: rxId,
      doctorId,
      patientId,
      shopId: null,
      code: `RX-${ts}`,
      qrToken: `QR-${ts}`,
      status: PrescriptionStatus.ACTIVE,
      diagnosis: 'Routine Medical Review',
      notes: 'Prescribed basic maintenance course',
      issuedAt: new Date(),
      dispensedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 4. Simulate doctor viewing the prescription (recorded in audit log)
    inMemoryDb.auditLogs.push({
      id: crypto.randomUUID(),
      userId: doctorUserId,
      action: 'PRESCRIPTION_VIEWED',
      resource: 'PRESCRIPTION',
      resourceId: rxId,
      ipAddress: '127.0.0.1',
      userAgent: 'TestAgent/1.0',
      metadata: { patientId },
      createdAt: new Date(),
    });
  });

  describe('B8: Access History Endpoint (GET /consent/access-history)', () => {
    it('returns clinical record access history to the patient', async () => {
      const res = await request(app)
        .get(`${API}/consent/access-history`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      const entry = res.body.data[0];
      expect(entry.action).toBe('PRESCRIPTION_VIEWED');
      expect(entry.actorName).toBe('Dr. Auditor');
      expect(entry.actorRole).toBe('DOCTOR');
      expect(entry.resourceTitle).toBe(`RX-${ts}`);
    });

    it('rejects access to non-patient role (Doctor cannot query patient access history)', async () => {
      const res = await request(app)
        .get(`${API}/consent/access-history`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(403);
    });

    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get(`${API}/consent/access-history`);
      expect(res.status).toBe(401);
    });
  });
});
