import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { connectDatabase } from '../config/prisma';

const app = createApp();
const API = '/api/v1';

describe('FLAG-09: Billing Access Control & Patient My-Bills Separation', () => {
  let adminToken = '';
  let shopToken = '';
  let shopId = '';
  let pat1Token = '';
  let pat1Id = '';
  let pat2Token = '';
  let pat2Id = '';
  let bill1Id = '';

  beforeAll(async () => {
    if (process.env.TEST_DB === 'postgres') {
      await connectDatabase();
    }

    const adminRes = await request(app)
      .post(`${API}/auth/login`)
      .send({ identifier: 'admin@anvaya.health', password: 'Password123' });
    adminToken = adminRes.body.data.tokens.accessToken;

    const ts = Date.now();

    // Register Shop
    const shopRes = await request(app).post(`${API}/auth/register`).send({
      name: 'Billing Test Pharmacy',
      email: `shop.billing.${ts}@test.anvaya`,
      phone: `+91983${String(ts).slice(-7)}`,
      password: 'Password123',
      role: 'SHOP',
      shopName: 'Test Medicals',
      licenseNo: `DL-BILL-${ts}`,
      address: '100 Health Way',
      timings: '9 AM - 9 PM',
    });
    const unverifiedShopToken = shopRes.body.data.tokens.accessToken;
    shopId = shopRes.body.data.user.shopProfile.id;

    // Approve Shop
    await request(app)
      .post(`${API}/admin/verify/shop/${shopId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED', reason: 'License verified' });

    // Login Shop
    const shopLogin = await request(app).post(`${API}/auth/login`).send({
      identifier: `shop.billing.${ts}@test.anvaya`,
      password: 'Password123',
    });
    shopToken = shopLogin.body.data.tokens.accessToken;

    // Register Patient 1
    const p1Res = await request(app).post(`${API}/auth/register`).send({
      name: 'Bill Patient One',
      email: `pat1.billing.${ts}@test.anvaya`,
      phone: `+91984${String(ts).slice(-7)}`,
      password: 'Password123',
      role: 'PATIENT',
      dob: '1992-02-02',
      gender: 'MALE',
      address: '101 Patient Road',
    });
    pat1Token = p1Res.body.data.tokens.accessToken;
    pat1Id = p1Res.body.data.user.patientProfile.id;

    // Register Patient 2
    const p2Res = await request(app).post(`${API}/auth/register`).send({
      name: 'Bill Patient Two',
      email: `pat2.billing.${ts}@test.anvaya`,
      phone: `+91985${String(ts).slice(-7)}`,
      password: 'Password123',
      role: 'PATIENT',
      dob: '1993-03-03',
      gender: 'FEMALE',
      address: '102 Patient Road',
    });
    pat2Token = p2Res.body.data.tokens.accessToken;
    pat2Id = p2Res.body.data.user.patientProfile.id;

    // Shop creates a bill for Patient 1
    const billRes = await request(app)
      .post(`${API}/billing/bills`)
      .set('Authorization', `Bearer ${shopToken}`)
      .send({
        patientId: pat1Id,
        items: [{ medicine: 'Amoxicillin 500mg', quantity: 2, unitPrice: 20, totalPrice: 40 }],
        subtotal: 40,
        tax: 2,
        total: 42,
        paymentStatus: 'PAID',
        paymentMethod: 'CASH',
      });
    bill1Id = billRes.body.data.id;
  });

  it('Patient calling GET /billing/bills receives 403 Forbidden (SHOP-only)', async () => {
    const res = await request(app)
      .get(`${API}/billing/bills`)
      .set('Authorization', `Bearer ${pat1Token}`);
    expect(res.status).toBe(403);
  });

  it('Shop calling GET /billing/bills receives 200 OK and sees their bills', async () => {
    const res = await request(app)
      .get(`${API}/billing/bills`)
      .set('Authorization', `Bearer ${shopToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.some((b: any) => b.id === bill1Id)).toBe(true);
  });

  it('Patient calling GET /billing/my-bills receives 200 OK with their bills only', async () => {
    const res = await request(app)
      .get(`${API}/billing/my-bills`)
      .set('Authorization', `Bearer ${pat1Token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].patientId).toBe(pat1Id);
  });

  it('Another Patient calling GET /billing/my-bills does not see Patient 1 bills', async () => {
    const res = await request(app)
      .get(`${API}/billing/my-bills`)
      .set('Authorization', `Bearer ${pat2Token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.some((b: any) => b.id === bill1Id)).toBe(false);
  });

  it('Shop calling GET /billing/my-bills receives 403 Forbidden (PATIENT-only)', async () => {
    const res = await request(app)
      .get(`${API}/billing/my-bills`)
      .set('Authorization', `Bearer ${shopToken}`);
    expect(res.status).toBe(403);
  });
});
