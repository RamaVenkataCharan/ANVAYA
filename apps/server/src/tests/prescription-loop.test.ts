/**
 * Integration test: E-Prescription Core Loop
 *
 * Sequence tested:
 *   1. Register + approve Doctor, register Patient, register + approve Shop
 *   2. Doctor issues prescription  -> returns code + qrToken
 *   3. Patient lists prescriptions -> sees the new prescription (status=ISSUED)
 *   4. Shop verifies prescription  -> isValid=true, status=ISSUED
 *   5. Shop dispenses prescription -> status transitions to DISPENSED
 *   6. Shop dispenses again        -> 400 fraud-prevention error (atomic guard)
 *
 * Runs entirely in-memory — no Postgres needed.
 * Fresh users are registered so all IDs are crypto.randomUUID() values that
 * pass Zod's strict UUID validation.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { createApp } from '../app';
import { processDueRefillReminders } from '../jobs/refillReminders';
import { connectDatabase, disconnectDatabase, prisma } from '../config/prisma';

// Lift rate limiters and silence HTTP logs during tests
process.env.NODE_ENV = 'test';

beforeAll(async () => {
  if (process.env.TEST_DB === 'postgres') {
    await connectDatabase();
    const passwordHash = await bcrypt.hash('Password123', 10);
    await prisma.user.upsert({
      where: { email: 'admin@anvaya.health' },
      update: { passwordHash, isActive: true },
      create: {
        name: 'System Administrator',
        email: 'admin@anvaya.health',
        phone: '+919999900001',
        passwordHash,
        role: Role.ADMIN,
        isActive: true,
      },
    });
  }
});

afterAll(async () => {
  if (process.env.TEST_DB === 'postgres') {
    await disconnectDatabase();
  }
});

const app = createApp();
const API = '/api/v1';

// ── Shared state ──────────────────────────────────────────────────────────
let adminToken      = '';
let doctorToken     = '';
let doctorProfileId = '';
let patientToken    = '';
let patientId       = '';  // Patient.id (not User.id)
let patientPhone    = '';
let shopToken       = '';

let prescriptionCode    = '';
let prescriptionQrToken = '';
let prescriptionId      = '';

// ── Step 0: Bootstrap all three actors ────────────────────────────────────
describe('Step 0 — Actor setup', () => {
  it('Admin logs in', async () => {
    const res = await request(app)
      .post(`${API}/auth/login`)
      .send({ identifier: 'admin@anvaya.health', password: 'Password123' });

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    adminToken = res.body.data.tokens.accessToken;
    expect(adminToken).toBeTruthy();
  });

  it('Registers a Patient and stores their Patient.id', async () => {
    patientPhone = `+91800${String(Date.now()).slice(-7)}`;
    const res = await request(app)
      .post(`${API}/auth/register`)
      .send({
        name: 'Integration Patient',
        email: `patient.${Date.now()}@test.anvaya`,
        phone: patientPhone,
        password: 'Password123',
        role: 'PATIENT',
        dob: '1990-06-15',
        gender: 'FEMALE',
        address: '10 Test Lane, Hyderabad',
      });

    expect(res.status, JSON.stringify(res.body)).toBe(201);
    patientToken = res.body.data.tokens.accessToken;
    patientId    = res.body.data.user.patientProfile?.id ?? '';
    expect(patientId).toBeTruthy();
  });

  it('Registers a Doctor, gets approved by Admin, re-logs in with fresh token', async () => {
    const email = `doctor.${Date.now()}@test.anvaya`;
    const regRes = await request(app)
      .post(`${API}/auth/register`)
      .send({
        name: 'Dr Integration Test',
        email,
        phone: `+91801${String(Date.now()).slice(-7)}`,
        password: 'Password123',
        role: 'DOCTOR',
        specialization: 'General Medicine',
        registrationNo: `MCI-INT-${Date.now()}`,
        clinicAddress: '1 Integration Clinic, Hyderabad',
      });

    expect(regRes.status, JSON.stringify(regRes.body)).toBe(201);
    doctorProfileId = regRes.body.data.user.doctorProfile?.id ?? '';
    expect(doctorProfileId).toBeTruthy();

    // Admin approves the doctor
    const approveRes = await request(app)
      .post(`${API}/admin/verify/doctor/${doctorProfileId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED' });
    expect(approveRes.status, JSON.stringify(approveRes.body)).toBe(200);

    // Re-login to get a fresh JWT (requireVerified re-reads DB so token payload doesn't matter,
    // but a fresh login is cleaner)
    const loginRes = await request(app)
      .post(`${API}/auth/login`)
      .send({ identifier: email, password: 'Password123' });
    expect(loginRes.status).toBe(200);
    doctorToken = loginRes.body.data.tokens.accessToken;
  });

  it('Registers a Shop, gets approved by Admin, re-logs in with fresh token', async () => {
    const email = `shop.${Date.now()}@test.anvaya`;
    const regRes = await request(app)
      .post(`${API}/auth/register`)
      .send({
        name: 'Test Pharmacist',
        email,
        phone: `+91802${String(Date.now()).slice(-7)}`,
        password: 'Password123',
        role: 'SHOP',
        shopName: `Integration Pharmacy ${Date.now()}`,
        licenseNo: `DL-INT-${Date.now()}`,
        address: '5 Pharmacy Road, Hyderabad',
        timings: '09:00-21:00',
      });

    expect(regRes.status, JSON.stringify(regRes.body)).toBe(201);
    const shopProfileId = regRes.body.data.user.shopProfile?.id ?? '';
    expect(shopProfileId).toBeTruthy();

    const approveRes = await request(app)
      .post(`${API}/admin/verify/shop/${shopProfileId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED' });
    expect(approveRes.status, JSON.stringify(approveRes.body)).toBe(200);

    const loginRes = await request(app)
      .post(`${API}/auth/login`)
      .send({ identifier: email, password: 'Password123' });
    expect(loginRes.status).toBe(200);
    shopToken = loginRes.body.data.tokens.accessToken;
  });
});

// ── Step 1: Doctor issues a prescription ──────────────────────────────────
describe('Step 1 — Doctor issues prescription', () => {
  it('Doctor looks up patient by phone via GET /patients/lookup (returns only id, name and age)', async () => {
    const res = await request(app)
      .get(`${API}/patients/lookup?phone=${encodeURIComponent(patientPhone)}`)
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body.data.id).toBe(patientId);
    expect(res.body.data.name).toBe('Integration Patient');
    expect(typeof res.body.data.age).toBe('number');
    expect(res.body.data.dob).toBeUndefined();
    expect(res.body.data.address).toBeUndefined();
  });

  it('POST /prescriptions returns 201 with ANV-xxxx-xxxx code and qrToken', async () => {
    const res = await request(app)
      .post(`${API}/prescriptions`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        patientId,
        diagnosis: 'Integration Test Hypertension',
        notes: 'Core loop hardening test',
        items: [
          {
            medicine: 'Amlodipine 5mg',
            dosage: '5mg',
            frequency: '1-0-0 after food',
            duration: '30 days',
            quantity: 30,
            instructions: 'Take in the morning',
          },
        ],
      });

    expect(res.status, JSON.stringify(res.body)).toBe(201);
    expect(res.body.data.status).toBe('ISSUED');
    expect(res.body.data.code).toMatch(/^ANV-\d{4}-\d{4}$/);
    expect(res.body.data.qrToken).toBeTruthy();

    prescriptionCode    = res.body.data.code;
    prescriptionQrToken = res.body.data.qrToken;
    prescriptionId      = res.body.data.id;
  });
});

// ── Step 2: Patient sees the prescription in their wallet ─────────────────
describe('Step 2 — Patient wallet', () => {
  it('GET /prescriptions lists the issued prescription', async () => {
    const res = await request(app)
      .get(`${API}/prescriptions`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    const found = (res.body.data as any[]).find((p) => p.id === prescriptionId);
    expect(found, 'Prescription must appear in patient wallet').toBeDefined();
    expect(found.status).toBe('ISSUED');
    expect(found.code).toBe(prescriptionCode);
  });

  it('GET /prescriptions/:id returns the prescription with all items', async () => {
    const res = await request(app)
      .get(`${API}/prescriptions/${prescriptionId}`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].medicine).toBe('Amlodipine 5mg');
  });
});

// ── Step 3: Shop verifies the prescription ────────────────────────────────
describe('Step 3 — Shop verifies', () => {
  it('POST /prescriptions/verify with human-readable code → isValid=true and minimizes data (no diagnosis/notes)', async () => {
    const res = await request(app)
      .post(`${API}/prescriptions/verify`)
      .set('Authorization', `Bearer ${shopToken}`)
      .send({ codeOrToken: prescriptionCode });

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body.data.isValid).toBe(true);
    expect(res.body.data.status).toBe('ISSUED');

    // Data minimization checks: shops must NOT receive diagnosis or clinical notes
    expect(res.body.data.prescription.diagnosis).toBeUndefined();
    expect(res.body.data.prescription.notes).toBeUndefined();
    expect(res.body.data.prescription.patient?.user?.name).toBeTruthy();
    expect(res.body.data.prescription.doctor?.user?.name).toBeTruthy();
    expect(Array.isArray(res.body.data.prescription.items)).toBe(true);
  });

  it('POST /prescriptions/verify with QR token → isValid=true', async () => {
    const res = await request(app)
      .post(`${API}/prescriptions/verify`)
      .set('Authorization', `Bearer ${shopToken}`)
      .send({ codeOrToken: prescriptionQrToken });

    expect(res.status).toBe(200);
    expect(res.body.data.isValid).toBe(true);
    expect(res.body.data.prescription.diagnosis).toBeUndefined();
    expect(res.body.data.prescription.notes).toBeUndefined();
  });
});

// ── Step 4: Shop dispenses (first time must succeed) ─────────────────────
describe('Step 4 — First dispense succeeds', () => {
  it('POST /prescriptions/dispense → 200, status=DISPENSED', async () => {
    const res = await request(app)
      .post(`${API}/prescriptions/dispense`)
      .set('Authorization', `Bearer ${shopToken}`)
      .send({ codeOrToken: prescriptionCode });

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body.data.status).toBe('DISPENSED');
  });

  it('Verify after dispense shows isValid=false', async () => {
    const res = await request(app)
      .post(`${API}/prescriptions/verify`)
      .set('Authorization', `Bearer ${shopToken}`)
      .send({ codeOrToken: prescriptionCode });

    expect(res.status).toBe(200);
    expect(res.body.data.isValid).toBe(false);
    expect(res.body.data.status).toBe('DISPENSED');
  });
});

// ── Step 5: Second dispense must be rejected (fraud prevention) ───────────
describe('Step 5 — Second dispense blocked (atomic guard)', () => {
  it('POST /prescriptions/dispense second time → 400 fraud alert', async () => {
    const res = await request(app)
      .post(`${API}/prescriptions/dispense`)
      .set('Authorization', `Bearer ${shopToken}`)
      .send({ codeOrToken: prescriptionCode });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/ALREADY been dispensed/i);
  });

  it('Second dispense via QR token also returns 400', async () => {
    const res = await request(app)
      .post(`${API}/prescriptions/dispense`)
      .set('Authorization', `Bearer ${shopToken}`)
      .send({ codeOrToken: prescriptionQrToken });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ── Step 6: Billing & Khata Credit Transaction ───────────────────────────
describe('Step 6 — Billing & Khata Credit Transaction', () => {
  let createdBillId = '';

  it('POST /billing/bills with KHATA_CREDIT creates bill and atomic ledger credit', async () => {
    const res = await request(app)
      .post(`${API}/billing/bills`)
      .set('Authorization', `Bearer ${shopToken}`)
      .send({
        patientId,
        prescriptionId,
        items: [
          {
            medicine: 'Amlodipine 5mg',
            quantity: 30,
            unitPrice: 5,
            totalPrice: 150,
          },
        ],
        subtotal: 150,
        tax: 0,
        total: 150,
        paymentStatus: 'PENDING',
        paymentMethod: 'KHATA_CREDIT',
        notes: 'Monthly BP refill on credit',
      });

    expect(res.status, JSON.stringify(res.body)).toBe(201);
    expect(res.body.data.billNumber).toBeTruthy();
    expect(res.body.data.total).toBe(150);
    expect(res.body.data.paymentMethod).toBe('KHATA_CREDIT');
    createdBillId = res.body.data.id;
  });

  it('GET /billing/bills includes the newly created bill', async () => {
    const res = await request(app)
      .get(`${API}/billing/bills`)
      .set('Authorization', `Bearer ${shopToken}`);

    expect(res.status).toBe(200);
    const found = (res.body.data as any[]).find((b) => b.id === createdBillId);
    expect(found).toBeDefined();
    expect(found.total).toBe(150);
  });

  it('GET /billing/ledger/balance/:patientId shows 150 credit balance', async () => {
    const res = await request(app)
      .get(`${API}/billing/ledger/balance/${patientId}`)
      .set('Authorization', `Bearer ${shopToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.totalCredit).toBe(150);
    expect(res.body.data.totalPayment).toBe(0);
    expect(res.body.data.balance).toBe(150);
  });

  it('POST /billing/ledger records a payment reducing the balance', async () => {
    const res = await request(app)
      .post(`${API}/billing/ledger`)
      .set('Authorization', `Bearer ${shopToken}`)
      .send({
        patientId,
        amount: 50,
        type: 'PAYMENT',
        description: 'UPI partial payment towards bill',
      });

    expect(res.status, JSON.stringify(res.body)).toBe(201);
    expect(res.body.data.amount).toBe(50);
    expect(res.body.data.type).toBe('PAYMENT');

    const balRes = await request(app)
      .get(`${API}/billing/ledger/balance/${patientId}`)
      .set('Authorization', `Bearer ${shopToken}`);

    expect(balRes.status).toBe(200);
    expect(balRes.body.data.totalCredit).toBe(150);
    expect(balRes.body.data.totalPayment).toBe(50);
    expect(balRes.body.data.balance).toBe(100);
  });
});

// ── Step 7: Push Tokens & Refill Reminders Job ───────────────────────────
describe('Step 7 — Push Token & Refill Reminders Job', () => {
  let reminderId = '';

  it('POST /users/push-token saves push token for patient', async () => {
    const res = await request(app)
      .post(`${API}/users/push-token`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
      });

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('POST /refills creates a refill reminder for the dispensed prescription', async () => {
    const remindAt = new Date(Date.now() + 1000 * 60 * 60).toISOString(); // 1 hour ahead
    const res = await request(app)
      .post(`${API}/refills`)
      .set('Authorization', `Bearer ${shopToken}`)
      .send({
        prescriptionId,
        remindAt,
      });

    expect(res.status, JSON.stringify(res.body)).toBe(201);
    expect(res.body.data.prescriptionId).toBe(prescriptionId);
    expect(res.body.data.sent).toBe(false);
    reminderId = res.body.data.id;
  });

  it('GET /refills lists pending reminders for shop', async () => {
    const res = await request(app)
      .get(`${API}/refills`)
      .set('Authorization', `Bearer ${shopToken}`);

    expect(res.status).toBe(200);
    const found = (res.body.data as any[]).find((r) => r.id === reminderId);
    expect(found).toBeDefined();
    expect(found.sent).toBe(false);
  });

  it('processDueRefillReminders finds and processes due reminders', async () => {
    // Pass future time so our reminder scheduled 1h ahead is due
    const futureTime = new Date(Date.now() + 1000 * 60 * 120);
    const count = await processDueRefillReminders(futureTime);

    expect(count).toBeGreaterThanOrEqual(1);

    // Verify reminder is now marked sent
    const res = await request(app)
      .get(`${API}/refills`)
      .set('Authorization', `Bearer ${shopToken}`);

    const found = (res.body.data as any[]).find((r) => r.id === reminderId);
    expect(found).toBeDefined();
    expect(found.sent).toBe(true);
  });

  it('GET /refills for patient shows the reminder', async () => {
    const res = await request(app)
      .get(`${API}/refills`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    const found = (res.body.data as any[]).find((r) => r.id === reminderId);
    expect(found).toBeDefined();
  });
});

// ── Step 8: Patient Records & Doctor Consent Flow ────────────────────────
describe('Step 8 — Patient Records & Consent Gate', () => {
  let reportId = '';

  it('Patient uploads a health report to their vault', async () => {
    const res = await request(app)
      .post(`${API}/reports`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        title: 'Blood Test CBC',
        fileUrl: '/uploads/reports/cbc_test.pdf',
        type: 'LAB_REPORT',
        notes: 'Annual routine health checkup',
      });

    expect(res.status, JSON.stringify(res.body)).toBe(201);
    expect(res.body.data.id).toBeTruthy();
    expect(res.body.data.title).toBe('Blood Test CBC');
    reportId = res.body.data.id;
  });

  it('Doctor CANNOT read patient reports without consent (403 Forbidden)', async () => {
    const listRes = await request(app)
      .get(`${API}/reports?patientId=${patientId}`)
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(listRes.status).toBe(403);
    expect(listRes.body.error).toBe('ForbiddenError');

    const getRes = await request(app)
      .get(`${API}/reports/${reportId}`)
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(getRes.status).toBe(403);
    expect(getRes.body.error).toBe('ForbiddenError');
  });

  it('Patient grants consent to Doctor', async () => {
    const res = await request(app)
      .post(`${API}/consent/grant`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        doctorId: doctorProfileId,
        notes: 'Access for hypertension review',
      });

    expect(res.status, JSON.stringify(res.body)).toBe(201);
    expect(res.body.data.isActive).toBe(true);
  });

  it('Doctor CAN read patient reports after consent granted (200 OK)', async () => {
    const listRes = await request(app)
      .get(`${API}/reports?patientId=${patientId}`)
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(listRes.status, JSON.stringify(listRes.body)).toBe(200);
    const found = (listRes.body.data as any[]).find((r) => r.id === reportId);
    expect(found).toBeDefined();
    expect(found.title).toBe('Blood Test CBC');

    const getRes = await request(app)
      .get(`${API}/reports/${reportId}`)
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.id).toBe(reportId);
  });

  it('Patient revokes consent from Doctor', async () => {
    const res = await request(app)
      .post(`${API}/consent/revoke`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        doctorId: doctorProfileId,
      });

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body.data.isActive).toBe(false);
  });

  it('Doctor CANNOT read patient reports after consent revoked (403 Forbidden)', async () => {
    const listRes = await request(app)
      .get(`${API}/reports?patientId=${patientId}`)
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(listRes.status).toBe(403);
    expect(listRes.body.error).toBe('ForbiddenError');

    const getRes = await request(app)
      .get(`${API}/reports/${reportId}`)
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(getRes.status).toBe(403);
    expect(getRes.body.error).toBe('ForbiddenError');
  });
});

