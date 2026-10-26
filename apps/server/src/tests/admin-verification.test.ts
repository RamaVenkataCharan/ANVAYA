/**
 * Integration Test: Admin Verification, User Management & Audit Flow
 *
 * Sequence tested:
 *   1. Admin authentication & route security guards (401 unauthenticated, 403 non-admin)
 *   2. Provider registration (Doctor & Shop)
 *   3. Admin inspection of pending verifications (GET /admin/pending-verifications)
 *   4. Doctor approval (POST /admin/verify/doctor/:id with APPROVED)
 *   5. Doctor rejection with mandatory reason (POST /admin/verify/doctor/:id with REJECTED)
 *   6. Shop approval (POST /admin/verify/shop/:id with APPROVED)
 *   7. Shop rejection with mandatory reason (POST /admin/verify/shop/:id with REJECTED)
 *   8. System stats dashboard (GET /admin/stats)
 *   9. User directory search, filtering & privacy guard (no diagnoses/medical reports)
 *  10. User account suspension and reactivation guards (prevents suspended login)
 *  11. Paginated Audit trail & Verification history ("who approved what and when")
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { createApp } from '../app';
import { connectDatabase, disconnectDatabase, prisma } from '../config/prisma';

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

let adminToken = '';
let doctorToken = '';
let pendingDocId1 = '';
let pendingDocId2 = '';
let pendingShopId1 = '';
let pendingShopId2 = '';
let testUserIdToSuspend = '';
let testUserEmail = '';

describe('Admin Verification & Management Suite', () => {
  // ── Step 1: Authentication & Route Protection ──
  describe('Step 1 — Admin Authentication & Guard Enforcement', () => {
    it('Blocks unauthenticated requests to admin endpoints with 401', async () => {
      const res = await request(app).get(`${API}/admin/stats`);
      expect(res.status).toBe(401);
    });

    it('Admin logs in successfully with ADMIN role', async () => {
      const res = await request(app)
        .post(`${API}/auth/login`)
        .send({ identifier: 'admin@anvaya.health', password: 'Password123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('ADMIN');
      adminToken = res.body.data.tokens.accessToken;
      expect(adminToken).toBeTruthy();
    });

    it('Registers a regular Doctor for non-admin permission testing', async () => {
      const docEmail = `doc.guard.${Date.now()}@test.anvaya`;
      const res = await request(app)
        .post(`${API}/auth/register`)
        .send({
          name: 'Dr. Guard Test',
          email: docEmail,
          phone: `+91811${String(Date.now()).slice(-7)}`,
          password: 'Password123',
          role: 'DOCTOR',
          specialization: 'General Medicine',
          registrationNo: `MCI-${Date.now()}`,
          clinicAddress: '123 Medical Center, Hyderabad',
        });

      expect(res.status).toBe(201);
      doctorToken = res.body.data.tokens.accessToken;
      testUserIdToSuspend = res.body.data.user.id;
      testUserEmail = docEmail;
    });

    it('Rejects non-admin user trying to access admin endpoints with 403 Forbidden', async () => {
      const res = await request(app)
        .get(`${API}/admin/stats`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  // ── Step 2: Provider Registrations for Verification ──
  describe('Step 2 — Doctor & Shop Verification Flow', () => {
    it('Registers Doctor 1 (to be APPROVED)', async () => {
      const res = await request(app)
        .post(`${API}/auth/register`)
        .send({
          name: 'Dr. Approve Target',
          email: `doc.approve.${Date.now()}@test.anvaya`,
          phone: `+91812${String(Date.now()).slice(-7)}`,
          password: 'Password123',
          role: 'DOCTOR',
          specialization: 'Pediatrics',
          registrationNo: `MCI-APP-${Date.now()}`,
          clinicAddress: 'Children Hospital, Suite 10, Hyderabad',
        });

      expect(res.status).toBe(201);
      pendingDocId1 = res.body.data.user.doctorProfile.id;
      expect(res.body.data.user.doctorProfile.verificationStatus).toBe('PENDING');
    });

    it('Registers Doctor 2 (to be REJECTED)', async () => {
      const res = await request(app)
        .post(`${API}/auth/register`)
        .send({
          name: 'Dr. Reject Target',
          email: `doc.reject.${Date.now()}@test.anvaya`,
          phone: `+91813${String(Date.now()).slice(-7)}`,
          password: 'Password123',
          role: 'DOCTOR',
          specialization: 'Dermatology',
          registrationNo: `MCI-REJ-${Date.now()}`,
          clinicAddress: 'Skin Care Center, Hyderabad',
        });

      expect(res.status).toBe(201);
      pendingDocId2 = res.body.data.user.doctorProfile.id;
      expect(res.body.data.user.doctorProfile.verificationStatus).toBe('PENDING');
    });

    it('Registers Pharmacy Shop 1 (to be APPROVED)', async () => {
      const res = await request(app)
        .post(`${API}/auth/register`)
        .send({
          name: 'Pharmacist One',
          email: `shop.approve.${Date.now()}@test.anvaya`,
          phone: `+91814${String(Date.now()).slice(-7)}`,
          password: 'Password123',
          role: 'SHOP',
          shopName: 'MedLife Pharmacy One',
          licenseNo: `DL-APP-${Date.now()}`,
          address: 'Main Road, Jubilee Hills, Hyderabad',
          timings: '08:00 AM - 11:00 PM',
        });

      expect(res.status).toBe(201);
      pendingShopId1 = res.body.data.user.shopProfile.id;
      expect(res.body.data.user.shopProfile.verificationStatus).toBe('PENDING');
    });

    it('Registers Pharmacy Shop 2 (to be REJECTED)', async () => {
      const res = await request(app)
        .post(`${API}/auth/register`)
        .send({
          name: 'Pharmacist Two',
          email: `shop.reject.${Date.now()}@test.anvaya`,
          phone: `+91815${String(Date.now()).slice(-7)}`,
          password: 'Password123',
          role: 'SHOP',
          shopName: 'MedLife Pharmacy Two',
          licenseNo: `DL-REJ-${Date.now()}`,
          address: 'Banjara Hills, Hyderabad',
          timings: '09:00 AM - 09:00 PM',
        });

      expect(res.status).toBe(201);
      pendingShopId2 = res.body.data.user.shopProfile.id;
      expect(res.body.data.user.shopProfile.verificationStatus).toBe('PENDING');
    });

    it('Admin lists pending verifications via GET /admin/pending-verifications', async () => {
      const res = await request(app)
        .get(`${API}/admin/pending-verifications`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.doctors).toBeInstanceOf(Array);
      expect(res.body.data.shops).toBeInstanceOf(Array);

      const doc1 = res.body.data.doctors.find((d: any) => d.id === pendingDocId1);
      const doc2 = res.body.data.doctors.find((d: any) => d.id === pendingDocId2);
      const shop1 = res.body.data.shops.find((s: any) => s.id === pendingShopId1);
      const shop2 = res.body.data.shops.find((s: any) => s.id === pendingShopId2);

      expect(doc1).toBeTruthy();
      expect(doc2).toBeTruthy();
      expect(shop1).toBeTruthy();
      expect(shop2).toBeTruthy();
    });

    it('Admin APPROVES Doctor 1', async () => {
      const res = await request(app)
        .post(`${API}/admin/verify/doctor/${pendingDocId1}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'APPROVED' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.verificationStatus).toBe('APPROVED');
      expect(res.body.data.verifiedAt).toBeTruthy();
    });

    it('Admin REJECTS Doctor 2 with reason', async () => {
      const reason = 'Medical Council registration could not be verified against the state register';
      const res = await request(app)
        .post(`${API}/admin/verify/doctor/${pendingDocId2}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'REJECTED',
          reason,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.verificationStatus).toBe('REJECTED');
      expect(res.body.data.rejectionReason).toBe(reason);
    });

    it('Admin APPROVES Shop 1', async () => {
      const res = await request(app)
        .post(`${API}/admin/verify/shop/${pendingShopId1}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'APPROVED' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.verificationStatus).toBe('APPROVED');
      expect(res.body.data.verifiedAt).toBeTruthy();
    });

    it('Admin REJECTS Shop 2 with reason', async () => {
      const reason = 'Drug license certificate has expired';
      const res = await request(app)
        .post(`${API}/admin/verify/shop/${pendingShopId2}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'REJECTED',
          reason,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.verificationStatus).toBe('REJECTED');
      expect(res.body.data.rejectionReason).toBe(reason);
    });
  });

  // ── Step 3: Stats Dashboard ──
  describe('Step 3 — System Statistics', () => {
    it('Admin retrieves system counts via GET /admin/stats', async () => {
      const res = await request(app)
        .get(`${API}/admin/stats`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const stats = res.body.data;
      expect(typeof stats.totalUsers).toBe('number');
      expect(typeof stats.totalDoctors).toBe('number');
      expect(typeof stats.totalShops).toBe('number');
      expect(typeof stats.totalPatients).toBe('number');
      expect(typeof stats.pendingDoctorApprovals).toBe('number');
      expect(typeof stats.pendingShopApprovals).toBe('number');
      expect(typeof stats.totalPrescriptions).toBe('number');
      expect(typeof stats.dispensedPrescriptions).toBe('number');
      expect(typeof stats.totalBills).toBe('number');
    });
  });

  // ── Step 4: User Directory & Privacy Guard ──
  describe('Step 4 — User Directory Search, Filtering & Privacy', () => {
    it('Admin queries users with search, role filter, and pagination', async () => {
      const res = await request(app)
        .get(`${API}/admin/users?role=DOCTOR&search=Approve&page=1&limit=10`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.users).toBeInstanceOf(Array);
      expect(res.body.data.pagination).toBeDefined();

      const user = res.body.data.users.find((u: any) => u.name.includes('Approve'));
      expect(user).toBeTruthy();
      expect(user.role).toBe('DOCTOR');
      expect(user.doctorProfile).toBeDefined();
      expect(user.doctorProfile.verificationStatus).toBe('APPROVED');

      // CRITICAL PRIVACY GUARD: Verify no diagnosis or medical content is ever returned
      res.body.data.users.forEach((u: any) => {
        expect(u.diagnosis).toBeUndefined();
        expect(u.prescriptions).toBeUndefined();
        expect(u.reports).toBeUndefined();
        expect(u.fileUrl).toBeUndefined();
      });
    });

    it('Admin suspends a user account', async () => {
      const res = await request(app)
        .post(`${API}/admin/users/${testUserIdToSuspend}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Compliance audit pending' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isActive).toBe(false);
    });

    it('Suspended user is prevented from logging in', async () => {
      const res = await request(app)
        .post(`${API}/auth/login`)
        .send({ identifier: testUserEmail, password: 'Password123' });

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('deactivated');
    });

    it('Admin reactivates the suspended user', async () => {
      const res = await request(app)
        .post(`${API}/admin/users/${testUserIdToSuspend}/reactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Compliance cleared' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isActive).toBe(true);
    });

    it('Reactivated user can log in again successfully', async () => {
      const res = await request(app)
        .post(`${API}/auth/login`)
        .send({ identifier: testUserEmail, password: 'Password123' });

      expect(res.status).toBe(200);
      expect(res.body.data.tokens.accessToken).toBeTruthy();
    });
  });

  // ── Step 5: Audit Log & Verification History ──
  describe('Step 5 — Audit Trail & Verification Accountability', () => {
    it('GET /admin/audit returns paginated logs with action filter', async () => {
      const res = await request(app)
        .get(`${API}/admin/audit?action=DOCTOR_VERIFIED&page=1&limit=10`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.logs).toBeInstanceOf(Array);
      expect(res.body.data.pagination).toBeDefined();

      const verifiedLog = res.body.data.logs.find(
        (log: any) => log.action === 'DOCTOR_VERIFIED' && log.resourceId === pendingDocId1
      );
      expect(verifiedLog).toBeTruthy();
      expect(verifiedLog.user).toBeDefined(); // Shows who performed the verification
      expect(verifiedLog.user.role).toBe('ADMIN');
    });

    it('GET /admin/verifications/history returns who approved what and when', async () => {
      const res = await request(app)
        .get(`${API}/admin/verifications/history`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);

      const docApproval = res.body.data.find(
        (v: any) => v.resourceId === pendingDocId1 && v.status === 'APPROVED'
      );
      const docRejection = res.body.data.find(
        (v: any) => v.resourceId === pendingDocId2 && v.status === 'REJECTED'
      );

      expect(docApproval).toBeTruthy();
      expect(docApproval.verifiedBy).toBeDefined();
      expect(docApproval.verifiedBy.name).toBeTruthy();
      expect(docApproval.verifiedAt).toBeTruthy();

      expect(docRejection).toBeTruthy();
      expect(docRejection.rejectionReason).toContain('Medical Council');
    });
  });
});
