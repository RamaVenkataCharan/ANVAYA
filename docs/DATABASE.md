# ANVAYA Database Architecture

## 1. Overview
ANVAYA utilizes **PostgreSQL** orchestrated with **Prisma ORM**. The database is normalized with strict foreign keys, cascade/restrict deletion rules, and indexing on critical lookup paths (emails, phones, verification statuses, prescription codes, and QR tokens).

---

## 2. Entity-Relationship Diagram

```
                 +-------------------+
                 |       User        |
                 +-------------------+
                 | id (PK)           |
                 | email, phone      |
                 | role, passwordHash|
                 +---------+---------+
                           |
        +------------------+------------------+
        | 1:1              | 1:1              | 1:1
+-------v-------+  +-------v-------+  +-------v-------+
|    Doctor     |  |     Shop      |  |    Patient    |
+---------------+  +---------------+  +---------------+
| id (PK)       |  | id (PK)       |  | id (PK)       |
| registrationNo|  | licenseNo     |  | dob, gender   |
| verif.Status  |  | verif.Status  |  | bloodGroup    |
+-------+-------+  +-------+-------+  +-------+-------+
        |                  |                  |
        | 1:N              | 1:N              | 1:N
        |                  |                  |
+-------v------------------v------------------v-------+
|                    Prescription                     |
+-----------------------------------------------------+
| id (PK), code (UQ), qrToken (UQ), status            |
| doctorId (FK) -> Doctor                             |
| patientId (FK) -> Patient                           |
| shopId (FK, nullable) -> Shop                       |
+--------------------------+--------------------------+
                           | 1:N
                  +--------v---------+
                  | PrescriptionItem |
                  +------------------+
                  | id (PK)          |
                  | medicine, dosage |
                  | freq, qty, dur.  |
                  +------------------+
```

---

## 3. Core Tables

### 3.1 `User`
- Central identity table.
- Enums: `Role` (`DOCTOR`, `SHOP`, `PATIENT`, `ADMIN`).
- Unique constraints: `email`, `phone`.

### 3.2 `Doctor`
- Profile table linked 1:1 to `User`.
- `registrationNo`: State/National Medical Council identifier (Unique).
- `verificationStatus`: `PENDING`, `APPROVED`, `REJECTED`.
- Indexed on `verificationStatus` for rapid administrator queue filtering.

### 3.3 `Shop`
- Profile table linked 1:1 to `User`.
- `licenseNo`: State Drug License number (Unique).
- `verificationStatus`: `PENDING`, `APPROVED`, `REJECTED`.

### 3.4 `Patient`
- Profile table linked 1:1 to `User`.
- Contains clinical demographics (`dob`, `gender`, `bloodGroup`, `emergencyContact`).

### 3.5 `Prescription` & `PrescriptionItem`
- Connects the three primary roles:
  - Doctor creates (`doctorId`).
  - Patient receives (`patientId`).
  - Pharmacy fulfills (`shopId`).
- `code`: Human-friendly alpha-numeric identifier (e.g. `ANV-8942-7193`).
- `qrToken`: High-entropy cryptographic token encoded in QR format.
- `status`: `ISSUED` -> `DISPENSED` (or `CANCELLED`).
- Deletion safety: `Doctor` and `Patient` are protected with `onDelete: Restrict` to prevent accidental loss of clinical history.

### 3.6 `Bill` & `BillItem`
- Pharmacy financial transactions linked optionally to an originating `Prescription`.
- Supports tax, subtotal, and payment methods (`CASH`, `UPI`, `CARD`, `KHATA_CREDIT`).

### 3.7 `LedgerEntry` (Khata)
- Pharmacy customer ledger for credit balances and payments.
- `type`: `CREDIT` (dues) or `PAYMENT` (settlement).

### 3.8 `Consent`
- Explicit patient-granted clinical permission for a doctor to review history.
- Unique compound key: `[patientId, doctorId]`.
- Enforces active status check before medical record access.

### 3.9 `AuditLog`
- Immutable event trail capturing:
  - User ID, Action (`AUTH_LOGIN`, `PRESCRIPTION_DISPENSED`, etc.)
  - Resource type & ID
  - IP Address, User Agent, and JSON metadata.

### 3.10 `RefreshToken`
- Persistent session storage linked 1:N to `User`:
  - `id`: UUID primary key.
  - `userId`: Foreign key referencing `User(id)`.
  - `hash`: SHA-256 cryptographic digest of raw refresh token (Unique).
  - `expiresAt`: Absolute expiration timestamp (7-day validity).
  - `revokedAt`: Nullable revocation timestamp (`null` for active tokens, set upon logout or user account suspension).
  - Preserves token revocations permanently across server restarts.

---

## 4. Key Performance Indexes
- `User(email)`, `User(phone)`, `User(role)`
- `Doctor(verificationStatus)`, `Doctor(registrationNo)`
- `Shop(verificationStatus)`, `Shop(licenseNo)`
- `Prescription(code)`, `Prescription(qrToken)`, `Prescription(patientId, status)`
- `Appointment(doctorId, dateTime)`, `Appointment(patientId, dateTime)`
- `Consent(patientId, isActive)`, `Consent(doctorId, isActive)`
- `AuditLog(userId, createdAt)`, `AuditLog(action)`
- `RefreshToken(userId, revokedAt)`, `RefreshToken(hash)`
