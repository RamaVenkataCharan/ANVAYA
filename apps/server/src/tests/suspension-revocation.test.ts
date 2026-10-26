import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { connectDatabase } from '../config/prisma';

const app = createApp();
const API = '/api/v1';

describe('FLAG-02 & FLAG-05: Suspension & Immediate Token Revocation', () => {
  let adminToken = '';
  let testUserToken = '';
  let testUserRefreshToken = '';
  let testUserId = '';
  const testEmail = `suspend.suite.${Date.now()}@test.anvaya`;
  const testPassword = 'Password123';

  beforeAll(async () => {
    if (process.env.TEST_DB === 'postgres') {
      await connectDatabase();
    }

    // 1. Admin login
    const adminRes = await request(app)
      .post(`${API}/auth/login`)
      .send({ identifier: 'admin@anvaya.health', password: 'Password123' });
    adminToken = adminRes.body.data.tokens.accessToken;

    // 2. Register a patient user
    const regRes = await request(app)
      .post(`${API}/auth/register`)
      .send({
        name: 'Suspension Test Patient',
        email: testEmail,
        phone: `+91987${String(Date.now()).slice(-7)}`,
        password: testPassword,
        role: 'PATIENT',
        dob: '1995-05-05',
        gender: 'MALE',
        address: '500 Test Avenue',
      });

    testUserToken = regRes.body.data.tokens.accessToken;
    testUserRefreshToken = regRes.body.data.tokens.refreshToken;
    testUserId = regRes.body.data.user.id;
  });

  it('Active user can access GET /auth/me with existing access token', async () => {
    const res = await request(app)
      .get(`${API}/auth/me`)
      .set('Authorization', `Bearer ${testUserToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(testUserId);
  });

  it('Admin suspends user account', async () => {
    const res = await request(app)
      .post(`${API}/admin/users/${testUserId}/suspend`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Suspicious account activity' });
    expect(res.status).toBe(200);
  });

  it('Existing access token immediately FAILS on GET /auth/me (401 Unauthorized)', async () => {
    const res = await request(app)
      .get(`${API}/auth/me`)
      .set('Authorization', `Bearer ${testUserToken}`);
    expect(res.status).toBe(401);
  });

  it('Existing refresh token immediately FAILS on POST /auth/refresh (401 Unauthorized)', async () => {
    const res = await request(app)
      .post(`${API}/auth/refresh`)
      .send({ refreshToken: testUserRefreshToken });
    expect(res.status).toBe(401);
  });

  it('Suspended user is blocked from new logins (401 Unauthorized)', async () => {
    const res = await request(app)
      .post(`${API}/auth/login`)
      .send({ identifier: testEmail, password: testPassword });
    expect(res.status).toBe(401);
  });

  it('Admin reactivates user account', async () => {
    const res = await request(app)
      .post(`${API}/admin/users/${testUserId}/reactivate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Account cleared by admin' });
    expect(res.status).toBe(200);
  });

  it('Reactivated user can log in and obtain valid new tokens', async () => {
    const loginRes = await request(app)
      .post(`${API}/auth/login`)
      .send({ identifier: testEmail, password: testPassword });
    expect(loginRes.status).toBe(200);
    const newAccessToken = loginRes.body.data.tokens.accessToken;

    const meRes = await request(app)
      .get(`${API}/auth/me`)
      .set('Authorization', `Bearer ${newAccessToken}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.id).toBe(testUserId);
  });
});
