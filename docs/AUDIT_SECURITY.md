# ANVAYA Independent Security Audit Report

**Report Version:** 1.0.0 (Independent Audit)  
**Audit Date:** October 27, 2026  
**Audited Target:** ANVAYA Healthcare Monorepo (`apps/server`, `apps/web`, `apps/mobile`, `packages/shared`)  
**Auditor:** Independent Security & Architecture Review  
**Branch:** `audit/independent` (branched from `main` @ `91ad4fb`)  
**Overall Verdict:** ⚠️ **CONDITIONALLY SECURE IN-MEMORY; ARCHITECTURAL & ENVIRONMENT GAPS IDENTIFIED**

---

## 1. Executive Summary & Security Scorecard

An independent, rigorous security evaluation was conducted on the ANVAYA paperless healthcare platform. This audit evaluated the codebase as-is against authorization boundaries, authentication lifecycles, data minimization rules, injection vectors, input validation, supply-chain hygiene, and business-logic abuse.

While core access-control logic (IDOR protections, role gates, single-use prescription dispensing) is robust and passes automated suites, critical architectural gaps exist:
1. **Network & Proxy Rate Limiting:** The Express server does not configure `trust proxy`. Behind any production reverse proxy or load balancer, client IP addresses collapse to the proxy socket, defeating IP-based rate limiting on sensitive public endpoints (`/prescriptions/verify`, `/auth/login`).
2. **Session Persistence on Main Branch:** Refresh tokens on `main` are stored exclusively in a volatile in-memory array (`inMemoryDb.refreshTokens`). Server restarts eradicate all refresh tokens and revocation states.
3. **PostgreSQL Validation Blocked:** The database layer test suite (`TEST_DB=postgres`) could not be executed because no PostgreSQL service was running on the host environment (`localhost:5432`), leaving production database ORM queries with 0% automated test coverage.
4. **Mobile Type Safety Disabled:** `apps/mobile/tsconfig.json` has `strict: false`, disabling strict null checks and type safety across 16,000+ lines of client code.

### Security Scorecard

```
================================================================================
                    INDEPENDENT SECURITY AUDIT SCORECARD
================================================================================
  Overall Security Posture : CONDITIONALLY SECURE (IN-MEMORY ONLY)
  Automated In-Memory Tests: 122 / 122 PASSED (100%)
  PostgreSQL Test Suite    : BLOCKED (Database offline at localhost:5432)
  IDOR Matrix Verification : 16 / 16 SCENARIOS ENFORCED (403 Forbidden)
  Mass-Assignment Guard   : VERIFIED (Strict Zod Schemas & Param Isolation)
  Static Analysis (SAST)   : 2 Medium Findings (HTML template escaping)
  Secret Scan (Full Git)   : 87 Matches (86 False Positives, 1 Dev Config)
================================================================================
  Identified Security Flags by Severity:
    • CRITICAL : 0 Active Exploitable Vulnerabilities (Tar CVE resolved)
    • HIGH     : 2 Flags (FLAG-SEC-01: Trust Proxy; FLAG-SEC-02: Refresh DB Schema)
    • MEDIUM   : 3 Flags (FLAG-SEC-03: Multer Filter; FLAG-SEC-04: Magic Bytes;
                          FLAG-SEC-05: Push Payload Resiliency)
    • LOW      : 3 Flags (FLAG-SEC-06: Mobile TS Strict; FLAG-SEC-07: Dev .env;
                          FLAG-SEC-08: Action & Image Pinning)
================================================================================
```

---

## 2. Identified Security Flags (FLAGS First)

Every finding below details the severity, category, affected files, exact evidence, technical impact, and concrete remediation steps.

---

