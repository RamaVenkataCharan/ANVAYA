# ANVAYA Independent Development Gaps & Architectural Audit Report

**Report Version:** 1.0.0 (Independent Audit)  
**Audit Date:** October 27, 2026  
**Audited Target:** ANVAYA Healthcare Monorepo (`apps/server`, `apps/web`, `apps/mobile`, `packages/shared`)  
**Auditor:** Independent Security & Architecture Review  
**Branch:** `audit/independent` (branched from `main` @ `91ad4fb`)  
**Overall Verdict:** ⚠️ **FUNCTIONAL IN IN-MEMORY MOCKS; CRITICAL ARCHITECTURAL, TESTING & OPERATIONAL GAPS IN REAL DEPLOYMENTS**

---

## 1. Executive Summary & Development Scorecard

An independent engineering audit was conducted across the ANVAYA paperless healthcare ecosystem to evaluate feature completeness against the Product Requirements Document ([`docs/PRD.md`](file:///c:/Users/ramav/Documents/PROJECTS/ANVAYA/docs/PRD.md)), examine engine parity between the in-memory development store and the production PostgreSQL database, verify automated test execution reality, inspect operational readiness, and identify critical clinical and user-experience gaps.

### Summary of Audit Findings
1. **0% Automated Coverage of PostgreSQL Layer (FLAG-DEV-01):** The entire automated test suite of 122 tests runs exclusively against an in-memory JavaScript mock store (`inMemoryDb`). The PostgreSQL Prisma database queries in `if (isDbConnected())` branches are never executed in standard test runs. Attempting to run against PostgreSQL with `TEST_DB=postgres` fails fast with 11 failing suites because no database daemon exists on the environment (marked **BLOCKED**).
2. **Broken Mobile Clinical Document Preview (FLAG-DEV-02):** On mobile, the patient Medical Vault attempts to open health reports using `Linking.openURL(${API_BASE_URL}/reports/${id}/file)`. Because `Linking.openURL` opens the OS web browser without an `Authorization: Bearer` token, Express's `authenticateJwt` middleware immediately rejects the request with HTTP 401 Unauthorized, rendering the feature unusable on devices.
3. **Appointment Scheduling Lacks Slot Management & Conflict Detection (FLAG-DEV-03):** The appointment booking system accepts arbitrary ISO date strings with zero doctor schedule validation, zero duration modeling, and zero concurrent booking conflict checks. Multiple patients can book the same doctor for the exact same second.
4. **Architectural Divergence Between In-Memory and PostgreSQL (FLAG-DEV-04):** Dual-mode branching leads to discrepancies in decimal precision (JS float paise vs `Prisma.Decimal`), bill number generation (hardcoded in-memory sequence vs random hex), and cascade/restrict foreign key enforcement.
5. **Web Portal Scope Limitation:** The `apps/web` project is strictly an Administrator portal and marketing landing page. Doctor, Pharmacy, and Patient portals do not exist on the web; all clinical workflows are confined to the Expo mobile app.

### Development Scorecard

```
================================================================================
                    INDEPENDENT DEVELOPMENT AUDIT SCORECARD
================================================================================
  Core In-Memory Test Suite      : 122 / 122 PASSED (100% In-Memory Only)
  PostgreSQL Suite Coverage      : 0% EXECUTED (BLOCKED: Database offline)
  Feature Completeness (Mobile)  : 88% PRD Workflows Implemented
  Feature Completeness (Web)     : Admin Only (0% Doctor/Shop/Patient Web UI)
  Cross-Engine Behavioral Parity : DIVERGENT (In-Memory vs. Prisma SQL)
  Operational / Monitoring Stack : INCOMPLETE (No APM, Prom, or Structured Log)
================================================================================
  Identified Development Flags:
    • CRITICAL : 1 Flag  (FLAG-DEV-01: 0% Postgres Automated Test Execution)
    • HIGH     : 2 Flags (FLAG-DEV-02: Mobile Document Preview 401;
                          FLAG-DEV-03: Missing Appointment Slot & Conflict Logic)
    • MEDIUM   : 3 Flags (FLAG-DEV-04: In-Memory vs. Postgres Behavioral Divergence;
                          FLAG-DEV-05: Missing Prescription Void/Amendment Loop;
                          FLAG-DEV-06: Monolithic Store & Free-Text Drug Catalog)
    • LOW      : 2 Flags (FLAG-DEV-07: Health Check Readiness & Operational Deficits;
                          FLAG-DEV-08: Documentation & Spec Drift)
================================================================================
```

---

## 2. Identified Development Flags (FLAGS First)

---

### FLAG-DEV-01: 0% Automated Test Coverage on PostgreSQL Engine (Real DB Tests Blocked)
- **Severity:** **CRITICAL**
- **Category:** Test Automation & Reliability / Database Architecture
- **Affected Files:**
  - [`apps/server/src/config/prisma.ts:20-73`](file:///c:/Users/ramav/Documents/PROJECTS/ANVAYA/apps/server/src/config/prisma.ts#L20-L73)
  - [`apps/server/src/tests/`](file:///c:/Users/ramav/Documents/PROJECTS/ANVAYA/apps/server/src/tests/)
  - [`apps/server/vitest.config.ts`](file:///c:/Users/ramav/Documents/PROJECTS/ANVAYA/apps/server/vitest.config.ts)
- **Evidence:**
  1. In standard test runs (`npm test`), `isDbConnected()` returns `false`. Every service method (`createPrescription`, `createBill`, `createAppointment`, `refreshTokens`) diverts to the `else` branch using `inMemoryDb`.
  2. The coverage report ([`docs/audit-evidence/test-coverage.txt`](file:///c:/Users/ramav/Documents/PROJECTS/ANVAYA/docs/audit-evidence/test-coverage.txt)) shows that services have ~50% statement coverage because the entire `if (isDbConnected()) { ... }` Prisma execution path is never hit.
  3. Running `npm run test:postgres` with `TEST_DB=postgres` against a throwaway database URL failed immediately with 11 failing test suites:
     ```
     Error: PostgreSQL test connection failed: Can't reach database server at localhost:5432
     ```
     See Section 6 for the verbatim execution log.
- **Impact:**
  Production deployments connecting to PostgreSQL execute untested Prisma query syntax, joins, relation cascades, and Decimal conversions for the first time in live production. Any SQL syntax error, schema mismatch, or unindexed slow query will only surface in production.
- **Remediation:**
  1. Add Docker Compose or GitHub Actions PostgreSQL service container to the CI pipeline (`postgres:16-alpine`).
  2. Implement an automated pre-test hook in Vitest that initializes migrations (`prisma migrate deploy`) and runs the entire 12-suite test matrix against live PostgreSQL.

---

### FLAG-DEV-02: Broken Mobile Health Report Streaming (HTTP 401 on File View)
- **Severity:** **HIGH**
- **Category:** Mobile User Experience / API Integration / Authentication
- **Affected Files:**
  - [`apps/mobile/app/(patient)/records.tsx:276-287`](file:///c:/Users/ramav/Documents/PROJECTS/ANVAYA/apps/mobile/app/%28patient%29/records.tsx#L276-L287)
  - [`apps/server/src/modules/reports/report.routes.ts:20-60`](file:///c:/Users/ramav/Documents/PROJECTS/ANVAYA/apps/server/src/modules/reports/report.routes.ts#L20-L60)
- **Evidence:**
  In `apps/mobile/app/(patient)/records.tsx`:
  ```typescript
  const handleViewReport = (report: ReportItem) => {
    // Open authenticated streaming endpoint
    const fileUrl = `${API_BASE_URL}/reports/${report.id}/file`;
    Linking.openURL(fileUrl).catch(() => { ... });
  };
  ```
  `Linking.openURL` launches the mobile operating system's external browser (Safari/Chrome). The external browser does not possess the React Native app's in-memory Bearer token. In `report.routes.ts`:
  ```typescript
  router.use(authenticateJwt);
  router.get('/:id/file', (req, res, next) => reportController.streamReportFile(req, res, next));
  ```
  The browser GET request arrives with no `Authorization` header. Express rejects it with:
  ```json
  { "success": false, "error": "UnauthorizedError", "message": "Authorization token required" }
  ```
- **Impact:**
  Patients cannot open, view, or download their uploaded lab reports, discharge summaries, or imaging scans on mobile devices.
- **Remediation:**
  Implement one of two standard patterns:
  1. **Short-Lived Signed Ticket:** Add `POST /reports/:id/view-token` returning a 60-second HMAC token query param (`/reports/:id/file?ticket=...`).
  2. **In-App Native Viewer:** Use `expo-file-system` to download the file with `Authorization: Bearer ${token}` headers to local cache, then present with `expo-sharing` or a native modal.

---

### FLAG-DEV-03: Appointment Booking Lacks Doctor Slot Management & Conflict Prevention
- **Severity:** **HIGH**
- **Category:** Business Logic / Clinical Operations
- **Affected Files:**
  - [`apps/server/src/modules/appointments/appointment.service.ts:12-40`](file:///c:/Users/ramav/Documents/PROJECTS/ANVAYA/apps/server/src/modules/appointments/appointment.service.ts#L12-L40)
  - [`apps/mobile/app/(patient)/appointments.tsx`](file:///c:/Users/ramav/Documents/PROJECTS/ANVAYA/apps/mobile/app/%28patient%29/appointments.tsx)
- **Evidence:**
  `AppointmentService.createAppointment` validates only that `dateTime` is in the future:
  ```typescript
  const apptDate = new Date(input.dateTime);
  if (isNaN(apptDate.getTime()) || apptDate.getTime() <= Date.now()) {
    throw new BadRequestError('Appointment date and time must be in the future');
  }
  ```
  There is:
  - No check against the doctor's working hours or days of service.
  - No default consultation duration (e.g., 15 or 30 minutes).
  - No query checking whether `Appointment` records already exist for that `doctorId` at that `dateTime`.
  - No appointment rescheduling endpoint (`updateAppointmentStatus` only transitions status enum).
- **Impact:**
  Unlimited patients can book appointments with the same doctor at the exact same minute. Doctors cannot define clinic availability or break times. Patients cannot reschedule without cancelling and re-booking.
- **Remediation:**
  1. Add `DoctorSchedule` model (days of week, shift start/end times, slot duration).
  2. Check for slot overlaps before inserting `Appointment`:
     ```typescript
     const conflict = await prisma.appointment.findFirst({
       where: {
         doctorId: input.doctorId,
         dateTime: apptDate,
         status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED] },
       },
     });
     if (conflict) throw new ConflictError('Doctor is already booked for this time slot');
     ```
  3. Add `PATCH /appointments/:id/reschedule` endpoint.

---

### FLAG-DEV-04: Engine Divergence Between In-Memory and PostgreSQL Implementations
- **Severity:** **MEDIUM**
- **Category:** Architectural Integrity / Data Types / Concurrency
- **Affected Files:**
  - [`apps/server/src/modules/billing/billing.service.ts:96-175`](file:///c:/Users/ramav/Documents/PROJECTS/ANVAYA/apps/server/src/modules/billing/billing.service.ts#L96-L175)
  - [`apps/server/src/modules/prescriptions/prescription.service.ts:415-508`](file:///c:/Users/ramav/Documents/PROJECTS/ANVAYA/apps/server/src/modules/prescriptions/prescription.service.ts#L415-L508)
  - [`apps/server/prisma/schema.prisma`](file:///c:/Users/ramav/Documents/PROJECTS/ANVAYA/apps/server/prisma/schema.prisma)
  - [`apps/server/src/db/inMemoryDb.ts`](file:///c:/Users/ramav/Documents/PROJECTS/ANVAYA/apps/server/src/db/inMemoryDb.ts)
- **Evidence:**
  1. **Bill Number Generation:**
     In PostgreSQL mode (`billing.service.ts:127`):
     ```typescript
     const billNumber = `INV-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
     ```
     In in-memory mode (`billing.service.ts:98`):
     ```typescript
     const seq = String(inMemoryDb.bills.length + 1).padStart(4, '0');
     return `INV-${year}-${seq}`;
     ```
  2. **Decimal Serialization:** In PostgreSQL, monetary fields (`total`, `subtotal`, `tax`, `unitPrice`) are Prisma `Decimal` instances (`@db.Decimal(10, 2)`). In `inMemoryDb`, they are plain JavaScript `number` primitives. Clients receiving JSON from Prisma get string-serialized decimals or require explicit conversions.
  3. **Foreign Key Integrity:** `inMemoryDb` does not enforce `onDelete: Restrict`. In-memory tests deleting entities succeed where PostgreSQL would throw foreign key constraint violations (`P2003`).
  4. **Multi-Instance Concurrency:** In-memory mode relies on Node.js single-threaded event loop. In a scaled deployment with multiple server instances, in-memory state is isolated per instance, leading to state corruption and split-brain dispensing if in-memory mode is used.
- **Impact:**
  Behaviors verified in local testing and QA reports do not faithfully replicate production PostgreSQL behaviors.
- **Remediation:**
  Deprecate `inMemoryDb` as a primary runtime engine. Adopt SQLite via Prisma for zero-config local development, or mandate a local PostgreSQL container, ensuring a single code path exists for all database queries.

---

### FLAG-DEV-05: Missing Clinical Prescription Amendment & Voiding Lifecycle
- **Severity:** **MEDIUM**
- **Category:** Clinical Workflow / Regulatory Compliance
- **Affected Files:**
  - [`apps/server/src/modules/prescriptions/prescription.service.ts:514-550`](file:///c:/Users/ramav/Documents/PROJECTS/ANVAYA/apps/server/src/modules/prescriptions/prescription.service.ts#L514-L550)
  - [`apps/mobile/app/(doctor)/new-prescription.tsx`](file:///c:/Users/ramav/Documents/PROJECTS/ANVAYA/apps/mobile/app/%28doctor%29/new-prescription.tsx)
- **Evidence:**
  `PrescriptionService` provides only:
  - `createPrescription`: Creates prescription in `ISSUED` state.
  - `cancelPrescription`: Marks prescription `CANCELLED` (only before dispensing).
  - `dispensePrescription`: Transitions `ISSUED` -> `DISPENSED`.
  There is no mechanism for a physician to:
  - Correct a typographical error in medicine dosage or duration prior to dispensing.
  - Issue an amendment or addendum with a change log.
  - Revoke a prescription after an emergency drug interaction warning.
- **Impact:**
  If a doctor miskeys a dosage (e.g., 500mg instead of 50mg), the only remedy is cancelling the entire prescription and instructing the patient to discard the QR code, which confuses patients and medical shops.
- **Remediation:**
  Add a prescription versioning workflow:
  - Allow `POST /prescriptions/:id/amend` which voids the original with an audit reason and issues a linked revision (`revisionOfId: string`).

---

### FLAG-DEV-06: Monolithic Single-Shop Architecture & Lack of Standard Drug Catalog
- **Severity:** **MEDIUM**
- **Category:** Commercial Architecture / Data Standardization
- **Affected Files:**
  - [`apps/server/prisma/schema.prisma:104-125`](file:///c:/Users/ramav/Documents/PROJECTS/ANVAYA/apps/server/prisma/schema.prisma#L104-L125)
  - [`apps/server/src/modules/billing/billing.service.ts:25-95`](file:///c:/Users/ramav/Documents/PROJECTS/ANVAYA/apps/server/src/modules/billing/billing.service.ts#L25-L95)
- **Evidence:**
  1. **Single Branch Model:** In `schema.prisma`, `Shop` is tied 1:1 to `User`. There is no `Organization` or `Branch` model. Pharmacy chains (e.g., MedPlus, Apollo) cannot operate multiple outlets or transfer inventory across locations.
  2. **Unvalidated Drug Names:** Both `PrescriptionItem.medicine` and `BillItem.medicine` accept arbitrary free-text strings without validation against an approved formulary (e.g., CDSCO/FDA dictionary, RxNorm). Typographical errors in drug names prevent automated drug-interaction checking and refill reminder matching.
- **Impact:**
  Platform cannot scale to multi-store pharmacy enterprises, and lack of formulary standard impedes interoperability with external healthcare exchanges (e.g., ABDM - Ayushman Bharat Digital Mission).
- **Remediation:**
  1. Introduce `Organization` entity with 1:N `ShopBranch` relations.
  2. Seed a standard CDSCO essential medicines dictionary and provide autocomplete endpoints (`GET /catalog/medicines?query=...`).

---

### FLAG-DEV-07: Health Check Readiness Deficit & Missing Observability Stack
- **Severity:** **LOW**
- **Category:** DevOps / Site Reliability / Observability
- **Affected Files:**
  - [`apps/server/src/routes.ts:16-32`](file:///c:/Users/ramav/Documents/PROJECTS/ANVAYA/apps/server/src/routes.ts#L16-L32)
  - [`apps/server/src/app.ts:47-50`](file:///c:/Users/ramav/Documents/PROJECTS/ANVAYA/apps/server/src/app.ts#L47-L50)
- **Evidence:**
  1. In `apps/server/src/routes.ts`:
     ```typescript
     router.get('/health', async (_req, res) => {
       let dbStatus = 'disconnected';
       try {
         await prisma.$queryRaw`SELECT 1`;
         dbStatus = 'connected';
       } catch (error) {
         dbStatus = 'error';
       }
       res.status(200).json({ status: 'ok', database: dbStatus, ... });
     });
     ```
     Even when `dbStatus` is `'error'`, HTTP status is **200 OK**. A load balancer or Kubernetes readiness probe polling `/health` will keep routing traffic to an instance that cannot access the database.
  2. Logging uses standard `morgan` to stdout with no JSON structuring, request IDs (`X-Request-ID`), or log levels.
  3. No Prometheus metrics (`/metrics`) or OpenTelemetry tracing is configured.
- **Impact:**
  Failover and automated container restarts cannot trigger accurately on database disconnection. Production troubleshooting lacks distributed trace correlation.
- **Remediation:**
  1. Split into `/health/live` (returns 200 if process alive) and `/health/ready` (returns 503 Service Unavailable if database is unreachable).
  2. Adopt structured logging with `pino` and inject correlation IDs.

---

### FLAG-DEV-08: Specification Drift Across PRD, API Documentation, and Database Schema
- **Severity:** **LOW**
- **Category:** Documentation & Developer Experience
- **Affected Files:**
  - [`docs/PRD.md`](file:///c:/Users/ramav/Documents/PROJECTS/ANVAYA/docs/PRD.md)
  - [`docs/API.md`](file:///c:/Users/ramav/Documents/PROJECTS/ANVAYA/docs/API.md)
  - [`docs/DATABASE.md`](file:///c:/Users/ramav/Documents/PROJECTS/ANVAYA/docs/DATABASE.md)
- **Evidence:**
  1. `docs/API.md` documents `/directory/doctors` and `/directory/shops`, but routes in `routes.ts` mount `usersRoutes` both at `/directory` and at `/` (`/shops`, `/doctors`), leading to dual paths for provider directories.
  2. `docs/DATABASE.md` documents `AuditLog` fields `resource` and `resourceId`, but does not document `RefreshToken` table or the migration history.
  3. `docs/PRD.md` describes the product as a complete web + mobile solution, but does not disclose that Doctor, Pharmacy, and Patient portals exist solely on mobile.
- **Impact:**
  Integrators and frontend engineers face conflicting documentation regarding endpoint routes and platform capabilities.
- **Remediation:**
  Regenerate API documentation using OpenAPI/Swagger specs derived directly from Zod route schemas.

---

## 3. Disagreements with Earlier QA Reports

An exhaustive comparison was performed between the assertions in [`docs/QA_REPORT.md`](file:///c:/Users/ramav/Documents/PROJECTS/ANVAYA/docs/QA_REPORT.md) and the findings of this independent audit.

| Item | Earlier QA Report Claim | Independent Audit Reality | Verdict / Severity |
|---|---|---|---|
| **PostgreSQL Test Suite** | "Server Automated Test Suite: 122 passed out of 122 tests (100% pass rate)" implies comprehensive validation. | All 122 tests executed exclusively against in-memory JavaScript arrays. Running `TEST_DB=postgres` fails fast with 11 failing suites because no database server is running on `localhost:5432`. | **DISAGREEMENT (CRITICAL)**. Production database integration has 0% automated test verification. |
| **Mobile Health Report Preview** | Claimed all mobile clinical features functional and verified. | Tapping a health report on mobile calls `Linking.openURL` without auth headers, immediately returning HTTP 401 Unauthorized in the user's browser. | **DISAGREEMENT (HIGH)**. Core patient record retrieval is non-functional on mobile. |
| **TypeScript Strictness** | "0 errors across all 4 workspaces (`@anvaya/shared`, `apps/server`, `apps/web`, `apps/mobile`)." | `apps/mobile/tsconfig.json` has `strict: false`, suppressing strict null checks, unchecked index accesses, and implicit any types across 16,000+ lines. | **DISAGREEMENT (MEDIUM)**. Claim of universal type safety masked loose mobile compiler settings. |
| **Reverse Proxy Rate Limiting** | "All rate limiters verified." | Rate limiters were tested only via direct local Supertest calls. `app.get('trust proxy')` is disabled in `app.ts`, which collapses all clients to the proxy IP in real deployments. | **DISAGREEMENT (HIGH)**. Real-world reverse proxy deployment causes DoS to legitimate clients. |
| **Web Application Scope** | PRD and QA documents describe a complete paperless healthcare system. | The web app (`apps/web`) is strictly an Admin verification portal and landing page. Clinical Doctor, Pharmacy, and Patient portals do not exist on the web. | **CLARIFICATION (MEDIUM)**. Omission of clinical web interfaces should be explicitly documented. |

---

## 4. Feature Completeness Matrix

This matrix evaluates feature coverage against the specifications in [`docs/PRD.md`](file:///c:/Users/ramav/Documents/PROJECTS/ANVAYA/docs/PRD.md).

| Persona | Feature / Workflow Requirement | Server API Status | Web Portal Status | Mobile App Status | Completeness Rating |
|---|---|---|---|---|:---:|
| **Doctor** | Registration with Medical Council Reg No. | ✅ `POST /auth/register` | ❌ Not Implemented | ✅ `app/(auth)/register.tsx` | **80%** (Mobile only) |
| **Doctor** | Pending Verification Lockdown Screen | ✅ Guard enforced | ❌ Not Implemented | ✅ `pending-verification.tsx` | **80%** (Mobile only) |
| **Doctor** | Appointment Queue & Status Transitions | ✅ `GET/PATCH /appointments` | ❌ Not Implemented | ✅ `app/(doctor)/appointments.tsx`| **80%** (Mobile only) |
| **Doctor** | E-Prescription Generator with Medicines | ✅ `POST /prescriptions` | ❌ Not Implemented | ✅ `new-prescription.tsx` | **80%** (Mobile only) |
| **Doctor** | Cryptographic QR & Human Code Issuance | ✅ SHA-256 + Code gen | ❌ Not Implemented | ✅ Integrated in issuance | **90%** (Full mobile) |
| **Doctor** | Review Patient Reports with Consent | ✅ `GET /reports?patientId=`| ❌ Not Implemented | ⚠️ List only; no viewer | **60%** (Viewer gap) |
| **Doctor** | Prescription Amendment / Voiding | ❌ Cancel only | ❌ Not Implemented | ❌ Cancel only | **30%** (Functional gap)|
| **Pharmacy** | Registration with State Drug License | ✅ `POST /auth/register` | ❌ Not Implemented | ✅ `app/(auth)/register.tsx` | **80%** (Mobile only) |
| **Pharmacy** | Verification Workflow & Guarding | ✅ Guard enforced | ❌ Not Implemented | ✅ `pending-verification.tsx` | **80%** (Mobile only) |
| **Pharmacy** | Prescription QR Scan & Dispensing | ✅ `POST /prescriptions/dispense`| ❌ Not Implemented | ✅ `scan-prescription.tsx` | **90%** (Full mobile) |
| **Pharmacy** | Digital Invoicing (UPI, Cash, Khata) | ✅ `POST /billing/bills` | ❌ Not Implemented | ✅ `billing.tsx` & `invoices.tsx`| **90%** (Full mobile) |
| **Pharmacy** | Khata (Credit Ledger) Reconciliations | ✅ `GET/POST /billing/ledger`| ❌ Not Implemented | ✅ `ledger.tsx` | **90%** (Full mobile) |
| **Pharmacy** | Refill Reminder Notifications | ✅ `refillReminders.ts` | ❌ Not Implemented | ✅ `refill-reminders.tsx` | **85%** (Cron job) |
| **Pharmacy** | Inventory & Stock Catalog Tracking | ❌ Free-text medicines | ❌ Not Implemented | ❌ Free-text inputs | **20%** (Missing feature)|
| **Patient** | Instant Onboarding & Profile Setup | ✅ `POST /auth/register` | ❌ Not Implemented | ✅ `app/(auth)/register.tsx` | **80%** (Mobile only) |
| **Patient** | Prescription Wallet & QR Presentation | ✅ `GET /prescriptions` | ❌ Not Implemented | ✅ `wallet.tsx` & `[id].tsx` | **90%** (Full mobile) |
| **Patient** | Appointment Booking with Verified Doctors | ✅ `POST /appointments` | ❌ Not Implemented | ✅ `appointments.tsx` | **70%** (No slot logic) |
| **Patient** | Pharmacy Directory & Operating Hours | ✅ `GET /shops` | ❌ Not Implemented | ✅ `shops.tsx` | **90%** (Full mobile) |
| **Patient** | Digital Health Vault (Lab / Discharge) | ✅ `POST /reports` | ❌ Not Implemented | ⚠️ Upload works; View 401 | **50%** (View broken) |
| **Patient** | Granular Doctor Consent Management | ✅ `GET/POST /consent` | ❌ Not Implemented | ✅ `consent.tsx` | **90%** (Full mobile) |
| **Admin** | Review Pending Doctors & Pharmacies | ✅ `GET /admin/pending-verifications`| ✅ `AdminVerificationsPage.tsx`| ❌ Not intended | **100%** (Full Web) |
| **Admin** | Provider Approval / Rejection with Reason | ✅ `POST /admin/verify/:role/:id`| ✅ Verified with modal | ❌ Not intended | **100%** (Full Web) |
| **Admin** | User Suspension & Token Invalidation | ✅ `POST /admin/users/:id/suspend`| ✅ `AdminUsersPage.tsx` | ❌ Not intended | **100%** (Full Web) |
| **Admin** | System Audit Log Inspection | ✅ `GET /admin/audit-logs` | ✅ `AdminAuditPage.tsx` | ❌ Not intended | **100%** (Full Web) |

---

