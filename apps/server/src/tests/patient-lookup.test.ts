import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { connectDatabase } from '../config/prisma';

const app = createApp();
const API = '/api/v1';

describe('FLAG-10: Patient Lookup Doctor-Only, Strict Rate Limiting & Indistinguishable Results', () => {
  let adminToken = '';
  let docToken = '';
  let docId = '';
  let shopToken = '';
  let shopId = '';
  let patientPhone = '';
  let patientId = '';

  beforeAll(async () => {
    if (process.env.TEST_DB === 'postgres') {
      await connectDatabase();
    }

    // Admin login
    const adminRes = await request(app)
      .post(`${API}/auth/login`)
      .send({ identifier: 'admin@anvaya.health', password: 'Password123' });
    adminToken = adminRes.body.data.tokens.accessToken;

    const ts = Date.now();

    // Register Doctor
    const docReg = await request(app).post(`${API}/auth/register`).send({
      name: 'Dr. Lookup Specialist',
      email: `doc.lookup.${ts}@test.anvaya`,
      phone: `+91971${String(ts).slice(-7)}`,
      password: 'Password123',
      role: 'DOCTOR',
      specialization: 'Neurology',
      registrationNo: `MCI-LOOK-${ts}`,
      clinicAddress: '100 Clinic St',
    });
    docId = docReg.body.data.user.doctorProfile.id;

    // Approve Doctor
    await request(app)
      .post(`${API}/admin/verify/doctor/${docId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED', reason: 'Verified credentials' });

    // Login Doctor
    const docLogin = await request(app).post(`${API}/auth/login`).send({
      identifier: `doc.lookup.${ts}@test.anvaya`,
      password: 'Password123',
    });
    docToken = docLogin.body.data.tokens.accessToken;

    // Register & Approve Shop
    const shopReg = await request(app).post(`${API}/auth/register`).send({
      name: 'Lookup Test Shop',
      email: `shop.lookup.${ts}@test.anvaya`,
      phone: `+91972${String(ts).slice(-7)}`,
      password: 'Password123',
      role: 'SHOP',
      shopName: 'Test Rx Shop',
      licenseNo: `DL-LOOK-${ts}`,
      address: '101 Shop Rd',
      timings: '9 AM - 9 PM',
    });
    shopId = shopReg.body.data.user.shopProfile.id;

    await request(app)
      .post(`${API}/admin/verify/shop/${shopId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED', reason: 'Verified license' });

    const shopLogin = await request(app).post(`${API}/auth/login`).send({
      identifier: `shop.lookup.${ts}@test.anvaya`,
      password: 'Password123',
    });
    shopToken = shopLogin.body.data.tokens.accessToken;

    // Register Patient
    patientPhone = `+91973${String(ts).slice(-7)}`;
    const patReg = await request(app).post(`${API}/auth/register`).send({
      name: 'Lookup Target Patient',
      email: `pat.lookup.${ts}@test.anvaya`,
      phone: patientPhone,
      password: 'Password123',
      role: 'PATIENT',
      dob: '1990-01-01',
      gender: 'MALE',
      address: '103 Target St',
    });
    patientId = patReg.body.data.user.patientProfile.id;
  });

  it('Shop calling GET /patients/lookup receives 403 Forbidden', async () => {
    const res = await request(app)
      .get(`${API}/patients/lookup?phone=${encodeURIComponent(patientPhone)}`)
      .set('Authorization', `Bearer ${shopToken}`);
    expect(res.status).toBe(403);
  });

  it('Verified Doctor calling GET /patients/lookup for existing patient receives 200 with minimized demographics', async () => {
    const res = await request(app)
      .get(`${API}/patients/lookup?phone=${encodeURIComponent(patientPhone)}`)
      .set('Authorization', `Bearer ${docToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.id).toBe(patientId);
    expect(res.body.data.name).toBe('Lookup Target Patient');
    expect(typeof res.body.data.age).toBe('number');
    // Ensure no sensitive clinical or contact data is leaked
    expect(res.body.data.address).toBeUndefined();
    expect(res.body.data.email).toBeUndefined();
  });

  it('Verified Doctor calling GET /patients/lookup for non-existent phone returns 200 with null data (indistinguishable status)', async () => {
    const res = await request(app)
      .get(`${API}/patients/lookup?phone=${encodeURIComponent('+910000000000')}`)
      .set('Authorization', `Bearer ${docToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeNull();
  });

  it('Audit log entry is recorded for both existing and non-existent lookups', async () => {
    const auditRes = await request(app)
      .get(`${API}/admin/audit?action=PATIENT_LOOKUP`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(auditRes.status).toBe(200);
    const logs = auditRes.body.data?.logs || [];
    expect(logs.length).toBeGreaterThanOrEqual(2);
  });

  it('Strict rate limiting blocks excessive patient lookups (>10 requests) with 429', async () => {
    let lastStatus = 200;
    for (let i = 0; i < 12; i++) {
      const res = await request(app)
        .get(`${API}/patients/lookup?phone=${encodeURIComponent(patientPhone)}`)
        .set('Authorization', `Bearer ${docToken}`);
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(429);
  });
});
