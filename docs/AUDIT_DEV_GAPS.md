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