### FLAG-SEC-01: Express Trust Proxy Disabled (Rate Limiter Collapse)
- **Severity:** **HIGH**
- **Category:** Network Architecture / Denial of Service / Anti-Abuse
- **Affected File:** [`apps/server/src/app.ts:20-60`](file:///c:/Users/ramav/Documents/PROJECTS/ANVAYA/apps/server/src/app.ts#L20-L60)
- **Evidence:**
  `app.get('trust proxy')` returns `undefined` (disabled).
  ```typescript
  // apps/server/src/app.ts
  const app = express();
  // Missing: app.set('trust proxy', 1);
  const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 });
  ```
  Verified via `scripts/audit/run-manual-security-checks.js` (`rateLimitingProxy` check failed).
- **Impact:**
  When deployed behind a reverse proxy (Nginx, AWS ALB, Cloudflare, Traefik, Docker ingress), Express defaults to reading client IP from `req.socket.remoteAddress`. Every user shares the reverse proxy's private IP. Consequently:
  - If one pharmacy makes 30 failed `/prescriptions/verify` attempts, **all pharmacies** behind the proxy are blocked (DoS).
  - An attacker can spoof `X-Forwarded-For` headers without validation.
- **Remediation:**
  Add `app.set('trust proxy', config.isProduction ? 1 : false);` in `apps/server/src/app.ts`. Ensure rate limiters that protect authenticated routes key on `req.user.userId` rather than client IP.

---

### FLAG-SEC-02: Refresh Token Revocations Stored Only in Memory on `main`
- **Severity:** **HIGH**
- **Category:** Authentication & Session Integrity
- **Affected Files:**
  - [`apps/server/prisma/schema.prisma`](file:///c:/Users/ramav/Documents/PROJECTS/ANVAYA/apps/server/prisma/schema.prisma)
  - [`apps/server/src/modules/auth/auth.service.ts:320-390`](file:///c:/Users/ramav/Documents/PROJECTS/ANVAYA/apps/server/src/modules/auth/auth.service.ts#L320-L390)
  - [`apps/server/src/db/inMemoryDb.ts:175-210`](file:///c:/Users/ramav/Documents/PROJECTS/ANVAYA/apps/server/src/db/inMemoryDb.ts#L175-L210)
- **Evidence:**
  On the `main` branch, `prisma/schema.prisma` contains no `RefreshToken` model. `inMemoryDb.refreshTokens` is an in-memory array `DbRefreshToken[]`. In `AuthService`:
  ```typescript
  // When isDbConnected() is true:
  const tokenRecord = await prisma.refreshToken.findUnique(...) // Prisma Client has no RefreshToken model on main!
  ```
- **Impact:**
  On server restart, container redeploy, or auto-scaling event:
  - All revoked refresh tokens (from user logout or administrator suspension) are wiped.
  - Active users have their refresh tokens lost, causing widespread forced logouts.
  - Stolen refresh tokens that were previously revoked become invalid or behave unpredictably across restarts.
- **Remediation:**
  Commit and migrate the `RefreshToken` table schema:
  ```prisma
  model RefreshToken {
    id        String    @id @default(uuid())
    userId    String
    user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
    hash      String    @unique
    expiresAt DateTime
    revokedAt DateTime?
    createdAt DateTime  @default(now())

    @@index([userId, revokedAt])
    @@index([hash])
  }
  ```

---

### FLAG-SEC-03: Missing Multer File Filter on Report Upload Endpoint
- **Severity:** **MEDIUM**
- **Category:** Input Validation / Unrestricted File Upload
- **Affected File:** [`apps/server/src/modules/reports/report.routes.ts:13-18`](file:///c:/Users/ramav/Documents/PROJECTS/ANVAYA/apps/server/src/modules/reports/report.routes.ts#L13-L18)
- **Evidence:**
  ```typescript
  // apps/server/src/modules/reports/report.routes.ts
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    // Missing: fileFilter
  });
  ```
- **Impact:**
  While `LocalStorageService` performs downstream MIME and extension checks before saving to disk, Multer accepts and buffers arbitrary binary payloads (e.g., 10MB `.exe`, `.zip`, `.iso`) into Node.js process heap memory before reaching the service layer. Multiple concurrent invalid uploads can cause Node.js heap exhaustion (OOM).
- **Remediation:**
  Add a strict `fileFilter` directly to the Multer instance in `report.routes.ts`:
  ```typescript
  const ALLOWED_MIMES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (ALLOWED_MIMES.includes(file.mimetype.toLowerCase())) {
        cb(null, true);
      } else {
        cb(new BadRequestError('Only PDF, JPEG, and PNG files are accepted'));
      }
    },
  });
  ```

---

### FLAG-SEC-04: File Storage Relies on Client Mime & Extension (No Magic Byte Check)
- **Severity:** **MEDIUM**
- **Category:** Input Validation / File Security
- **Affected File:** [`apps/server/src/services/storage/localStorage.service.ts:58-65`](file:///c:/Users/ramav/Documents/PROJECTS/ANVAYA/apps/server/src/services/storage/localStorage.service.ts#L58-L65)
- **Evidence:**
  ```typescript
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype.toLowerCase();

  if (!this.allowedMimeTypes.has(mime) || !this.allowedExtensions.has(ext)) {
    throw new BadRequestError('Invalid file type. Only PDF, JPG, and PNG documents are allowed.');
  }
  ```
- **Impact:**
  MIME types (`file.mimetype`) and original extensions (`file.originalname`) are client-supplied strings. A malicious actor can upload an HTML file or script renamed with `.pdf` extension and `application/pdf` MIME header. If served directly or viewed in a web browser, this can enable stored Cross-Site Scripting (XSS).
- **Remediation:**
  Inspect initial magic bytes of the file buffer:
  - PDF: `%PDF` (`0x25 0x50 0x44 0x46`)
  - PNG: `0x89 0x50 0x4E 0x47`
  - JPEG: `0xFF 0xD8 0xFF`

---

### FLAG-SEC-05: Push Notification Worker Network Failure Handling
- **Severity:** **MEDIUM**
- **Category:** Resilience / Third-Party External Dependency
- **Affected File:** [`apps/server/src/jobs/refillReminders.ts:50-80`](file:///c:/Users/ramav/Documents/PROJECTS/ANVAYA/apps/server/src/jobs/refillReminders.ts#L50-L80)
- **Evidence:**
  ```typescript
  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    await expo.sendPushNotificationsAsync(chunk);
  }
  ```
  On `main`, there is no `NODE_ENV === 'test'` guard; if the Expo push gateway experiences timeouts or rate limits during automated jobs, the reminder loop can fail midway without completing remaining patient reminder updates.
- **Impact:**
  Failure to deliver medicine refill notifications; transient gateway errors can leave reminders in pending state indefinitely.
- **Remediation:**
  Wrap individual chunk dispatch in exponential backoff retry and catch per-ticket notification delivery receipts.

---

### FLAG-SEC-06: Mobile Workspace TypeScript Strictness Disabled
- **Severity:** **LOW**
- **Category:** Code Quality / Type Safety
- **Affected File:** [`apps/mobile/tsconfig.json`](file:///c:/Users/ramav/Documents/PROJECTS/ANVAYA/apps/mobile/tsconfig.json)
- **Evidence:**
  Evidence from `docs/audit-evidence/ts-strictness.txt`:
  ```
  Workspace: apps/mobile
  - Strict Mode: false
  - noImplicitAny: false
  - strictNullChecks: false
  - Files scanned: 36 (16,066 lines)
  - any occurrences: 44
  ```
- **Impact:**
  Runtime `undefined is not an object` or null-pointer crashes on mobile client devices during critical patient checkout or prescription scanning workflows.
- **Remediation:**
  Enable `"strict": true` in `apps/mobile/tsconfig.json` and fix the resulting type strictness errors.

---

### FLAG-SEC-07: Default Development Secrets in Repository `.env`
- **Severity:** **LOW**
- **Category:** Credential Hygiene
- **Affected Files:**
  - [`apps/server/.env`](file:///c:/Users/ramav/Documents/PROJECTS/ANVAYA/apps/server/.env)
  - [`.env.example`](file:///c:/Users/ramav/Documents/PROJECTS/ANVAYA/.env.example)
- **Evidence:**
  Found in `docs/audit-evidence/secrets-scan-summary.txt`:
  `DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/anvaya?schema=public"`
  `JWT_ACCESS_SECRET="dev_access_secret_anvaya_jwt_access_token_min_32_chars"`
- **Impact:**
  If a developer deploys the application with default `.env` files without overriding environment variables in production, attackers can forge JWT tokens or connect to default database ports.
- **Remediation:**
  Enforce a fatal startup error in `apps/server/src/config/index.ts` if `NODE_ENV === 'production'` and secrets contain known default values (`dev_`, `postgrespassword`).

---

### FLAG-SEC-08: Unpinned Actions & Docker Base Image Tags
- **Severity:** **LOW**
- **Category:** Supply-Chain Security
- **Affected Files:**
  - [`.github/workflows/ci.yml:38-42`](file:///c:/Users/ramav/Documents/PROJECTS/ANVAYA/.github/workflows/ci.yml#L38-L42)
  - [`apps/server/Dockerfile:4`](file:///c:/Users/ramav/Documents/PROJECTS/ANVAYA/apps/server/Dockerfile#L4)
- **Evidence:**
  - CI uses `actions/checkout@v4` and `actions/setup-node@v4` (major tag rather than immutable commit SHA).
  - Dockerfile uses `node:20-alpine` (mutable tag rather than SHA digest).
- **Impact:**
  Upstream tag mutation or compromised action releases can inject malicious code into CI pipelines or production container images.
- **Remediation:**
  Pin actions to commit SHAs (e.g., `actions/checkout@b4ffde... # v4.1.1`) and Docker base images to `@sha256:...`.

---

## 3. Analysis of Existing Audit Evidence

### 3.1 `secrets-scan.json` (Real vs. False Positives)
- **Total Working Tree Candidates:** 87
- **Total Git History Diff Candidates:** 87
- **Real / Actionable Secrets Identified:** **1** (`apps/server/.env` local database credential).
- **False Positives (86 total):**
  - Storage key names: `anvaya_auth_token` and `anvaya_refresh_token` in `apps/mobile/services/storage.ts` (string keys, not secret values).
  - Test fixtures: Hardcoded test passwords (`'Password123'`, `'testpass'`) in `*.test.ts` and `scripts/qa/*.ts`.
  - Documentation snippets in `README.md`, `API.md`, and `QA_REPORT.md`.
  - Audit scripts: regex strings in `scan-secrets.js`.
- **Secret Redaction Compliance:** Verified. All values in `docs/audit-evidence/secrets-scan.json` and summaries are redacted (`[REDACTED]`).

### 3.2 `npm-audit-root` (Reachable at Runtime vs. Build-Time)
- **`tar` (GHSA-34x7-hfp2-rc4v):** **CRITICAL**. Fixed via root `overrides: { "tar": "7.5.22" }`. Confirmed 0 critical vulnerabilities remaining.
- **`postcss` / `@expo/metro-config` / `@expo/cli`:** **HIGH**. Build-time only. Used by Metro/Babel bundlers during mobile compilation. Never bundled or executed on the production server.
- **`image-size`:** **HIGH**. Build-time only. Used by `@expo/cli` for asset size measurement.
- **`node-forge`:** **HIGH**. Build-time only. Used by Metro bundler for local development HTTPS self-signed certificates.
- **`uuid` (<11.1.1):** **MODERATE**. Server uses `uuid.v4()` (random UUID generator). The vulnerability affects v3/v5/v6 when custom pre-allocated buffers are supplied. Runtime risk is negligible.
- **`zod` (<4.6.6):** **HIGH**. Potential memory exhaustion on unbounded constrained arrays. Server mitigates this with body-parser limits (`10mb`) and explicit length limits (`max(30)` on prescription items, `max(100)` on bill items).

### 3.3 TypeScript Strictness Audit
- `packages/shared`: **100% Strict** (strict: true, 0 any casts).
- `apps/server`: **100% Strict** (strict: true, 0 @ts-ignore, 14 as any casts across 11,270 lines).
- `apps/web`: **100% Strict** (strict: true, 2 as any casts across 3,517 lines).
- `apps/mobile`: **0% Strict** (`strict: false`, `noImplicitAny: false`, `strictNullChecks: false`). Represents a major dev gap.

### 3.4 Dependency Hygiene
- Detected unused dependencies in `apps/mobile`: `@hookform/resolvers`, `date-fns`, `expo-location`, `query-string`, `react-dom`, `react-hook-form`, `react-native-is-edge-to-edge`, `react-native-svg`, `react-native-web`.
- Lifecycle scripts verified safe: `@prisma/client`, `@prisma/engines`, and `prisma` download binaries for Prisma ORM.

### 3.5 TODO Inventory
- 18 total items (9 TEMP, 1 XXX, 8 MOCK).
- Zero backdoors or unaddressed security TODOs in server codebase.

---

## 4. Manual Security & Business Logic Review

Verified using [`docs/audit-evidence/route-inventory.md`](file:///c:/Users/ramav/Documents/PROJECTS/ANVAYA/docs/audit-evidence/route-inventory.md) across all 56 routes with automated verification script [`scripts/audit/run-manual-security-checks.js`](file:///c:/Users/ramav/Documents/PROJECTS/ANVAYA/scripts/audit/run-manual-security-checks.js).

### 4.1 Insecure Direct Object Reference (IDOR) Matrix
Every ID-bearing route was evaluated using 2 Patients (A and B), 2 Doctors (A and B), 2 Pharmacy Shops (A and B), and 1 Administrator:

| Route Under Test | Actor Attempting Access | Target Resource | Result Status | Expected | Outcome |
| :--- | :--- | :--- | :---: | :---: | :---: |
| `GET /prescriptions/:id` | Unrelated Patient B | Patient A Prescription | **403 Forbidden** | 403 | **PASS** |
| `GET /prescriptions/:id` | Unconsented Doctor B | Patient A Prescription | **403 Forbidden** | 403 | **PASS** |
| `GET /prescriptions/:id` | Pharmacy Shop A | Patient A Prescription | **403 Forbidden** | 403 | **PASS** (Must use `/verify`) |
| `GET /prescriptions/:id` | System Administrator | Patient A Prescription | **403 Forbidden** | 403 | **PASS** (Privacy Gate) |
| `PATCH /prescriptions/:id/cancel` | Non-issuing Doctor B | Patient A Prescription | **403 Forbidden** | 403 | **PASS** |
| `GET /appointments/:id` | Unrelated Patient B | Appointment A | **403 Forbidden** | 403 | **PASS** |
| `GET /appointments/:id` | Unrelated Doctor B | Appointment A | **403 Forbidden** | 403 | **PASS** |
| `PATCH /appointments/:id/status` | Unrelated Patient B | Appointment A Status | **403 Forbidden** | 403 | **PASS** |
| `GET /billing/bills/:id` | Unrelated Patient B | Bill A (Patient A) | **403 Forbidden** | 403 | **PASS** |
| `GET /billing/bills/:id` | Unrelated Shop B | Shop A Bill | **403 Forbidden** | 403 | **PASS** |
| `GET /billing/ledger/balance/:patientId` | Unrelated Patient B | Patient A Ledger | **403 Forbidden** | 403 | **PASS** |
| `DELETE /refills/:id` | Unrelated Patient B | Refill A | **403 Forbidden** | 403 | **PASS** |
| `DELETE /refills/:id` | Unrelated Shop B | Shop A Refill | **403 Forbidden** | 403 | **PASS** |
| `GET /reports/:id` | Unrelated Patient B | Patient A Report Metadata | **403 Forbidden** | 403 | **PASS** |
| `DELETE /reports/:id` | Unrelated Patient B | Patient A Report | **403 Forbidden** | 403 | **PASS** |
| `GET /reports/:id` | System Administrator | Patient Clinical Report | **403 Forbidden** | 403 | **PASS** (Privacy Gate) |

**Result:** **16 of 16 IDOR attack scenarios rejected with HTTP 403 Forbidden.**

### 4.2 Mass Assignment & Parameter Pollution
- **Role Escalation in Registration:** Injected `{ role: 'ADMIN', isVerified: true, verificationStatus: 'APPROVED' }` into `POST /auth/register`. Request rejected with **HTTP 400 Bad Request**; Zod discriminated union prevents elevation to ADMIN.
- **Appointment Foreign Key Tampering:** Injected foreign IDs `{ doctorId: 'attacker-id', patientId: 'victim-id' }` into `PATCH /appointments/:id/status`. Verified that neither `doctorId` nor `patientId` was mutated.

### 4.3 JWT & Authentication Abuse
- **`alg: none` Signature Bypass:** Sent JWT with header `{"alg":"none"}` to `GET /auth/me`. Rejected with **HTTP 401 Unauthorized**.
- **Tampered Signature:** Modified token signature bits. Rejected with **HTTP 401 Unauthorized**.
- **Suspended User Revocation:** Admin suspension of a user immediately revokes both access tokens and refresh tokens on the subsequent request (HTTP 401).

### 4.4 Business Logic & Financial Integrity
- **Single-Use Dispense Replay Guard:** Second dispense attempt of prescription `rxCode` immediately returned **HTTP 400 Bad Request (Fraud Alert)**. Double fulfillment is strictly prevented.
- **Concurrent Ledger Transactions:** 10 simultaneous credit transactions of ₹10 each against Patient A updated the ledger balance from ₹150 to ₹250 with zero dropped updates.
- **Push Notification Privacy:** Refill notification payload excludes patient clinical diagnosis; only generic reminder messaging is sent over APNs/FCM.

---

## 5. Disagreements & Reconciliations with Earlier QA Reports

During this audit, earlier QA documents (`docs/QA_REPORT.md` and `docs/QA_REPORT_initial.md`) were cross-referenced with the active codebase on `main`. The following discrepancies were identified:

1. **Refresh Token Persistence Claim (`FLAG-02` / `TOKEN-RESTART`):**
   - *Earlier QA Report Claim:* "Verified. Refresh token revocations are persisted to database schema (RefreshToken table with userId, hash, expiresAt, revokedAt) and survive server reboots."
   - *Independent Audit Finding:* **DISAGREEMENT.** On the `main` branch, the `RefreshToken` table does not exist in `prisma/schema.prisma`. It was only staged in uncommitted workspace files. On `main`, revocations live exclusively in memory and do not survive a server restart.
2. **PostgreSQL Test Suite Status (`test:postgres`):**
   - *Earlier QA Report Claim:* Claimed 100% pass across all tests while simultaneously noting Postgres was not run.
   - *Independent Audit Finding:* Clarified. `npm test` runs 122 tests solely against in-memory JavaScript arrays. Running `npm run test:postgres` immediately fails fast with 11 failing suites because PostgreSQL is unreachable.
3. **Mobile TypeScript Health:**
   - *Earlier QA Report Claim:* "0 errors across all 4 workspaces."
   - *Independent Audit Finding:* Technically true that `tsc` exits 0, but misleading: `apps/mobile/tsconfig.json` has `strict: false`, suppressing type errors that would otherwise be flagged under strict mode.

---

## 6. "Not Checked" List (Physical & Production Boundaries)

The following items could not be validated in the local headless environment:
- [ ] **Physical Camera Barcode Scanning:** Scanning physical printed QR codes under varying real-world lighting and camera resolutions on physical iOS/Android devices.
- [ ] **APNs & FCM Remote Push Delivery:** Live end-to-end receipt of APNs/FCM push notifications on a physical lock screen (requires live Apple Developer / Firebase credentials).
- [ ] **S3 Multipart Uploads:** Uploading files to AWS S3 buckets (tested with local filesystem storage service).
- [ ] **Hardware Biometric Keystore Storage:** Clearing biometrics on app uninstallation and device migration on physical iOS Keychain and Android Keystore.
- [ ] **Live Postgres High-Concurrency Load Testing:** Under 500+ simultaneous database connections (Postgres daemon was offline).

---

## 7. Phased Remediation Order

```mermaid
graph TD
    P1[Phase 1: Immediate Security Hardening] --> P2[Phase 2: Input & File Storage Hardening]
    P2 --> P3[Phase 3: Client Strictness & Operations]
    
    subgraph P1[Phase 1: Immediate Security Hardening]
        F1[FLAG-SEC-01: Enable Trust Proxy in Express]
        F2[FLAG-SEC-02: Migrate RefreshToken Table to Postgres Schema]
    end
    
    subgraph P2[Phase 2: Input & File Storage Hardening]
        F3[FLAG-SEC-03: Add Multer fileFilter Middleware]
        F4[FLAG-SEC-04: Implement Magic Byte Verification]
        F5[FLAG-SEC-05: Add Expo Push Chunk Retry & Backoff]
    end
    
    subgraph P3[Phase 3: Client Strictness & Operations]
        F6[FLAG-SEC-06: Enable Strict Mode in Mobile tsconfig]
        F7[FLAG-SEC-07: Add Production Default Credential Guard]
        F8[FLAG-SEC-08: Pin CI Actions and Base Docker Digests]
    end
```

---

## 8. Backlog of Actionable Remediation Tasks

### Task 1: Enable Express Trust Proxy and Key Rate Limiters by User
- **Target File:** [`apps/server/src/app.ts`](file:///c:/Users/ramav/Documents/PROJECTS/ANVAYA/apps/server/src/app.ts)
- **Description:** Add `app.set('trust proxy', config.isProduction ? 1 : false);`. Update `/prescriptions/verify` limiter to track per-authenticated shop user ID where available.
- **Acceptance Criteria:**
  - `app.get('trust proxy')` returns true/1 in production mode.
  - Rate limiting correctly identifies remote IP behind `X-Forwarded-For`.
  - Automated test confirms proxy headers are respected without bypass.

### Task 2: Migrate `RefreshToken` Model to Prisma Schema
- **Target Files:**
  - [`apps/server/prisma/schema.prisma`](file:///c:/Users/ramav/Documents/PROJECTS/ANVAYA/apps/server/prisma/schema.prisma)
  - [`apps/server/src/modules/auth/auth.service.ts`](file:///c:/Users/ramav/Documents/PROJECTS/ANVAYA/apps/server/src/modules/auth/auth.service.ts)
- **Description:** Add `RefreshToken` model with `userId, hash, expiresAt, revokedAt` fields. Update `AuthService` to query and persist refresh tokens in database.
- **Acceptance Criteria:**
  - Running `npx prisma migrate dev` generates migration without drift.
  - Server restart revocation test (`server-restart-revocation.test.ts`) passes consistently.

### Task 3: Add Multer `fileFilter` for Report Uploads
- **Target File:** [`apps/server/src/modules/reports/report.routes.ts`](file:///c:/Users/ramav/Documents/PROJECTS/ANVAYA/apps/server/src/modules/reports/report.routes.ts)
- **Description:** Implement `fileFilter` in Multer configuration rejecting non-whitelisted MIME types (`application/pdf`, `image/jpeg`, `image/png`).
- **Acceptance Criteria:**
  - Uploading `.exe` or text file to `POST /reports/upload` returns HTTP 400 Bad Request before file buffer is allocated.

### Task 4: Add File Magic Byte Inspection
- **Target File:** [`apps/server/src/services/storage/localStorage.service.ts`](file:///c:/Users/ramav/Documents/PROJECTS/ANVAYA/apps/server/src/services/storage/localStorage.service.ts)
- **Description:** Check first 4 bytes of uploaded file buffers to verify PDF (`%PDF`), JPEG (`FF D8 FF`), and PNG (`89 50 4E 47`) headers.
- **Acceptance Criteria:**
  - HTML or executable file disguised as `.pdf` is rejected with HTTP 400.

### Task 5: Enable Strict Mode in Mobile `tsconfig.json`
- **Target File:** [`apps/mobile/tsconfig.json`](file:///c:/Users/ramav/Documents/PROJECTS/ANVAYA/apps/mobile/tsconfig.json)
- **Description:** Enable `"strict": true`, `"noImplicitAny": true`, `"strictNullChecks": true` and resolve any implicit `any` errors.
- **Acceptance Criteria:**
  - `npx tsc --noEmit -p apps/mobile/tsconfig.json` passes with 0 errors under strict mode.
