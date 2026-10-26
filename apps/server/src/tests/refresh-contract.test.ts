import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { connectDatabase } from '../config/prisma';

const app = createApp();
const API = '/api/v1';

describe('FLAG-06: Standardize /auth/refresh Response Shape with { data: { tokens: {...} } }', () => {
  const ts = Date.now();
  const testEmail = `contract.${ts}@test.anvaya`;
  const testPassword = 'Password123';
  let currentRefreshToken = '';

  beforeAll(async () => {
    if (process.env.TEST_DB === 'postgres') {
      await connectDatabase();
    }

    const regRes = await request(app)
      .post(`${API}/auth/register`)
      .send({
        name: 'Contract Test User',
        email: testEmail,
        phone: `+91950${String(ts).slice(-7)}`,
        password: testPassword,
        role: 'PATIENT',
        dob: '1995-05-05',
        gender: 'MALE',
        address: '10 Contract Rd',
      });

    expect(regRes.status).toBe(201);
    expect(regRes.body.data.tokens).toBeDefined();
    currentRefreshToken = regRes.body.data.tokens.refreshToken;
  });

  it('POST /auth/refresh returns consistent { data: { tokens: { accessToken, refreshToken } } } shape', async () => {
    const res = await request(app)
      .post(`${API}/auth/refresh`)
      .send({ refreshToken: currentRefreshToken });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // FLAG-06 requirement: tokens wrapper must exist inside data
    expect(res.body.data.tokens).toBeDefined();
    expect(res.body.data.tokens.accessToken).toBeDefined();
    expect(res.body.data.tokens.refreshToken).toBeDefined();

    currentRefreshToken = res.body.data.tokens.refreshToken;
  });

  it('Web client token parsing logic correctly extracts tokens from refresh response', async () => {
    const refRes = await request(app)
      .post(`${API}/auth/refresh`)
      .send({ refreshToken: currentRefreshToken });

    expect(refRes.status).toBe(200);
    const responseData = refRes.body;
    // Web client parser logic
    const tokens = responseData.data?.tokens || responseData.data;
    const newAccessToken = tokens?.accessToken;
    const newRefreshToken = tokens?.refreshToken;

    expect(newAccessToken).toBeTruthy();
    expect(newRefreshToken).toBeTruthy();

    currentRefreshToken = newRefreshToken;
  });

  it('Mobile client token parsing logic correctly extracts tokens from refresh response', async () => {
    const refRes = await request(app)
      .post(`${API}/auth/refresh`)
      .send({ refreshToken: currentRefreshToken });

    expect(refRes.status).toBe(200);
    const data = refRes.body?.data;
    // Mobile client parser logic
    const tokens = data?.tokens || data;
    const newAccessToken = tokens?.accessToken;
    const newRefreshToken = tokens?.refreshToken;

    expect(newAccessToken).toBeTruthy();
    expect(newRefreshToken).toBeTruthy();
  });
});
