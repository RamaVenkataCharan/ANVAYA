import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { connectDatabase } from '../config/prisma';
import { inMemoryDb } from '../db/inMemoryDb';

const API = '/api/v1';

describe('Server Restart & Refresh Token Revocation Persistence', () => {
  let app = createApp();
  let adminToken = '';
  let userAToken = '';
  let userARefreshToken = '';
  let userBToken = '';
  let userBRefreshToken = '';
  let userBId = '';

  const emailA = `restart.userA.${Date.now()}@anvaya.test`;
  const emailB = `restart.userB.${Date.now()}@anvaya.test`;
  const password = 'Password123';

  beforeAll(async () => {
    if (process.env.TEST_DB === 'postgres') {
      await connectDatabase();
    }

    // 1. Admin login
    const adminRes = await request(app)
      .post(`${API}/auth/login`)
      .send({ identifier: 'admin@anvaya.health', password: 'Password123' });
    adminToken = adminRes.body.data.tokens.accessToken;

    // 2. Register User A
    const regResA = await request(app)
      .post(`${API}/auth/register`)
      .send({
        name: 'User A',
        email: emailA,
        phone: `+91981${String(Date.now()).slice(-7)}`,
        password,
        role: 'PATIENT',
        dob: '1992-01-01',
        gender: 'FEMALE',
        address: '101 Apple St',
      });
    userAToken = regResA.body.data.tokens.accessToken;
    userARefreshToken = regResA.body.data.tokens.refreshToken;

    // 3. Register User B
    const regResB = await request(app)
      .post(`${API}/auth/register`)
      .send({
        name: 'User B',
        email: emailB,
        phone: `+91982${String(Date.now()).slice(-7)}`,
        password,
        role: 'PATIENT',
        dob: '1993-02-02',
        gender: 'MALE',
        address: '102 Banana Rd',
      });
    userBToken = regResB.body.data.tokens.accessToken;
    userBRefreshToken = regResB.body.data.tokens.refreshToken;
    userBId = regResB.body.data.user.id;
  });

  afterAll(() => {
    inMemoryDb.clearPersistedRefreshTokens();
  });

  it('User A logs out, revoking User A refresh token (sets revokedAt)', async () => {
    const logoutRes = await request(app)
      .post(`${API}/auth/logout`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ refreshToken: userARefreshToken });
    expect(logoutRes.status).toBe(200);

    // Immediate check before restart: User A refresh token fails
    const refFail = await request(app)
      .post(`${API}/auth/refresh`)
      .send({ refreshToken: userARefreshToken });
    expect(refFail.status).toBe(401);
  });

  it('Simulates a server restart and verifies User A token REMAINS REVOKED while User B token REMAINS ACTIVE', async () => {
    // -------------------------------------------------------------
    // Simulate server reboot by instantiating a completely fresh app
    // and reloading persisted refresh token store from disk
    // -------------------------------------------------------------
    inMemoryDb.loadPersistedRefreshTokens();
    const restartedApp = createApp();

    // 1. User A (revoked prior to reboot) must FAIL with 401 Unauthorized
    const resA = await request(restartedApp)
      .post(`${API}/auth/refresh`)
      .send({ refreshToken: userARefreshToken });
    expect(resA.status).toBe(401);
    expect(resA.body.message).toMatch(/invalid or expired refresh token/i);

    // 2. User B (not revoked prior to reboot) must SUCCEED with 200 OK
    const resB = await request(restartedApp)
      .post(`${API}/auth/refresh`)
      .send({ refreshToken: userBRefreshToken });
    expect(resB.status).toBe(200);
    expect(resB.body.success).toBe(true);
    expect(resB.body.data.tokens.accessToken).toBeDefined();
    expect(resB.body.data.tokens.refreshToken).toBeDefined();

    // Update User B's active refresh token to the rotated token
    userBRefreshToken = resB.body.data.tokens.refreshToken;
  });

  it('Admin suspends User B and a subsequent server restart ALSO preserves the suspension revocation', async () => {
    // Admin suspends User B
    const susRes = await request(app)
      .post(`${API}/admin/users/${userBId}/suspend`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Security check' });
    expect(susRes.status).toBe(200);

    // Simulate another server restart
    inMemoryDb.loadPersistedRefreshTokens();
    const restartedApp2 = createApp();

    // User B rotated refresh token must now be rejected with 401 across the restart
    const resBAfterRestart = await request(restartedApp2)
      .post(`${API}/auth/refresh`)
      .send({ refreshToken: userBRefreshToken });
    expect(resBAfterRestart.status).toBe(401);
  });
});
