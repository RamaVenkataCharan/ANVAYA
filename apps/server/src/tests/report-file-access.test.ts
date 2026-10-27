import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';

const app = createApp();
const API = '/api/v1';

describe('FLAG-DEV-02 / FLAG-SEC-04: Report File Streaming & Consent Access Gate', () => {
  let patient1Token = '';
  let patient1Id = '';
  let patient2Token = '';
  let doctorToken = '';
  let doctorProfileId = '';
  let adminToken = '';
  let uploadedReportId = '';

  const ts = Date.now();

  beforeAll(async () => {
    // 1. Admin login
    const adminRes = await request(app).post(`${API}/auth/login`).send({
      identifier: 'admin@anvaya.health',
      password: 'Password123',
    });
    adminToken = adminRes.body.data.tokens.accessToken;

    // 2. Register Patient 1
    const p1Res = await request(app).post(`${API}/auth/register`).send({
      name: 'Report Test Patient 1',
      email: `p1.report.${ts}@test.anvaya`,
      phone: `+91971${String(ts).slice(-7)}`,
      password: 'Password123',
      role: 'PATIENT',
      dob: '1990-01-01',
      gender: 'MALE',
      address: 'Hyderabad',
    });
    patient1Token = p1Res.body.data.tokens.accessToken;
    patient1Id = p1Res.body.data.user.patientProfile.id;

    // 3. Register Patient 2
    const p2Res = await request(app).post(`${API}/auth/register`).send({
      name: 'Report Test Patient 2',
      email: `p2.report.${ts}@test.anvaya`,
      phone: `+91972${String(ts).slice(-7)}`,
      password: 'Password123',
      role: 'PATIENT',
      dob: '1992-02-02',
      gender: 'FEMALE',
      address: 'Secunderabad',
    });
    patient2Token = p2Res.body.data.tokens.accessToken;

    // 4. Register & Approve Doctor
    const docRes = await request(app).post(`${API}/auth/register`).send({
      name: 'Dr. Report Reviewer',
      email: `doc.report.${ts}@test.anvaya`,
      phone: `+91973${String(ts).slice(-7)}`,
      password: 'Password123',
      role: 'DOCTOR',
      specialization: 'Internal Medicine',
      registrationNo: `MCI-REP-${ts}`,
      clinicAddress: 'Care Hospital',
    });
    const docTempToken = docRes.body.data.tokens.accessToken;
    doctorProfileId = docRes.body.data.user.doctorProfile.id;

    await request(app)
      .post(`${API}/admin/verify/doctor/${doctorProfileId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED' });

    const docLogin = await request(app).post(`${API}/auth/login`).send({
      identifier: `doc.report.${ts}@test.anvaya`,
      password: 'Password123',
    });
    doctorToken = docLogin.body.data.tokens.accessToken;

    // 5. Patient 1 uploads a real PDF file
    const uploadRes = await request(app)
      .post(`${API}/reports/upload`)
      .set('Authorization', `Bearer ${patient1Token}`)
      .field('title', 'CBC Blood Report')
      .field('type', 'LAB_REPORT')
      .field('notes', 'Routine annual checkup')
      .attach('file', Buffer.from('%PDF-1.4 sample clinical content'), 'cbc_test.pdf');

    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body.data.id).toBeTruthy();
    uploadedReportId = uploadRes.body.data.id;
  });

  it('unauthenticated request fails with 401 Unauthorized', async () => {
    const res = await request(app).get(`${API}/reports/${uploadedReportId}/file`);
    expect(res.status).toBe(401);
  });

  it('Patient 1 (owner) can stream their own report file (200 OK)', async () => {
    const res = await request(app)
      .get(`${API}/reports/${uploadedReportId}/file`)
      .set('Authorization', `Bearer ${patient1Token}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.body.toString()).toContain('%PDF-1.4 sample clinical content');
  });

  it('Patient 2 (unrelated patient) cannot stream Patient 1 report file (403 Forbidden)', async () => {
    const res = await request(app)
      .get(`${API}/reports/${uploadedReportId}/file`)
      .set('Authorization', `Bearer ${patient2Token}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('ForbiddenError');
  });

  it('Doctor without consent cannot stream Patient 1 report file (403 Forbidden)', async () => {
    const res = await request(app)
      .get(`${API}/reports/${uploadedReportId}/file`)
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('ForbiddenError');
  });

  it('Doctor WITH active consent can stream Patient 1 report file (200 OK)', async () => {
    // Patient 1 grants consent to Doctor
    const consentRes = await request(app)
      .post(`${API}/consent/grant`)
      .set('Authorization', `Bearer ${patient1Token}`)
      .send({
        doctorId: doctorProfileId,
        notes: 'Access granted for medical review',
      });
    expect(consentRes.status).toBe(201);

    // Doctor streams file
    const res = await request(app)
      .get(`${API}/reports/${uploadedReportId}/file`)
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.body.toString()).toContain('%PDF-1.4 sample clinical content');
  });

  it('Doctor cannot stream report file after consent is revoked (403 Forbidden)', async () => {
    // Patient 1 revokes consent
    const revokeRes = await request(app)
      .post(`${API}/consent/revoke`)
      .set('Authorization', `Bearer ${patient1Token}`)
      .send({ doctorId: doctorProfileId });
    expect(revokeRes.status).toBe(200);

    // Doctor attempts stream again
    const res = await request(app)
      .get(`${API}/reports/${uploadedReportId}/file`)
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('ForbiddenError');
  });
});
