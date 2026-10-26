# ANVAYA 🌿
> **Production-Ready, Paperless Healthcare Ecosystem Connecting Doctors, Pharmacies, and Patients**

ANVAYA is an end-to-end digital healthcare platform designed to modernize clinical prescriptions, pharmacy dispensing, credit ledger accounting, and health record management. It eliminates illegible handwritten paper prescriptions, stops dangerous prescription re-use and drug counterfeiting through atomic dispensing locks, provides pharmacy billing with traditional Indian *Khata* credit management, and empowers patients with granular, consent-driven record sharing.

---

## 📑 Table of Contents
1. [System Architecture](#-system-architecture)
2. [Monorepo Structure](#-monorepo-structure)
3. [Features by Role](#-features-by-role)
4. [Security & Compliance Architecture](#-security--compliance-architecture)
5. [Local Development & Setup](#-local-development--setup)
6. [Seed Script & Demo Credentials](#-seed-script--demo-credentials)
7. [Step-by-Step Demo Script](#-step-by-step-demo-script-walkthrough)
8. [API Overview](#-api-overview)
9. [Automated Testing & CI](#-automated-testing--ci)
10. [Known Limitations & Roadmap](#-known-limitations--roadmap)

---

## 🏛 System Architecture

```mermaid
flowchart TD
    subgraph Clients["Frontend Clients"]
        WebAdmin["Web Application\n(React + Vite + Tailwind CSS)\n- Public Landing Page\n- Protected Admin Console"]
        MobileApp["Mobile Application\n(Expo React Native)\n- Doctor, Patient & Shop Views"]
    end

    subgraph Gateway["Express Backend API (:4000)"]
        CorsHelmet["Security Middleware\n(Helmet, Strict CORS, Rate Limiting)"]
        AuthMiddleware["Auth & Verification Guards\n(JWT Access/Refresh, RBAC, Status Check)"]
        AuditMiddleware["Audit Logger\n(Tamper-evident trail)"]
        
        subgraph Modules["Domain Modules"]
            AuthMod["Auth Module"]
            AdminMod["Admin Module"]
            PrescriptionMod["Prescription Module\n(Atomic Dispense)"]
            BillingMod["Billing & Khata Module\n(Prisma Transaction)"]
            ConsentMod["Consent Module"]
            ReportsMod["Health Reports Vault"]
            RefillsMod["Refill Reminders Worker"]
        end
    end

    subgraph StorageLayer["Data & Persistence Layer"]
        PostgresDB[("PostgreSQL 16 (Prisma ORM)\n- Atomic Concurrency Locks\n- Financial Ledger Transactions")]
        InMemoryDB["In-Memory Store Fallback\n(Strictly dev/test only - disabled in prod)"]
        S3Storage["S3 / Local Storage Engine\n(Encrypted Medical Document Vault)"]
    end

    WebAdmin -->|HTTPS / REST API| CorsHelmet
    MobileApp -->|HTTPS / REST API| CorsHelmet

    CorsHelmet --> AuthMiddleware
    AuthMiddleware --> AuditMiddleware
    AuditMiddleware --> Modules

    PrescriptionMod --> PostgresDB
    BillingMod --> PostgresDB
    AdminMod --> PostgresDB
    ConsentMod --> PostgresDB
    ReportsMod --> S3Storage
    ReportsMod --> PostgresDB
    RefillsMod --> PostgresDB

    PostgresDB -.->|Offline Dev Fallback| InMemoryDB
```

---

## 📁 Monorepo Structure

```
ANVAYA/
├── .github/
│   └── workflows/
│       └── ci.yml               # GitHub Actions CI (Typecheck, Postgres tests, Seed)
├── docker-compose.yml           # PostgreSQL 16 local development database
├── .env.example                 # Root environment template
├── packages/
│   └── shared/                  # Shared TypeScript models, enums & Zod validation
│       ├── src/
│       │   ├── enums.ts         # Roles, VerificationStatus, PrescriptionStatus, etc.
│       │   ├── schemas/         # Zod contract schemas shared across web, mobile, server
│       │   └── types/           # Canonical TypeScript interfaces
│       └── package.json
└── apps/
    ├── server/                  # Production Express API + Prisma
    │   ├── Dockerfile           # Multi-stage production container build
    │   ├── prisma/
    │   │   ├── schema.prisma    # Relational schema (PostgreSQL)
    │   │   ├── migrations/      # Version-controlled migration history
    │   │   └── seed.ts          # Comprehensive demo seeder (11 accounts, bills, khata)
    │   ├── src/
    │   │   ├── config/          # Environment parsing (Zod fail-fast), Prisma client
    │   │   ├── middleware/      # Auth, Role Guard, Verification Guard, Audit, Errors
    │   │   ├── modules/         # Admin, Auth, Billing, Consent, Prescriptions, Reports, Users
    │   │   ├── tests/           # Integration test suites (Vitest, dual in-memory & Postgres modes)
    │   │   └── app.ts           # Express application bootstrap
    │   └── package.json
    ├── web/                     # Vite + React + Tailwind CSS Web Client
    │   ├── src/
    │   │   ├── components/      # UI components, tables, filters, stats cards
    │   │   ├── context/         # AuthContext (in-memory token + refresh flow), ToastContext
    │   │   └── pages/           # Landing page (/) & Admin Console (/admin/*)
    │   └── package.json
    └── mobile/                  # Expo React Native Cross-Platform App
        ├── app/                 # Expo Router tabs and stacks for Doctor, Patient, Shop
        └── package.json
```

---

## 🌟 Features by Role

### 👨‍⚕️ Verified Doctor
- **Phone Lookup with Privacy Guard**: Quickly look up registered patients by phone (`GET /patients/lookup?phone=...`) to issue prescriptions without exposing private contact or historical medical details.
- **Digital E-Prescriptions**: Compose clear, structured prescriptions with dosage, frequency, course duration, and food instructions. Generates human-readable codes (`ANV-YYYY-XXXX`) and single-use QR codes.
- **Appointment Calendar**: Track and fulfill patient appointments.
- **Consent-Gated Patient Records**: Access historical lab tests, scans, and previous prescriptions only when granted active, digital consent by the patient.

### 💊 Verified Medical Shop Owner (Pharmacy)
- **Instant QR & Code Verification**: Verify prescription authenticity in real-time, inspect prescribed medicines, and confirm patient identity.
- **Atomic One-Time Dispense**: Irreversibly locks prescriptions upon dispensing. Any subsequent attempt to re-dispense the same prescription is immediately blocked at the database level to prevent fraud.
- **Digital Billing & Invoicing**: Generate itemized pharmacy bills and invoices (`INV-YYYY-XXXXXX`) linked to prescriptions and patients.
- **Khata Credit Ledger**: Support local community trust with Khata credit. Automatically creates atomic ledger records when bills are settled via `KHATA_CREDIT`, calculates real-time customer balances, and records partial debt repayments.
- **Automated Refill Reminders**: Schedule refill reminders for chronic illnesses that automatically notify patients before their medication runs out.

### 🧑 Patient
- **Prescription Wallet**: Access digital prescriptions on the mobile app; display single-use QR codes to pharmacists.
- **Verified Pharmacy & Doctor Directory**: Locate verified medical professionals with registered clinic timings, licenses, and addresses.
- **Health Records Vault**: Securely upload diagnostic reports, lab results, and discharge summaries with end-to-end access controls.
- **Granular Consent Management**: Grant time-bound or permanent access to specific doctors; revoke consent at any moment with immediate effect.

### 🛡 Administrator
- **Admin-Reviewed Provider Verification**: Review provider credentials (Medical Council numbers for doctors, Drug Licenses for pharmacies). Approve or reject with mandatory compliance reasons.
- **System Metrics Dashboard**: Real-time counts of active users, doctors, pharmacies, prescriptions issued vs. dispensed, and total billing volume.
- **User Directory & Account Suspension**: Search and filter platform users with one-click emergency suspension and reactivation controls.
- **Privacy Boundary**: Patient diagnostic and clinical records are completely excluded from administrative views to uphold patient confidentiality.
- **Tamper-Evident Audit Log**: Every sensitive action (verification decisions, user suspensions, dispensing events, bill creation) is permanently recorded with user ID, IP address, and timestamp.

---

## 🔒 Security & Compliance Architecture

### 1. Atomic Dispense Concurrency Guard
To eliminate prescription double-redemption, ANVAYA utilizes an atomic conditional update at the database level:
```typescript
const result = await prisma.prescription.updateMany({
  where: {
    id: existing.id,
    status: PrescriptionStatus.ISSUED, // Concurrency guard
  },
  data: {
    status: PrescriptionStatus.DISPENSED,
    shopId,
    dispensedAt: new Date(),
  },
});

if (result.count === 0) {
  throw new BadRequestError('Fraud prevention alert: This prescription has ALREADY been dispensed');
}
```
If two pharmacy counters attempt to scan the same QR code concurrently, the first transaction updates the row and claims ownership (`count = 1`), while the concurrent transaction finds `count = 0` and is immediately aborted with a 400 alert.

### 2. Atomic Bill + Khata Transaction
When a medical shop issues an invoice on credit (`KHATA_CREDIT`), the bill and corresponding ledger credit entry are created inside a single atomic Prisma transaction (`prisma.$transaction`). Either both succeed or neither is committed, guaranteeing that pharmacy books never go out of balance.

### 3. Fail-Fast Production Environment Validation
Startup parameters are validated at runtime via Zod schemas in `apps/server/src/config/index.ts`. In production (`NODE_ENV=production`):
- Weak or default JWT secrets (< 32 characters) immediately abort process boot.
- If PostgreSQL is unreachable, the server refuses to start rather than silently falling back to in-memory state.
- CORS is strictly locked to configured whitelisted domains.
- Rate limiting and Helmet security headers are enforced.

### 4. Patient Consent Gate
A patient’s health records and diagnostic documents are protected by the `consentGate` middleware. Even authenticated doctors receive a `403 Forbidden` response unless the patient has an active record in the `Consent` table authorizing that specific doctor.

---

## 🛠 Local Development & Setup

### Prerequisites
- **Node.js**: v20.x or higher
- **npm**: v10.x or higher
- **Docker & Docker Compose**: (for local PostgreSQL container)

### Step 1: Clone and Install
```bash
git clone https://github.com/RamaVenkataCharan/ANVAYA.git
cd ANVAYA

# Install dependencies across all workspaces
npm install
```

### Step 2: Start PostgreSQL with Docker Compose
```bash
# Start PostgreSQL 16 container in background
docker compose up -d

# Verify Postgres container health
docker compose ps
```
The database will be exposed on `localhost:5432` with credentials:
- **Database**: `anvaya`
- **User**: `postgres`
- **Password**: `postgrespassword`

### Step 3: Configure Environment Variables
```bash
# Monorepo root template
cp .env.example .env

# Server environment
cp apps/server/.env.example apps/server/.env

# Web environment
cp apps/web/.env.example apps/web/.env

# Mobile environment
cp apps/mobile/.env.example apps/mobile/.env
```

### Step 4: Build Shared Package & Run Database Migrations
```bash
# 1. Compile the shared TypeScript library
npm run build:shared

# 2. Deploy Prisma migrations to Postgres
npm run db:deploy

# 3. Seed demo accounts and sample records
npm run seed
```

### Step 5: Launch Development Services

Open separate terminal tabs or run concurrently:

```bash
# Start Express Backend API (http://localhost:4000/api/v1)
npm run dev:server

# Start Web Frontend & Admin Console (http://localhost:5173)
npm run dev:web

# Start Mobile Application (Expo Metro Bundler)
npm run dev:mobile
```

---

## 🌱 Seed Script & Demo Credentials

Run the database seed at any time via:
```bash
npm run seed
```

All seeded accounts share the default demo password:
`Password123` *(configured via `DEMO_PASSWORD` in your `.env` file)*.

### 👥 Pre-Configured Demo Accounts

| Role | Name | Email / Identifier | Phone | Status / Verification | Description / Context |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ADMIN** | System Administrator | `admin@anvaya.health` | `+919999900001` | Active | Full administrative control & verification privileges |
| **DOCTOR** | Dr. Rajesh Sharma | `dr.sharma@anvaya.health` | `+919876543210` | **APPROVED** | Cardiologist (MCI-194820-A), Apollo Health City |
| **DOCTOR** | Dr. Priya Patel | `dr.priya@anvaya.health` | `+919876543211` | **APPROVED** | Pediatrician (MCI-205931-B), Rainbow Children's Hospital |
| **DOCTOR** | Dr. Vikram Rao | `dr.vikram@anvaya.health` | `+919876543212` | **PENDING** | Orthopedic (MCI-218492-C), awaiting admin review |
| **SHOP** | Sri Krishna Pharmacy | `krishna.meds@anvaya.health` | `+919876543220` | **APPROVED** | Licensed Pharmacy (DL-TG-10492-A), Jubilee Hills |
| **SHOP** | Sanjeevani Medicals | `sanjeevani@anvaya.health` | `+919876543221` | **APPROVED** | 24/7 Pharmacy (DL-TG-20581-B), Madhapur |
| **SHOP** | Jan Aushadhi Kendra | `janaushadhi@anvaya.health` | `+919876543222` | **PENDING** | Generic Pharmacy (DL-TG-30914-C), awaiting review |
| **PATIENT** | Ramesh Kumar | `ramesh.kumar@example.com` | `+919876543230` | Active | Chronic hypertension patient (active Khata balance due) |
| **PATIENT** | Anita Desai | `anita.desai@example.com` | `+919876543231` | Active | Active prescription & lab report records |
| **PATIENT** | Sunita Reddy | `sunita.reddy@example.com` | `+919876543232` | Active | Pediatric consult history with Dr. Priya Patel |
| **PATIENT** | Mohammad Irfan | `irfan.m@example.com` | `+919876543233` | Active | Acute bronchitis prescription (`DISPENSED`) |

### 📊 Seeded Data Summary
- **Prescriptions**:
  - `ANV-2026-1001`: `ISSUED` status (ready to dispense) for Ramesh Kumar.
  - `ANV-2026-1002`: `DISPENSED` status (locked) at Sri Krishna Pharmacy.
  - `ANV-2026-1003`: `CANCELLED` status (physician revoked).
- **Billing & Khata**:
  - Cash bill (`INV-2026-C0001` - ₹450) - Paid.
  - UPI bill (`INV-2026-U0001` - ₹780) - Paid.
  - Khata Credit bill (`INV-2026-K0001` - ₹1,450) with ₹500 partial payment = **₹950 Outstanding Due**.
- **Records & Consents**:
  - Active consent granted from Ramesh Kumar to Dr. Rajesh Sharma.
  - Refill reminders scheduled for Telmisartan and Amlodipine.

---

## 🎬 Step-by-Step Demo Script (Walkthrough)

Follow this 5-minute end-to-end journey demonstrating the **Doctor $\rightarrow$ Patient $\rightarrow$ Shop $\rightarrow$ Admin** loop:

```
[1. Doctor Consult]       -->  [2. Patient Wallet]      -->  [3. Pharmacy Dispense]
Doctor looks up patient        Patient receives code          Pharmacist scans QR,
by phone & issues              ANV-2026-1001 in               atomically dispenses,
e-prescription.                wallet with QR token.          & issues Khata bill.
```

### Stage 1: Doctor Consultation & Prescription Issuance
1. Open the Mobile App (or call `POST /api/v1/auth/login`) with `dr.sharma@anvaya.health` / `Password123`.
2. Look up patient Ramesh Kumar using phone number `+919876543230`. Notice only non-sensitive demographic info is displayed.
3. Prescribe medication:
   - Medicine: *Telmisartan 40mg*
   - Dosage: *1 tablet once daily after breakfast*
   - Duration: *30 days*
4. Click **Issue Prescription**. The system creates prescription `ANV-2026-1001` with status `ISSUED`.

### Stage 2: Patient Receives E-Prescription in Wallet
1. Log into the Patient account with `ramesh.kumar@example.com` / `Password123`.
2. Navigate to **My Prescriptions**. The new prescription appears with status `ISSUED` alongside a scannable encrypted QR code.
3. Patient visits Sri Krishna Pharmacy and presents the QR code.

### Stage 3: Pharmacy Verification & Atomic Dispense
1. Log into the Pharmacy account with `krishna.meds@anvaya.health` / `Password123`.
2. Enter prescription code `ANV-2026-1001` (or scan QR token) via `POST /prescriptions/verify`.
   - Result: `isValid = true`, status `ISSUED`.
3. Click **Dispense Prescription** (`POST /prescriptions/dispense`).
   - The prescription status transitions to `DISPENSED`.
4. **Fraud Prevention Test**: Attempt to dispense `ANV-2026-1001` a second time.
   - Result: HTTP `400 Bad Request`: *"Fraud prevention alert: This prescription has ALREADY been dispensed"*. Double redemption is completely thwarted.

### Stage 4: Pharmacy Billing with Khata Credit
1. From the pharmacy terminal, generate an invoice for Ramesh Kumar:
   - Total: ₹600.
   - Payment Method: Select **Khata (Store Credit)**.
2. Submit billing. The system atomically registers the invoice and updates Ramesh's Khata credit balance in the store ledger.
3. View Ramesh's Khata statement (`GET /billing/ledger/balance/:patientId`):
   - Shows total credit debt and previous transactions.
4. Record a partial repayment of ₹200 (`POST /billing/ledger`). The balance updates instantly to reflecting ₹400 remaining.

### Stage 5: Admin Verification & Compliance Audit
1. Navigate to the Web Admin Console at `http://localhost:5173/admin`.
2. Log in with `admin@anvaya.health` / `Password123`.
3. Review **Pending Verifications**:
   - Inspect Dr. Vikram Rao's pending profile and Jan Aushadhi Kendra's drug license.
   - Approve or reject with compliance notes.
4. Open the **Audit Logs** tab to view the tamper-evident audit log of logins, verifications, and prescription dispensing events.

---

## 📡 API Overview

Base URL: `http://localhost:4000/api/v1`

### Authentication (`/auth`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Public | Register Doctor, Shop, or Patient |
| `POST` | `/auth/login` | Public | Authenticate with email/phone & password |
| `POST` | `/auth/refresh` | Public | Rotate refresh token for a new access token |
| `POST` | `/auth/logout` | Authenticated | Revoke active refresh token session |
| `GET` | `/auth/me` | Authenticated | Retrieve current user profile & role data |

### Prescriptions (`/prescriptions`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/prescriptions` | Verified Doctor | Issue e-prescription with QR code |
| `GET` | `/prescriptions` | Authenticated | List prescriptions (role-filtered) |
| `GET` | `/prescriptions/:id` | Authenticated | Retrieve complete prescription details |
| `POST` | `/prescriptions/verify` | Verified Shop | Verify prescription validity via code/token |
| `POST` | `/prescriptions/dispense`| Verified Shop | **Atomic one-time dispensing** |
| `PATCH`| `/prescriptions/:id/cancel`| Prescribing Doctor| Cancel issued prescription |

### Billing & Khata (`/billing`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/billing/bills` | Verified Shop | Create bill (Cash, UPI, Card, Khata Credit) |
| `GET` | `/billing/bills` | Verified Shop | List bills generated by pharmacy |
| `GET` | `/billing/ledger/balance/:patientId` | Verified Shop | Query customer Khata credit balance |
| `POST` | `/billing/ledger` | Verified Shop | Record Khata payment or credit adjustment |

### Consent & Medical Records (`/consent`, `/reports`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/consent/grant` | Patient | Grant doctor access to health records |
| `POST` | `/consent/revoke`| Patient | Revoke doctor access immediately |
| `GET` | `/reports` | Patient / Consented Doctor | List health records & lab tests |
| `POST` | `/reports` | Patient | Upload new health document to vault |

### Administration (`/admin`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/admin/stats` | Admin | Real-time platform metrics and counts |
| `GET` | `/admin/pending-verifications` | Admin | List doctors & shops awaiting review |
| `POST` | `/admin/verify/doctor/:id` | Admin | Approve or reject doctor credentials |
| `POST` | `/admin/verify/shop/:id` | Admin | Approve or reject pharmacy license |
| `GET` | `/admin/verifications/history` | Admin | Timeline of verification decisions |
| `GET` | `/admin/users` | Admin | Search/filter platform users (privacy safe) |
| `POST` | `/admin/users/:id/suspend` | Admin | Suspend user account immediately |
| `POST` | `/admin/users/:id/reactivate` | Admin | Reactivate suspended user account |
| `GET` | `/admin/audit` | Admin | Search and inspect tamper-evident audit log |

---

## 🧪 Automated Testing & CI

### Vitest Test Suite
ANVAYA features comprehensive end-to-end integration tests covering:
1. Provider onboarding, admin approval, and JWT refresh flows.
2. Patient phone lookup with strict demographic data minimization.
3. Prescription issuance, wallet discovery, and verification.
4. **Atomic Dispense Concurrency Guard** (verifying duplicate dispense returns 400).
5. **Bill + Khata Transaction** (verifying atomic credit balance tracking).
6. Push token registration and scheduled refill reminder background jobs.
7. Patient diagnostic upload and **Consent Gate enforcement** (403 forbidden without consent).
8. Admin verification, user suspension/reactivation, and audit logging.

```bash
# Run server test suite against in-memory store
npm run test

# Run server test suite against real PostgreSQL
npm run test:postgres
```

### TypeScript Validation
```bash
# Compile and typecheck all workspaces
npm run typecheck
```

### GitHub Actions CI
Every commit and pull request triggers `.github/workflows/ci.yml`:
- Starts an official `postgres:16-alpine` service container.
- Installs dependencies with `npm ci`.
- Runs `tsc --noEmit` across `shared`, `server`, `web`, and `mobile`.
- Executes `prisma migrate deploy` from a pristine state.
- Executes `prisma/seed.ts` to verify seed dataset integrity.
- Executes the full Vitest suite in both **In-Memory** and **PostgreSQL** modes.

---

## 🚢 Docker Production Deployment

Build the standalone server Docker container from the repository root:

```bash
# Build production Docker image
docker build -f apps/server/Dockerfile -t anvaya-server:latest .

# Run container with production environment
docker run -d \
  -p 4000:4000 \
  -e NODE_ENV=production \
  -e DATABASE_URL="postgresql://user:pass@host:5432/anvaya?schema=public" \
  -e JWT_ACCESS_SECRET="your_production_secret_at_least_32_characters_long" \
  -e JWT_REFRESH_SECRET="your_production_secret_at_least_32_characters_long" \
  -e ALLOWED_ORIGINS="https://anvaya.health,https://admin.anvaya.health" \
  --name anvaya-api \
  anvaya-server:latest
```

---

## ⚠️ Known Limitations & Roadmap

1. **In-Memory Store vs. Production**:
   - The in-memory store (`src/db/inMemoryDb.ts`) is designed exclusively for offline development and quick local iteration when Docker is unavailable. In `NODE_ENV=production`, the fallback is strictly disabled and the server will fail fast if PostgreSQL is unreachable.
2. **Push Notifications**:
   - Expo Push Notifications are fully wired via `expo-server-sdk`. In local development without an active Expo project ID, notifications are simulated and logged to the console.
3. **SMS OTP Gateway**:
   - Mobile authentication uses direct credential verification in this build. Production deployment to India requires integration with a TRAI-compliant DLT SMS gateway (e.g., Fast2SMS or Twilio).
4. **Object Storage**:
   - File uploads support both local disk storage (`/uploads`) and S3-compatible endpoints (AWS S3, Cloudflare R2, MinIO). Local disk storage requires persistent volume mounting in containerized environments.
5. **Not Certified for Clinical Use**:
   - ANVAYA is an architectural prototype and reference platform built with consent-based access and audit logging; it is not certified or reviewed for clinical use or regulatory compliance.
6. **Manual Provider Verification**:
   - Provider credential verification (medical registration numbers and pharmacy drug licenses) is manual via administrator review; there is no automated API integration with national medical councils or state drug registries.
7. **No Offline Mode**:
   - There is no offline mode or offline caching. Viewing prescriptions, displaying QR codes, and conducting pharmacy dispensing require active network connectivity.
8. **No GST/HSN Breakdown**:
   - Invoicing computes item subtotals, standard percentage tax, and final totals, but does not provide GSTIN verification, HSN/SAC code breakdowns, or multi-rate CGST/SGST/IGST tax reporting.

---

## 📄 License
This project is licensed under the ISC License. Built with ❤️ for accessible, transparent healthcare.
