import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { connectDatabase } from '../config/prisma';
import { escapeHtml } from '@anvaya/shared';

const app = createApp();
const API = '/api/v1';

describe('Validation Limits & HTML Escaping Suite', () => {
  let docToken: string;
  let patId: string;
  const ts = Date.now();

  beforeAll(async () => {
    if (process.env.TEST_DB === 'postgres') {
      await connectDatabase();
    }

    // Login admin to approve doctor
    const adminLogin = await request(app)
      .post(`${API}/auth/login`)
      .send({ identifier: 'admin@anvaya.health', password: 'Password123' });
    const adminToken = adminLogin.body.data.tokens.accessToken;

    // Register Doctor
    const regDoc = await request(app)
      .post(`${API}/auth/register`)
      .send({
        name: 'Dr. Limit Tester',
        email: `doc.limit.${ts}@test.anvaya`,
        phone: `+91930${String(ts).slice(-7)}`,
        password: 'Password123',
        role: 'DOCTOR',
        specialization: 'Internal Medicine',
        registrationNo: `MCI-LIM-${ts}`,
        clinicAddress: '100 Medical Plaza, Hyderabad',
      });
    expect(regDoc.status).toBe(201);
    docToken = regDoc.body.data.tokens.accessToken;
    const docId = regDoc.body.data.user.doctorProfile.id;

    // Approve Doctor
    await request(app)
      .post(`${API}/admin/verify/doctor/${docId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED' });

    // Register Patient
    const regPat = await request(app)
      .post(`${API}/auth/register`)
      .send({
        name: 'Patient Limit Tester',
        email: `pat.limit.${ts}@test.anvaya`,
        phone: `+91931${String(ts).slice(-7)}`,
        password: 'Password123',
        role: 'PATIENT',
        dob: '1992-02-02',
        gender: 'FEMALE',
        address: '200 Patient Way, Hyderabad',
      });
    expect(regPat.status).toBe(201);
    patId = regPat.body.data.user.patientProfile.id;
  });

  describe('Prescription Medicine Items Cap (Max 30 items)', () => {
    it('rejects prescription creation with 31 medicine items (400 Bad Request)', async () => {
      const items31 = Array.from({ length: 31 }, (_, i) => ({
        medicine: `Medicine ${i + 1}`,
        dosage: '500mg',
        frequency: '1-0-1',
        duration: '5 days',
        quantity: 10,
        instructions: 'After meals',
      }));

      const res = await request(app)
        .post(`${API}/prescriptions`)
        .set('Authorization', `Bearer ${docToken}`)
        .send({
          patientId: patId,
          diagnosis: 'Multi-drug therapy review',
          notes: 'Testing item limits',
          items: items31,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('accepts prescription creation with exactly 30 medicine items (201 Created)', async () => {
      const items30 = Array.from({ length: 30 }, (_, i) => ({
        medicine: `Medicine ${i + 1}`,
        dosage: '100mg',
        frequency: '1-0-0',
        duration: '3 days',
        quantity: 3,
      }));

      const res = await request(app)
        .post(`${API}/prescriptions`)
        .set('Authorization', `Bearer ${docToken}`)
        .send({
          patientId: patId,
          diagnosis: 'Complex comprehensive regimen',
          notes: 'Testing exactly 30 items max limit',
          items: items30,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.items).toHaveLength(30);
    });
  });

  describe('Free-Text Field Length Limits', () => {
    it('rejects prescription with excessively long diagnosis (> 500 characters)', async () => {
      const longDiagnosis = 'A'.repeat(501);
      const res = await request(app)
        .post(`${API}/prescriptions`)
        .set('Authorization', `Bearer ${docToken}`)
        .send({
          patientId: patId,
          diagnosis: longDiagnosis,
          items: [
            {
              medicine: 'Paracetamol',
              dosage: '500mg',
              frequency: '1-0-1',
              duration: '3 days',
              quantity: 6,
            },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects registration with excessively long user name (> 100 characters)', async () => {
      const longName = 'A'.repeat(101);
      const res = await request(app)
        .post(`${API}/auth/register`)
        .send({
          name: longName,
          email: `overflow.${Date.now()}@test.anvaya`,
          phone: `+91932${String(Date.now()).slice(-7)}`,
          password: 'Password123',
          role: 'PATIENT',
          dob: '1990-01-01',
          gender: 'MALE',
          address: 'Valid address 123',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('HTML Value Sanitization & Escaping', () => {
    it('escapes dangerous HTML characters to prevent script and markup injection in templates', () => {
      const maliciousInput = '<script>alert("xss")</script> & \'test\' "payload"';
      const escaped = escapeHtml(maliciousInput);

      expect(escaped).not.toContain('<script>');
      expect(escaped).not.toContain('</script>');
      expect(escaped).toContain('&lt;script&gt;');
      expect(escaped).toContain('&lt;/script&gt;');
      expect(escaped).toContain('&amp;');
      expect(escaped).toContain('&quot;xss&quot;');
      expect(escaped).toContain('&#039;test&#039;');
    });

    it('handles null, undefined, and non-string inputs gracefully', () => {
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
      expect(escapeHtml(12345)).toBe('12345');
      expect(escapeHtml(0)).toBe('0');
    });
  });
});
