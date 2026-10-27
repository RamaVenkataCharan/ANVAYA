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
