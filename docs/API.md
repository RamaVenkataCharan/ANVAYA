# ANVAYA API Specification

**Base URL**: `http://localhost:4000/api/v1`

---

## 1. Authentication & Security
All authenticated routes require a Bearer token in the `Authorization` header:
```http
Authorization: Bearer <access_token>
```

### Standard Response Envelope
```json
{
  "success": true,
  "message": "Optional human-readable message",
  "data": { ... },
  "timestamp": "2026-10-22T06:30:00.000Z"
}
```

### Error Response Envelope
```json
{
  "success": false,
  "error": "ErrorType",
  "message": "Specific error description",
  "details": [ ... ],
  "timestamp": "2026-10-22T06:30:00.000Z"
}
```

---

## 2. Auth Endpoints

### `POST /auth/register`
Registers a new user with their role profile.

**Doctor Request:**
```json
{
  "name": "Dr. Sarah Rao",
  "email": "sarah.rao@example.com",
  "phone": "+919876543210",
  "password": "Password123",
  "role": "DOCTOR",
  "specialization": "Cardiology",
  "registrationNo": "MCI-884920",
  "clinicAddress": "Suite 4B, Apollo Health City, Hyderabad"
}
```

**Pharmacy Shop Request:**
```json
{
  "name": "Kiran Kumar",
  "email": "medplus.central@example.com",
  "phone": "+919876543211",
  "password": "Password123",
  "role": "SHOP",
  "shopName": "MedPlus Pharmacy Banjara Hills",
  "licenseNo": "DL-TS-2024-99881",
  "address": "Road No. 12, Banjara Hills, Hyderabad",
  "timings": "08:00 AM - 11:00 PM"
}
```

**Patient Request:**
```json
{
  "name": "Ramesh Varma",
  "email": "ramesh.varma@example.com",
  "phone": "+919876543212",
  "password": "Password123",
  "role": "PATIENT",
  "dob": "1990-05-15",
  "gender": "MALE",
  "address": "Flat 302, Green Meadows, Madhapur, Hyderabad",
  "bloodGroup": "O+",
  "emergencyContact": "+919876543299"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Account registered successfully",
  "data": {
    "user": {
      "id": "uuid-v4",
      "name": "Dr. Sarah Rao",
      "email": "sarah.rao@example.com",
      "phone": "+919876543210",
      "role": "DOCTOR",
      "isActive": true,
      "doctorProfile": {
        "id": "uuid-v4",
        "specialization": "Cardiology",
        "registrationNo": "MCI-884920",
        "verificationStatus": "PENDING"
      }
    },
    "tokens": {
      "accessToken": "jwt_token_string",
      "refreshToken": "jwt_token_string"
    }
  }
}
```

### `POST /auth/login`
Authenticates with email or 10-digit phone number.
```json
{
  "identifier": "sarah.rao@example.com",
  "password": "Password123"
}
```

### `POST /auth/refresh`
Rotates the refresh token and issues a new access token.
```json
{
  "refreshToken": "<existing_refresh_token>"
}
```

### `GET /auth/me`
Returns current authenticated user profile and verification status.

---

## 3. Administrative Verification Endpoints

### `GET /admin/pending-verifications`
*(Requires ADMIN role)*
Returns all unverified doctors and pharmacies awaiting approval.

### `POST /admin/verify/doctor/:id`
*(Requires ADMIN role)*
Approves or rejects a doctor.
```json
{
  "status": "APPROVED"
}
```
Or for rejection:
```json
{
  "status": "REJECTED",
  "reason": "Registration number could not be validated with state medical council"
}
```

### `POST /admin/verify/shop/:id`
*(Requires ADMIN role)*
Approves or rejects a pharmacy shop license.
```json
{
  "status": "APPROVED"
}
```

### `GET /admin/stats`
Returns aggregated metrics of users, doctors, shops, prescriptions, and bills.

---

## 4. Directory Endpoints

### `GET /shops`
Returns list of verified pharmacy shops (with optional `?search=` filter).

### `GET /shops/:id`
Returns full profile of a specific verified pharmacy.

### `GET /doctors`
Returns list of verified doctors (with optional `?specialization=` filter).

---

## 5. Patient Lookup & Demographics

### `GET /patients/lookup`
*(Strictly restricted to verified DOCTOR role; unverified doctors, shops, patients, and admins receive `403 Forbidden`)*

Quickly look up a registered patient by exact phone number (`?phone=...`) for prescription issuance while strictly enforcing data minimization and anti-enumeration protections.

**Rate Limiting:**
- **10 requests per 10-minute window** (`max: 10`, `windowMs: 600,000 ms`), tracked per authenticated user ID (or client IP).
- Requests exceeding 10 within the 10-minute window receive HTTP `429 Too Many Requests`.

**Found Response (HTTP 200 OK):**
Returns only minimized demographics required for consultation (`id`, `name`, and calculated `age`). Does NOT expose phone, email, address, date of birth, gender, emergency contacts, or clinical records.
```json
{
  "success": true,
  "data": {
    "id": "e2222222-2222-2222-2222-222222222222",
    "name": "Ramesh Varma",
    "age": 36
  },
  "timestamp": "2026-10-26T21:40:00.000Z"
}
```

**Not-Found Response (HTTP 200 OK — Indistinguishable Status):**
Returns HTTP `200 OK` with `data: null` instead of HTTP 404 to prevent phone number existence enumeration attacks.
```json
{
  "success": true,
  "data": null,
  "timestamp": "2026-10-26T21:40:00.000Z"
}
```
*Note: An audit log entry (`PATIENT_LOOKUP`) is recorded for every lookup attempt, regardless of whether a record was found.*
