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
