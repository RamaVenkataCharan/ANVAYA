import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { connectDatabase } from '../config/prisma';

const app = createApp();
const API = '/api/v1';

describe('Admin Provider Rejection Reason Enforcement (FLAG: Admin Reject)', () => {
  let adminToken: string;
  let doctorProfileId: string;
  let shopProfileId: string;
  const ts = Date.now();

  beforeAll(async () => {
    if (process.env.TEST_DB === 'postgres') {
      await connectDatabase();
    }

    const loginRes = await request(app)
      .post(`${API}/auth/login`)
      .send({
        identifier: 'admin@anvaya.health',
        password: 'Password123',
      });
    expect(loginRes.status).toBe(200);
    adminToken = loginRes.body.data.tokens.accessToken;

    // Register a pending doctor
    const regDoc = await request(app)
      .post(`${API}/auth/register`)
      .send({
        name: 'Dr. Rejection Candidate',
        email: `doc.rej.${ts}@test.anvaya`,
        phone: `+91911${String(ts).slice(-7)}`,
        password: 'Password123',
        role: 'DOCTOR',
        specialization: 'Cardiology',
        registrationNo: `MCI-REJ-${ts}`,
        clinicAddress: '123 Hospital St',
      });
    expect(regDoc.status).toBe(201);
    doctorProfileId = regDoc.body.data.user.doctorProfile.id;

    // Register a pending shop
    const regShop = await request(app)
      .post(`${API}/auth/register`)
      .send({
        name: 'Shop Rejection Candidate',
        email: `shop.rej.${ts}@test.anvaya`,
        phone: `+91912${String(ts).slice(-7)}`,
        password: 'Password123',
        role: 'SHOP',
        shopName: 'Rejection Pharmacy',
        licenseNo: `DL-REJ-${ts}`,
        address: '456 Market St',
        timings: '09:00 - 21:00',
      });
    expect(regShop.status).toBe(201);
    shopProfileId = regShop.body.data.user.shopProfile.id;
  });

  it('rejects doctor rejection when reason is omitted completely (400 Bad Request)', async () => {
    const res = await request(app)
      .post(`${API}/admin/verify/doctor/${doctorProfileId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'REJECTED' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects doctor rejection when reason is empty or whitespace (400 Bad Request)', async () => {
    const resEmpty = await request(app)
      .post(`${API}/admin/verify/doctor/${doctorProfileId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'REJECTED', reason: '' });

    expect(resEmpty.status).toBe(400);

    const resWhitespace = await request(app)
      .post(`${API}/admin/verify/doctor/${doctorProfileId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'REJECTED', reason: '    ' });

    expect(resWhitespace.status).toBe(400);
  });

  it('rejects doctor rejection when reason is too short (< 5 characters) (400 Bad Request)', async () => {
    const res = await request(app)
      .post(`${API}/admin/verify/doctor/${doctorProfileId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'REJECTED', reason: 'bad' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects shop rejection when reason is omitted or too short (400 Bad Request)', async () => {
    const resOmitted = await request(app)
      .post(`${API}/admin/verify/shop/${shopProfileId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'REJECTED' });

    expect(resOmitted.status).toBe(400);

    const resShort = await request(app)
      .post(`${API}/admin/verify/shop/${shopProfileId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'REJECTED', reason: 'no' });

    expect(resShort.status).toBe(400);
  });

  it('allows doctor approval WITHOUT a reason (200 OK)', async () => {
    // Register another doctor for approval test
    const regDocApp = await request(app)
      .post(`${API}/auth/register`)
      .send({
        name: 'Dr. Approval Candidate',
        email: `doc.app.${ts}@test.anvaya`,
        phone: `+91913${String(ts).slice(-7)}`,
        password: 'Password123',
        role: 'DOCTOR',
        specialization: 'Neurology',
        registrationNo: `MCI-APP-${ts}`,
        clinicAddress: '789 Clinic Blvd',
      });
    const docAppId = regDocApp.body.data.user.doctorProfile.id;

    const res = await request(app)
      .post(`${API}/admin/verify/doctor/${docAppId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED' });

    expect(res.status).toBe(200);
    expect(res.body.data.verificationStatus).toBe('APPROVED');
  });

  it('successfully rejects doctor when valid non-empty reason is supplied (200 OK)', async () => {
    const validReason = 'Medical registration number could not be validated against state council database.';
    const res = await request(app)
      .post(`${API}/admin/verify/doctor/${doctorProfileId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'REJECTED',
        reason: validReason,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.verificationStatus).toBe('REJECTED');
    expect(res.body.data.rejectionReason).toBe(validReason);
  });

  it('successfully rejects shop when valid non-empty reason is supplied (200 OK)', async () => {
    const validReason = 'Pharmacy drug license certificate expired and failed regulatory compliance.';
    const res = await request(app)
      .post(`${API}/admin/verify/shop/${shopProfileId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'REJECTED',
        reason: validReason,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.verificationStatus).toBe('REJECTED');
    expect(res.body.data.rejectionReason).toBe(validReason);
  });
});
