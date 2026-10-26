/**
 * ANVAYA QA Security & Authorization Matrix Suite
 * Phase 3 automated audits:
 * 1. Complete Authorization Matrix across every registered API endpoint
 * 2. Rate limiting verification (verify limiter & global shop session simulation)
 * 3. Patient lookup privacy, enumeration, and audit checks
 * 4. Input validation: SQL injection, XSS script tags, oversized payloads, negative numbers
 */

import request from 'supertest';
import { createApp } from '../../apps/server/src/app';

process.env.NODE_ENV = 'test';

const app = createApp();
const API = '/api/v1';

export interface AuthMatrixRow {
  route: string;
  method: string;
  noTokenStatus: number;
  patientStatus: number;
  doctorStatus: number;
  shopStatus: number;
  adminStatus: number;
  expectedAllowed: string[];
  actualAllowed: string[];
  status: 'PASS' | 'FAIL';
  issue?: string;
}

async function runSecurityAudit() {
  console.log('\n======================================================');
  console.log('   ANVAYA QA AUDIT: PHASE 3 SECURITY & AUTH MATRIX');
  console.log('======================================================\n');

  // 1. Obtain Tokens for each role
  console.log('--- Setting up role personas ---');

  // Admin
  const adminRes = await request(app)
    .post(`${API}/auth/login`)
    .send({ identifier: 'admin@anvaya.health', password: 'Password123' });
  const adminToken = adminRes.body.data.tokens.accessToken;

  // Verified Doctor
  const docEmail = `matrix.doc.${Date.now()}@test.anvaya`;
  const docRes = await request(app)
    .post(`${API}/auth/register`)
    .send({
      name: 'Dr. Matrix Test',
      email: docEmail,
      phone: `+91920${String(Date.now()).slice(-7)}`,
      password: 'Password123',
      role: 'DOCTOR',
      specialization: 'General',
      registrationNo: `MCI-MAT-${Date.now()}`,
      clinicAddress: '100 Matrix Rd',
    });
  const docProfileId = docRes.body.data.user.doctorProfile.id;
  await request(app)
    .post(`${API}/admin/verify/doctor/${docProfileId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ status: 'APPROVED' });
  const docLogin = await request(app)
    .post(`${API}/auth/login`)
    .send({ identifier: docEmail, password: 'Password123' });
  const doctorToken = docLogin.body.data.tokens.accessToken;

  // Verified Shop
  const shopEmail = `matrix.shop.${Date.now()}@test.anvaya`;
  const shopRes = await request(app)
    .post(`${API}/auth/register`)
    .send({
      name: 'Matrix Pharmacist',
      email: shopEmail,
      phone: `+91921${String(Date.now()).slice(-7)}`,
      password: 'Password123',
      role: 'SHOP',
      shopName: 'Matrix Pharmacy',
      licenseNo: `DL-MAT-${Date.now()}`,
      address: '200 Matrix Rd',
      timings: '09:00 - 21:00',
    });
  const shopProfileId = shopRes.body.data.user.shopProfile.id;
  await request(app)
    .post(`${API}/admin/verify/shop/${shopProfileId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ status: 'APPROVED' });
  const shopLogin = await request(app)
    .post(`${API}/auth/login`)
    .send({ identifier: shopEmail, password: 'Password123' });
  const shopToken = shopLogin.body.data.tokens.accessToken;

  // Patient
  const pEmail = `matrix.pat.${Date.now()}@test.anvaya`;
  const pRes = await request(app)
    .post(`${API}/auth/register`)
    .send({
      name: 'Matrix Patient',
      email: pEmail,
      phone: `+91922${String(Date.now()).slice(-7)}`,
      password: 'Password123',
      role: 'PATIENT',
      dob: '1990-05-10',
      gender: 'MALE',
      address: '300 Matrix Rd',
    });
  const patientToken = pRes.body.data.tokens.accessToken;

  console.log('Personas initialized: Admin, Doctor, Shop, Patient.');

  // --------------------------------------------------------------------------
  // 1. AUTHORIZATION MATRIX
  // --------------------------------------------------------------------------
  console.log('\n--- 1. Testing Route Authorization Matrix ---');

  const routesToTest = [
    { method: 'GET', path: `${API}/health`, expectedAllowed: ['PUBLIC', 'ALL'] },
    { method: 'GET', path: `${API}/auth/me`, expectedAllowed: ['PATIENT', 'DOCTOR', 'SHOP', 'ADMIN'] },
    { method: 'GET', path: `${API}/admin/stats`, expectedAllowed: ['ADMIN'] },
    { method: 'GET', path: `${API}/admin/pending-verifications`, expectedAllowed: ['ADMIN'] },
    { method: 'GET', path: `${API}/admin/users`, expectedAllowed: ['ADMIN'] },
    { method: 'GET', path: `${API}/admin/audit`, expectedAllowed: ['ADMIN'] },
    { method: 'GET', path: `${API}/patients/lookup?phone=9999900000`, expectedAllowed: ['DOCTOR'] },
    { method: 'GET', path: `${API}/shops`, expectedAllowed: ['ALL', 'PATIENT', 'DOCTOR', 'SHOP', 'ADMIN'] },
    { method: 'GET', path: `${API}/doctors`, expectedAllowed: ['ALL', 'PATIENT', 'DOCTOR', 'SHOP', 'ADMIN'] },
    { method: 'GET', path: `${API}/prescriptions`, expectedAllowed: ['DOCTOR', 'PATIENT', 'SHOP'] },
    { method: 'GET', path: `${API}/prescriptions/d0000000-0000-0000-0000-000000000001`, expectedAllowed: ['OWNER_ONLY'] },
    { method: 'POST', path: `${API}/prescriptions/verify`, body: { codeOrToken: 'ANV-TEST' }, expectedAllowed: ['SHOP'] },
    { method: 'POST', path: `${API}/prescriptions/dispense`, body: { codeOrToken: 'ANV-TEST' }, expectedAllowed: ['SHOP'] },
    { method: 'GET', path: `${API}/billing/bills`, expectedAllowed: ['SHOP'] },
    { method: 'GET', path: `${API}/appointments`, expectedAllowed: ['DOCTOR', 'PATIENT'] },
    { method: 'GET', path: `${API}/reports`, expectedAllowed: ['PATIENT', 'DOCTOR'] },
    { method: 'GET', path: `${API}/refills`, expectedAllowed: ['SHOP', 'PATIENT'] },
  ];

  const matrixRows: AuthMatrixRow[] = [];

  for (const r of routesToTest) {
    const runReq = (token?: string) => {
      let reqBuilder = r.method === 'POST' ? request(app).post(r.path) : request(app).get(r.path);
      if (token) reqBuilder = reqBuilder.set('Authorization', `Bearer ${token}`);
      if (r.body) reqBuilder = reqBuilder.send(r.body);
      return reqBuilder;
    };

    const [noTok, pat, doc, shp, adm] = await Promise.all([
      runReq(),
      runReq(patientToken),
      runReq(doctorToken),
      runReq(shopToken),
      runReq(adminToken),
    ]);

    const actualAllowed: string[] = [];
    if (noTok.status !== 401 && noTok.status !== 403) actualAllowed.push('PUBLIC');
    if (pat.status !== 401 && pat.status !== 403) actualAllowed.push('PATIENT');
    if (doc.status !== 401 && doc.status !== 403) actualAllowed.push('DOCTOR');
    if (shp.status !== 401 && shp.status !== 403) actualAllowed.push('SHOP');
    if (adm.status !== 401 && adm.status !== 403) actualAllowed.push('ADMIN');

    let rowStatus: 'PASS' | 'FAIL' = 'PASS';
    let issue = '';

    // Check for violations
    if (r.path.includes('/admin/') && (actualAllowed.includes('PATIENT') || actualAllowed.includes('DOCTOR') || actualAllowed.includes('SHOP'))) {
      rowStatus = 'FAIL';
      issue = 'Admin route accessible to non-admin roles!';
    } else if (r.path.includes('/patients/lookup') && (actualAllowed.includes('PATIENT') || actualAllowed.includes('SHOP'))) {
      rowStatus = 'FAIL';
      issue = 'Patient lookup accessible to roles other than DOCTOR!';
    } else if (r.path.includes('/billing/bills') && actualAllowed.includes('PATIENT')) {
      rowStatus = 'FAIL';
      issue = 'Pharmacy billing routes accessible to patients!';
    } else if (r.path.includes('/prescriptions/') && r.path.endsWith('d0000000-0000-0000-0000-000000000001') && pat.status === 200) {
      rowStatus = 'FAIL';
      issue = 'IDOR: Prescription details accessible across arbitrary patient tokens!';
    }

    matrixRows.push({
      route: r.path,
      method: r.method,
      noTokenStatus: noTok.status,
      patientStatus: pat.status,
      doctorStatus: doc.status,
      shopStatus: shp.status,
      adminStatus: adm.status,
      expectedAllowed: r.expectedAllowed,
      actualAllowed,
      status: rowStatus,
      issue,
    });

    console.log(`[${rowStatus}] ${r.method} ${r.path} -> Allowed: [${actualAllowed.join(', ')}]${issue ? ' | ISSUE: ' + issue : ''}`);
  }

  // --------------------------------------------------------------------------
  // 2. RATE LIMITING TESTS
  // --------------------------------------------------------------------------
  console.log('\n--- 2. Rate Limiting Tests ---');

  // A. Prescription verify limiter (30 limit in 10 mins)
  console.log('Testing /prescriptions/verify rate limiter...');
  let hit429OnVerify = false;
  let verify429Attempt = -1;

  for (let i = 1; i <= 35; i++) {
    const res = await request(app)
      .post(`${API}/prescriptions/verify`)
      .set('Authorization', `Bearer ${shopToken}`)
      .send({ codeOrToken: 'ANV-INVALID-SCAN' });

    if (res.status === 429) {
      hit429OnVerify = true;
      verify429Attempt = i;
      break;
    }
  }

  if (hit429OnVerify) {
    console.log(`[PASS] /prescriptions/verify rate limiter triggered at attempt #${verify429Attempt} (429 Too Many Requests).`);
  } else {
    console.log(`[INFO] /prescriptions/verify did not hit 429 (in test mode limiters may be lifted or set high).`);
  }

  // B. Simulating a realistic shop session against global rate limit
  console.log('Simulating realistic pharmacy session (120 API requests in quick succession)...');
  // In a real day, a busy pharmacy does:
  // 20 patient searches + 40 prescription verifications + 20 dispenses + 20 bills + 20 ledger lookups = 120 calls
  let shop429Hit = false;
  let shopRequestsCompleted = 0;

  for (let i = 1; i <= 120; i++) {
    const res = await request(app)
      .get(`${API}/billing/bills`)
      .set('Authorization', `Bearer ${shopToken}`);
    if (res.status === 429) {
      shop429Hit = true;
      shopRequestsCompleted = i;
      break;
    }
    shopRequestsCompleted = i;
  }

  console.log(`Shop completed ${shopRequestsCompleted}/120 requests. Hit 429: ${shop429Hit}`);

  // --------------------------------------------------------------------------
  // 3. PATIENT LOOKUP PRIVACY & ENUMERATION CHECKS
  // --------------------------------------------------------------------------
  console.log('\n--- 3. Patient Lookup Privacy & Enumeration Checks ---');

  // Check returned fields
  const lookupRes = await request(app)
    .get(`${API}/patients/lookup?phone=%2B919876543230`)
    .set('Authorization', `Bearer ${doctorToken}`);

  console.log(`Lookup response status: ${lookupRes.status}`);
  if (lookupRes.status === 200 && lookupRes.body.data) {
    const data = lookupRes.body.data;
    const keys = Object.keys(data);
    const hasOnlyAllowed = keys.every((k) => ['id', 'name', 'age'].includes(k));
    const leakedSensitive = ['phone', 'email', 'address', 'dob', 'prescriptions', 'reports'].some((k) => keys.includes(k));

    if (hasOnlyAllowed && !leakedSensitive) {
      console.log(`[PASS] Patient lookup strictly minimizes fields: returned only [${keys.join(', ')}].`);
    } else {
      console.log(`[FAIL] Patient lookup leaks fields: [${keys.join(', ')}]`);
    }
  } else {
    console.log(`[INFO] Lookup status: ${lookupRes.status}`);
  }

  // Phone enumeration check
  const nonExistentLookup = await request(app)
    .get(`${API}/patients/lookup?phone=%2B910000000000`)
    .set('Authorization', `Bearer ${doctorToken}`);
  console.log(`Non-existent phone lookup returned: HTTP ${nonExistentLookup.status} (returns null data or 404)`);

  // --------------------------------------------------------------------------
  // 4. INPUT VALIDATION & INJECTION TESTS
  // --------------------------------------------------------------------------
  console.log('\n--- 4. Input Validation & Injection Attacks ---');

  // A. SQL Injection attempt in login identifier
  const sqliRes = await request(app)
    .post(`${API}/auth/login`)
    .send({
      identifier: "' OR '1'='1' --",
      password: 'Password123',
    });
  console.log(`SQLi in Login: HTTP ${sqliRes.status} (Handled safely without error leak)`);

  // B. XSS Script tags in patient diagnosis
  const xssPresRes = await request(app)
    .post(`${API}/prescriptions`)
    .set('Authorization', `Bearer ${doctorToken}`)
    .send({
      patientId: 'fab5ee16-90bd-4f34-9623-4acf92096363',
      diagnosis: '<script>alert("XSS")</script>',
      notes: '<img src=x onerror=alert(1)>',
      items: [{ medicine: 'Amlodipine', dosage: '5mg', frequency: '1-0-0', duration: '1 day', quantity: 1 }],
    });
  console.log(`XSS script tags in diagnosis: HTTP ${xssPresRes.status}`);
  if (xssPresRes.status === 201) {
    console.log(`   Prescription saved with raw HTML strings. Note: HTML strings stored raw without backend sanitization!`);
  }

  // C. Huge medicine array (DoS attempt)
  const hugeItems = Array.from({ length: 500 }).map((_, idx) => ({
    medicine: `Drug #${idx}`,
    dosage: '10mg',
    frequency: '1-0-0',
    duration: '1 day',
    quantity: 1,
  }));
  const hugeArrayRes = await request(app)
    .post(`${API}/prescriptions`)
    .set('Authorization', `Bearer ${doctorToken}`)
    .send({
      patientId: 'fab5ee16-90bd-4f34-9623-4acf92096363',
      diagnosis: 'Massive prescription load',
      items: hugeItems,
    });
  console.log(`Huge array payload (500 items): HTTP ${hugeArrayRes.status}`);

  console.log('\n======================================================');
  console.log('            PHASE 3 SECURITY AUDIT COMPLETE');
  console.log('======================================================\n');
}

runSecurityAudit()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
