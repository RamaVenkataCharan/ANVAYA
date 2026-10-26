import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { connectDatabase, disconnectDatabase, isDbConnected } from '../config/prisma';
import { inMemoryDb } from '../db/inMemoryDb';
import { Role } from '@anvaya/shared';

const app = createApp();
const API = '/api/v1';

describe('FLAG-01: Ownership and IDOR Protection Matrix', () => {
  let adminToken = '';
  let doc1Token = '';
  let doc1Id = '';
  let doc2Token = '';
  let doc2Id = '';
  let pat1Token = '';
  let pat1Id = '';
  let pat2Token = '';
  let pat2Id = '';
  let shop1Token = '';
  let shop1Id = '';
  let shop2Token = '';
  let shop2Id = '';

  let rx1Id = '';
  let appt1Id = '';
  let bill1Id = '';
  let report1Id = '';
  let refill1Id = '';

  beforeAll(async () => {
    if (process.env.TEST_DB === 'postgres') {
      await connectDatabase();
    }

    // 1. Admin login
    const adminRes = await request(app)
      .post(`${API}/auth/login`)
      .send({ identifier: 'admin@anvaya.health', password: 'Password123' });
    adminToken = adminRes.body.data.tokens.accessToken;

    // Helper to register & approve
    const registerAndApprove = async (data: any, type: 'doctor' | 'shop' | 'patient') => {
      const reg = await request(app).post(`${API}/auth/register`).send(data);
      const token = reg.body.data.tokens.accessToken;
      const user = reg.body.data.user;

      if (type === 'doctor') {
        await request(app)
          .post(`${API}/admin/verify/doctor/${user.doctorProfile.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'APPROVED', reason: 'Verified credentials' });
        // Re-login to get updated token
        const login = await request(app)
          .post(`${API}/auth/login`)
          .send({ identifier: data.email, password: data.password });
        return { token: login.body.data.tokens.accessToken, profileId: user.doctorProfile.id };
      }
      if (type === 'shop') {
        await request(app)
          .post(`${API}/admin/verify/shop/${user.shopProfile.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'APPROVED', reason: 'Verified license' });
        const login = await request(app)
          .post(`${API}/auth/login`)
          .send({ identifier: data.email, password: data.password });
        return { token: login.body.data.tokens.accessToken, profileId: user.shopProfile.id };
      }
      return { token, profileId: user.patientProfile.id };
    };

    const ts = Date.now();
    // Register Doctor 1
    const d1 = await registerAndApprove(
      {
        name: 'Dr. Owner One',
        email: `doc1.${ts}@test.anvaya`,
        phone: `+91981${String(ts).slice(-7)}`,
        password: 'Password123',
        role: 'DOCTOR',
        specialization: 'Cardiology',
        registrationNo: `MCI-D1-${ts}`,
        clinicAddress: 'Clinic 1',
      },
      'doctor'
    );
    doc1Token = d1.token;
    doc1Id = d1.profileId;

    // Register Doctor 2
    const d2 = await registerAndApprove(
      {
        name: 'Dr. Owner Two',
        email: `doc2.${ts}@test.anvaya`,
        phone: `+91982${String(ts).slice(-7)}`,
        password: 'Password123',
        role: 'DOCTOR',
        specialization: 'Neurology',
        registrationNo: `MCI-D2-${ts}`,
        clinicAddress: 'Clinic 2',
      },
      'doctor'
    );
    doc2Token = d2.token;
    doc2Id = d2.profileId;

    // Register Patient 1
    const p1 = await registerAndApprove(
      {
        name: 'Patient Owner One',
        email: `pat1.${ts}@test.anvaya`,
        phone: `+91983${String(ts).slice(-7)}`,
        password: 'Password123',
        role: 'PATIENT',
        dob: '1990-01-01',
        gender: 'MALE',
        address: 'Address 1',
      },
      'patient'
    );
    pat1Token = p1.token;
    pat1Id = p1.profileId;

    // Register Patient 2
    const p2 = await registerAndApprove(
      {
        name: 'Patient Owner Two',
        email: `pat2.${ts}@test.anvaya`,
        phone: `+91984${String(ts).slice(-7)}`,
        password: 'Password123',
        role: 'PATIENT',
        dob: '1992-02-02',
        gender: 'FEMALE',
        address: 'Address 2',
      },
      'patient'
    );
    pat2Token = p2.token;
    pat2Id = p2.profileId;

    // Register Shop 1
    const s1 = await registerAndApprove(
      {
        name: 'Pharmacist One',
        email: `shop1.${ts}@test.anvaya`,
        phone: `+91985${String(ts).slice(-7)}`,
        password: 'Password123',
        role: 'SHOP',
        shopName: 'Apollo Shop 1',
        licenseNo: `DL-S1-${ts}`,
        address: 'Shop Address 1',
        timings: '09:00 - 21:00',
      },
      'shop'
    );
    shop1Token = s1.token;
    shop1Id = s1.profileId;

    // Register Shop 2
    const s2 = await registerAndApprove(
      {
        name: 'Pharmacist Two',
        email: `shop2.${ts}@test.anvaya`,
        phone: `+91986${String(ts).slice(-7)}`,
        password: 'Password123',
        role: 'SHOP',
        shopName: 'MedPlus Shop 2',
        licenseNo: `DL-S2-${ts}`,
        address: 'Shop Address 2',
        timings: '09:00 - 21:00',
      },
      'shop'
    );
    shop2Token = s2.token;
    shop2Id = s2.profileId;

    // Seed test resources owned by User 1
    // 1. Doctor 1 issues Prescription for Patient 1
    const rxRes = await request(app)
      .post(`${API}/prescriptions`)
      .set('Authorization', `Bearer doc1Token`)
      .set('Authorization', `Bearer ${doc1Token}`)
      .send({
        patientId: pat1Id,
        diagnosis: 'Hypertension Stage 1',
        notes: 'Take medications regularly',
        items: [{ medicine: 'Amlodipine 5mg', dosage: '5mg', frequency: '1-0-0', duration: '30 days', quantity: 30 }],
      });
    rx1Id = rxRes.body.data.id;

    // 2. Patient 1 books Appointment with Doctor 1
    const tomorrow = new Date(Date.now() + 86400000).toISOString();
    const apptRes = await request(app)
      .post(`${API}/appointments`)
      .set('Authorization', `Bearer ${pat1Token}`)
      .send({
        doctorId: doc1Id,
        dateTime: tomorrow,
        reason: 'Routine BP checkup',
      });
    appt1Id = apptRes.body.data.id;

    // 3. Shop 1 dispenses Rx1 and creates Bill for Patient 1
    await request(app)
      .post(`${API}/prescriptions/dispense`)
      .set('Authorization', `Bearer ${shop1Token}`)
      .send({ codeOrToken: rxRes.body.data.code });

    const billRes = await request(app)
      .post(`${API}/billing/bills`)
      .set('Authorization', `Bearer ${shop1Token}`)
      .send({
        patientId: pat1Id,
        prescriptionId: rx1Id,
        paymentMethod: 'KHATA_CREDIT',
        items: [{ medicine: 'Amlodipine 5mg', quantity: 30, unitPrice: 5, totalPrice: 150 }],
        subtotal: 150,
        tax: 0,
        total: 150,
      });
    bill1Id = billRes.body.data.id;

    // 4. Patient 1 uploads report
    const repRes = await request(app)
      .post(`${API}/reports`)
      .set('Authorization', `Bearer ${pat1Token}`)
      .send({
        title: 'Blood Pressure Chart',
        fileUrl: '/uploads/bp-chart.pdf',
        type: 'LAB_REPORT',
      });
    report1Id = repRes.body.data.id;

    // 5. Shop 1 creates refill reminder for Rx1
    const refillRes = await request(app)
      .post(`${API}/refills`)
      .set('Authorization', `Bearer ${shop1Token}`)
      .send({
        prescriptionId: rx1Id,
        remindAt: new Date(Date.now() + 86400000 * 5).toISOString(),
      });
    refill1Id = refillRes.body.data.id;
  });

  describe('Prescription Resource Ownership (GET /prescriptions/:id)', () => {
    it('Patient 1 (owner) CAN read their prescription', async () => {
      const res = await request(app)
        .get(`${API}/prescriptions/${rx1Id}`)
        .set('Authorization', `Bearer ${pat1Token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(rx1Id);
    });

    it('Doctor 1 (issuing doctor) CAN read the prescription', async () => {
      const res = await request(app)
        .get(`${API}/prescriptions/${rx1Id}`)
        .set('Authorization', `Bearer ${doc1Token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(rx1Id);
    });

    it('Patient 2 (unrelated patient) CANNOT read Patient 1 prescription (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`${API}/prescriptions/${rx1Id}`)
        .set('Authorization', `Bearer ${pat2Token}`);
      expect(res.status).toBe(403);
    });

    it('Doctor 2 (no active consent) CANNOT read Patient 1 prescription (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`${API}/prescriptions/${rx1Id}`)
        .set('Authorization', `Bearer ${doc2Token}`);
      expect(res.status).toBe(403);
    });

    it('Doctor 2 CAN read prescription after Patient 1 grants consent', async () => {
      // Grant consent
      await request(app)
        .post(`${API}/consent/grant`)
        .set('Authorization', `Bearer ${pat1Token}`)
        .send({ doctorId: doc2Id, notes: 'Second opinion' });

      const res = await request(app)
        .get(`${API}/prescriptions/${rx1Id}`)
        .set('Authorization', `Bearer ${doc2Token}`);
      expect(res.status).toBe(200);

      // Revoke consent
      await request(app)
        .post(`${API}/consent/revoke`)
        .set('Authorization', `Bearer ${pat1Token}`)
        .send({ doctorId: doc2Id });

      // After revoke, doctor 2 blocked again
      const resRevoked = await request(app)
        .get(`${API}/prescriptions/${rx1Id}`)
        .set('Authorization', `Bearer ${doc2Token}`);
      expect(resRevoked.status).toBe(403);
    });

    it('Shop CANNOT call GET /prescriptions/:id (403 Forbidden - must use /verify)', async () => {
      const res = await request(app)
        .get(`${API}/prescriptions/${rx1Id}`)
        .set('Authorization', `Bearer ${shop1Token}`);
      expect(res.status).toBe(403);
    });

    it('Admin CANNOT call GET /prescriptions/:id (403 Forbidden - no clinical content for admins)', async () => {
      const res = await request(app)
        .get(`${API}/prescriptions/${rx1Id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe('Appointment Resource Ownership (GET /appointments/:id)', () => {
    it('Patient 1 (attendee) CAN read appointment', async () => {
      const res = await request(app)
        .get(`${API}/appointments/${appt1Id}`)
        .set('Authorization', `Bearer ${pat1Token}`);
      expect(res.status).toBe(200);
    });

    it('Doctor 1 (assigned doctor) CAN read appointment', async () => {
      const res = await request(app)
        .get(`${API}/appointments/${appt1Id}`)
        .set('Authorization', `Bearer ${doc1Token}`);
      expect(res.status).toBe(200);
    });

    it('Patient 2 CANNOT read Patient 1 appointment (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`${API}/appointments/${appt1Id}`)
        .set('Authorization', `Bearer ${pat2Token}`);
      expect(res.status).toBe(403);
    });

    it('Doctor 2 CANNOT read Doctor 1 appointment (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`${API}/appointments/${appt1Id}`)
        .set('Authorization', `Bearer ${doc2Token}`);
      expect(res.status).toBe(403);
    });
  });

  describe('Billing Resource Ownership (GET /billing/bills/:id & /ledger/balance/:patientId)', () => {
    it('Shop 1 (issuer) CAN read bill', async () => {
      const res = await request(app)
        .get(`${API}/billing/bills/${bill1Id}`)
        .set('Authorization', `Bearer ${shop1Token}`);
      expect(res.status).toBe(200);
    });

    it('Patient 1 (billed customer) CAN read bill', async () => {
      const res = await request(app)
        .get(`${API}/billing/bills/${bill1Id}`)
        .set('Authorization', `Bearer ${pat1Token}`);
      expect(res.status).toBe(200);
    });

    it('Shop 2 CANNOT read Shop 1 bill (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`${API}/billing/bills/${bill1Id}`)
        .set('Authorization', `Bearer ${shop2Token}`);
      expect(res.status).toBe(403);
    });

    it('Patient 2 CANNOT read Patient 1 bill (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`${API}/billing/bills/${bill1Id}`)
        .set('Authorization', `Bearer ${pat2Token}`);
      expect(res.status).toBe(403);
    });

    it('Patient 2 CANNOT query Patient 1 Khata balance (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`${API}/billing/ledger/balance/${pat1Id}`)
        .set('Authorization', `Bearer ${pat2Token}`);
      expect(res.status).toBe(403);
    });
  });

  describe('Medical Report Resource Ownership (GET /reports/:id & /reports/:id/file)', () => {
    it('Patient 1 CAN read their own report', async () => {
      const res = await request(app)
        .get(`${API}/reports/${report1Id}`)
        .set('Authorization', `Bearer ${pat1Token}`);
      expect(res.status).toBe(200);
    });

    it('Patient 2 CANNOT read Patient 1 report (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`${API}/reports/${report1Id}`)
        .set('Authorization', `Bearer ${pat2Token}`);
      expect(res.status).toBe(403);
    });

    it('Admin CANNOT read Patient 1 report (403 Forbidden - privacy gate)', async () => {
      const res = await request(app)
        .get(`${API}/reports/${report1Id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe('Refill Reminder Resource Ownership (DELETE /refills/:id)', () => {
    it('Shop 2 CANNOT delete Shop 1 refill reminder (403 Forbidden)', async () => {
      const res = await request(app)
        .delete(`${API}/refills/${refill1Id}`)
        .set('Authorization', `Bearer ${shop2Token}`);
      expect(res.status).toBe(403);
    });

    it('Patient 2 CANNOT delete Patient 1 refill reminder (403 Forbidden)', async () => {
      const res = await request(app)
        .delete(`${API}/refills/${refill1Id}`)
        .set('Authorization', `Bearer ${pat2Token}`);
      expect(res.status).toBe(403);
    });

    it('Patient 1 (owner) CAN delete refill reminder', async () => {
      const res = await request(app)
        .delete(`${API}/refills/${refill1Id}`)
        .set('Authorization', `Bearer ${pat1Token}`);
      expect(res.status).toBe(200);
    });
  });
});
