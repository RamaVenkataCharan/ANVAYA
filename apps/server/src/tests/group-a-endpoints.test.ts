import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { connectDatabase } from '../config/prisma';
import { Role } from '@anvaya/shared';

const app = createApp();
const API = '/api/v1';

describe('Group A: Account and System Endpoints (Tier B Suite)', () => {
  let docToken: string;
  let docUserId: string;
  let docProfileId: string;
  let patToken: string;
  let patUserId: string;
  let adminToken: string;
  const ts = Date.now();

  const docEmail = `doc.groupa.${ts}@test.anvaya`;
  const docPhone = `+91941${String(ts).slice(-7)}`;
  const patEmail = `pat.groupa.${ts}@test.anvaya`;
  const patPhone = `+91942${String(ts).slice(-7)}`;

  beforeAll(async () => {
    if (process.env.TEST_DB === 'postgres') {
      await connectDatabase();
    }

    // Login admin
    const adminLogin = await request(app)
      .post(`${API}/auth/login`)
      .send({ identifier: 'admin@anvaya.health', password: 'Password123' });
    adminToken = adminLogin.body.data.tokens.accessToken;

    // Register Doctor
    const regDoc = await request(app)
      .post(`${API}/auth/register`)
      .send({
        name: 'Dr. System Tester',
        email: docEmail,
        phone: docPhone,
        password: 'Password123',
        role: 'DOCTOR',
        specialization: 'Neurology',
        registrationNo: `MCI-GA-${ts}`,
        clinicAddress: '500 Health Way, Hyderabad',
      });
    expect(regDoc.status).toBe(201);
    docToken = regDoc.body.data.tokens.accessToken;
    docUserId = regDoc.body.data.user.id;
    docProfileId = regDoc.body.data.user.doctorProfile.id;

    // Register Patient
    const regPat = await request(app)
      .post(`${API}/auth/register`)
      .send({
        name: 'Patient System Tester',
        email: patEmail,
        phone: patPhone,
        password: 'Password123',
        role: 'PATIENT',
        dob: '1995-05-15',
        gender: 'MALE',
        address: '600 Citizen Rd, Hyderabad',
      });
    expect(regPat.status).toBe(201);
    patToken = regPat.body.data.tokens.accessToken;
    patUserId = regPat.body.data.user.id;
  });

  describe('A2: Forgot Password Flow (OTP request and verify)', () => {
    it('requests password reset OTP for registered user', async () => {
      const res = await request(app)
        .post(`${API}/auth/forgot-password/request`)
        .send({ identifier: docEmail });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('rejects password verification with incorrect OTP', async () => {
      const res = await request(app)
        .post(`${API}/auth/forgot-password/verify`)
        .send({
          identifier: docEmail,
          otp: '000000',
          newPassword: 'NewPassword123',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns constant response for non-existent identifier', async () => {
      const res = await request(app)
        .post(`${API}/auth/forgot-password/request`)
        .send({ identifier: 'nonexistent@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('If an account exists');
    });

    it('enforces max 5 wrong attempts before locking OTP', async () => {
      // Re-request OTP
      await request(app)
        .post(`${API}/auth/forgot-password/request`)
        .send({ identifier: patEmail });

      // 4 wrong attempts should fail with invalid code
      for (let i = 0; i < 4; i++) {
        const failRes = await request(app)
          .post(`${API}/auth/forgot-password/verify`)
          .send({
            identifier: patEmail,
            otp: '999999',
            newPassword: 'TestPassword123',
          });
        expect(failRes.status).toBe(400);
        expect(failRes.body.message).toContain('Invalid verification code');
      }

      // 5th wrong attempt should lock out
      const lockRes = await request(app)
        .post(`${API}/auth/forgot-password/verify`)
        .send({
          identifier: patEmail,
          otp: '999999',
          newPassword: 'TestPassword123',
        });
      expect(lockRes.status).toBe(400);
      expect(lockRes.body.message).toContain('Maximum verification attempts exceeded');
    });

    it('successfully resets password with valid dev OTP and enforces single use', async () => {
      // Re-request OTP for doc
      await request(app)
        .post(`${API}/auth/forgot-password/request`)
        .send({ identifier: docEmail });

      const res = await request(app)
        .post(`${API}/auth/forgot-password/verify`)
        .send({
          identifier: docEmail,
          otp: '123456',
          newPassword: 'NewPassword123',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify single use: reusing same OTP fails
      const reuseRes = await request(app)
        .post(`${API}/auth/forgot-password/verify`)
        .send({
          identifier: docEmail,
          otp: '123456',
          newPassword: 'NewPassword123',
        });
      expect(reuseRes.status).toBe(400);

      // Verify old token is now invalidated
      const oldCheck = await request(app)
        .get(`${API}/auth/me`)
        .set('Authorization', `Bearer ${docToken}`);
      expect(oldCheck.status).toBe(401);

      // Verify doctor can log in with new password
      const loginRes = await request(app)
        .post(`${API}/auth/login`)
        .send({ identifier: docEmail, password: 'NewPassword123' });
      expect(loginRes.status).toBe(200);
      docToken = loginRes.body.data.tokens.accessToken;
    });

    it('ensures DevConsoleOtpProvider refuses to run in production', async () => {
      const { DevConsoleOtpProvider } = await import('../services/otp/otpProvider');
      const provider = new DevConsoleOtpProvider();
      const prevEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        await expect(provider.sendOtp('+919999999999', '123456', 'PASSWORD_RESET')).rejects.toThrow(
          'DevConsoleOtpProvider is forbidden in production environment'
        );
      } finally {
        process.env.NODE_ENV = prevEnv;
      }
    });
  });

  describe('A3: Change Password Flow', () => {
    it('rejects password change if current password is wrong', async () => {
      const res = await request(app)
        .post(`${API}/auth/change-password`)
        .set('Authorization', `Bearer ${docToken}`)
        .send({
          currentPassword: 'WrongPassword!',
          newPassword: 'Password123',
        });

      expect(res.status).toBe(401);
    });

    it('successfully changes password and invalidates active sessions', async () => {
      const res = await request(app)
        .post(`${API}/auth/change-password`)
        .set('Authorization', `Bearer ${docToken}`)
        .send({
          currentPassword: 'NewPassword123',
          newPassword: 'Password123',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify old token is invalidated
      const checkOld = await request(app)
        .get(`${API}/auth/me`)
        .set('Authorization', `Bearer ${docToken}`);
      expect(checkOld.status).toBe(401);

      // Re-login doctor with new password
      const relogin = await request(app)
        .post(`${API}/auth/login`)
        .send({ identifier: docEmail, password: 'Password123' });
      expect(relogin.status).toBe(200);
      docToken = relogin.body.data.tokens.accessToken;
    });
  });

  describe('A3: Edit Profile Flow', () => {
    it('updates patient profile details', async () => {
      const res = await request(app)
        .patch(`${API}/users/profile`)
        .set('Authorization', `Bearer ${patToken}`)
        .send({
          name: 'Patient Updated Name',
          bloodGroup: 'B+',
          address: '777 New Lane, Hyderabad',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Patient Updated Name');
      expect(res.body.data.patientProfile.bloodGroup).toBe('B+');
      expect(res.body.data.patientProfile.address).toBe('777 New Lane, Hyderabad');
    });
  });

  describe('A4: Logout All Devices', () => {
    it('successfully revokes all sessions on logout-all', async () => {
      const res = await request(app)
        .post(`${API}/auth/logout-all`)
        .set('Authorization', `Bearer ${patToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify patToken is invalidated
      const oldCheck = await request(app)
        .get(`${API}/auth/me`)
        .set('Authorization', `Bearer ${patToken}`);
      expect(oldCheck.status).toBe(401);

      // Re-login patient for remaining tests
      const patLogin = await request(app)
        .post(`${API}/auth/login`)
        .send({ identifier: patEmail, password: 'Password123' });
      expect(patLogin.status).toBe(200);
      patToken = patLogin.body.data.tokens.accessToken;
    });
  });

  describe('A5: Notifications Inbox', () => {
    it('fetches notification list for authenticated user', async () => {
      const res = await request(app)
        .get(`${API}/notifications`)
        .set('Authorization', `Bearer ${docToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('marks notification as read', async () => {
      const res = await request(app)
        .post(`${API}/notifications/all/read`)
        .set('Authorization', `Bearer ${docToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('A6: Rejected Provider Resubmission Flow', () => {
    it('allows a rejected doctor to resubmit credentials', async () => {
      // 1. Admin rejects doctor with reason
      await request(app)
        .post(`${API}/admin/verify/doctor/${docProfileId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'REJECTED',
          reason: 'Incomplete clinic address and outdated certificate.',
        });

      // 2. Doctor resubmits updated credentials
      const res = await request(app)
        .post(`${API}/auth/resubmit-verification`)
        .set('Authorization', `Bearer ${docToken}`)
        .send({
          clinicAddress: 'Building 10, Medical Hub, Hyderabad',
          specialization: 'Pediatric Neurology',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.doctorProfile.verificationStatus).toBe('PENDING');
      expect(res.body.data.doctorProfile.rejectionReason).toBeNull();
      expect(res.body.data.doctorProfile.clinicAddress).toBe('Building 10, Medical Hub, Hyderabad');
    });
  });

  describe('A8: Data Export and Account Deletion', () => {
    it('exports user data package', async () => {
      const res = await request(app)
        .post(`${API}/users/export-data`)
        .set('Authorization', `Bearer ${patToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.id).toBe(patUserId);
    });

    it('deactivates account on valid password confirmation', async () => {
      const res = await request(app)
        .post(`${API}/users/delete-account`)
        .set('Authorization', `Bearer ${patToken}`)
        .send({
          password: 'Password123',
          reason: 'Moving to another city',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});

