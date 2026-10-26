import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { connectDatabase } from '../config/prisma';

const app = createApp();
const API = '/api/v1';

describe('FLAG-04: Financial Integrity, Server-Side Math & Tampering Prevention', () => {
  let adminToken = '';
  let shopToken = '';
  let shopId = '';
  let patientToken = '';
  let patientId = '';

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
      name: 'Financial Audit Pharmacy',
      email: `shop.fin.${ts}@test.anvaya`,
      phone: `+91961${String(ts).slice(-7)}`,
      password: 'Password123',
      role: 'SHOP',
      shopName: 'Fin Meds',
      licenseNo: `DL-FIN-${ts}`,
      address: '77 Financial St',
      timings: '24/7',
    });
    shopId = shopRes.body.data.user.shopProfile.id;

    // Approve Shop
    await request(app)
      .post(`${API}/admin/verify/shop/${shopId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED', reason: 'License verified' });

    // Login Shop
    const shopLogin = await request(app).post(`${API}/auth/login`).send({
      identifier: `shop.fin.${ts}@test.anvaya`,
      password: 'Password123',
    });
    shopToken = shopLogin.body.data.tokens.accessToken;

    // Register Patient
    const patRes = await request(app).post(`${API}/auth/register`).send({
      name: 'Fin Ledger Patient',
      email: `pat.fin.${ts}@test.anvaya`,
      phone: `+91962${String(ts).slice(-7)}`,
      password: 'Password123',
      role: 'PATIENT',
      dob: '1988-08-08',
      gender: 'MALE',
      address: '88 Khata Rd',
    });
    patientToken = patRes.body.data.tokens.accessToken;
    patientId = patRes.body.data.user.patientProfile.id;
  });

  it('Tampered subtotal is strictly rejected (400 Bad Request)', async () => {
    // 2 items @ 500 = 1000 subtotal, but client maliciously sends subtotal: 10
    const res = await request(app)
      .post(`${API}/billing/bills`)
      .set('Authorization', `Bearer ${shopToken}`)
      .send({
        patientId,
        items: [{ medicine: 'Expensive Medicine', quantity: 2, unitPrice: 500, totalPrice: 1000 }],
        subtotal: 10,
        tax: 0,
        total: 10,
        paymentStatus: 'PAID',
        paymentMethod: 'CASH',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('Tampered total is strictly rejected (400 Bad Request)', async () => {
    // Subtotal 1000, Tax 180, but client maliciously sends total: 500
    const res = await request(app)
      .post(`${API}/billing/bills`)
      .set('Authorization', `Bearer ${shopToken}`)
      .send({
        patientId,
        items: [{ medicine: 'Standard Med', quantity: 2, unitPrice: 500, totalPrice: 1000 }],
        subtotal: 1000,
        tax: 180,
        total: 500,
        paymentStatus: 'PAID',
        paymentMethod: 'CASH',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('Totals match known multi-item and paise precision test cases', async () => {
    // 3 x 33.33 = 99.99
    // 1 x 10.01 = 10.01
    // Server subtotal must be exactly 110.00
    // Tax = 5.50
    // Server total must be exactly 115.50
    const res = await request(app)
      .post(`${API}/billing/bills`)
      .set('Authorization', `Bearer ${shopToken}`)
      .send({
        patientId,
        items: [
          { medicine: 'Med A', quantity: 3, unitPrice: 33.33, totalPrice: 99.99 },
          { medicine: 'Med B', quantity: 1, unitPrice: 10.01, totalPrice: 10.01 },
        ],
        subtotal: 110,
        tax: 5.5,
        total: 115.5,
        paymentStatus: 'PAID',
        paymentMethod: 'UPI',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.subtotal).toBe(110);
    expect(res.body.data.tax).toBe(5.5);
    expect(res.body.data.total).toBe(115.5);
  });

  it('KHATA_CREDIT ledger entry equals server-computed total', async () => {
    const res = await request(app)
      .post(`${API}/billing/bills`)
      .set('Authorization', `Bearer ${shopToken}`)
      .send({
        patientId,
        items: [{ medicine: 'Khata Credit Med', quantity: 5, unitPrice: 40, totalPrice: 200 }],
        subtotal: 200,
        tax: 10,
        total: 210,
        paymentStatus: 'PENDING',
        paymentMethod: 'KHATA_CREDIT',
      });

    expect(res.status).toBe(201);
    const createdBillId = res.body.data.id;

    // Check balance reflects server-computed 210 total
    const balanceRes = await request(app)
      .get(`${API}/billing/ledger/balance/${patientId}`)
      .set('Authorization', `Bearer ${shopToken}`);

    expect(balanceRes.status).toBe(200);
    expect(balanceRes.body.data.balance).toBe(210);

    // Check ledger entries list includes entry matching bill total
    const ledgerRes = await request(app)
      .get(`${API}/billing/ledger?patientId=${patientId}`)
      .set('Authorization', `Bearer ${shopToken}`);

    expect(ledgerRes.status).toBe(200);
    const entry = ledgerRes.body.data.find((e: any) => e.billId === createdBillId);
    expect(entry).toBeDefined();
    expect(entry.amount).toBe(210);
  });
});
