# ANVAYA 🌿

A paperless healthcare platform connecting **doctors**, **medical shop owners (pharmacies)**, and **patients**. Prescriptions, bills, reports, and appointments are completely digitized, eliminating paper waste, preventing prescription reuse, and safeguarding medical records.

---

## 🏛 Architecture & Monorepo Structure

```
ANVAYA/
├── package.json                  # npm workspaces root
├── .env.example                  # Environment configuration template
├── docs/                         # Architecture & Documentation
│   ├── PRD.md                    # Product Requirements Document
│   ├── API.md                    # REST API Reference
│   └── DATABASE.md               # PostgreSQL Schema & Data Model
├── packages/
│   └── shared/                   # Shared TypeScript models, Enums, Zod validation
│       ├── src/
│       │   ├── enums.ts          # Roles, Verification, Prescription status
│       │   ├── schemas/          # Zod validation schemas
│       │   └── types/            # Shared TypeScript interfaces
│       └── package.json
└── apps/
    ├── server/                   # Express + TypeScript + Prisma API
    │   ├── prisma/
    │   │   └── schema.prisma     # Complete relational data model
    │   ├── src/
    │   │   ├── config/           # App & Prisma configs
    │   │   ├── middleware/       # Auth, Role Guard, Verification Guard, Audit, Errors
    │   │   ├── modules/
    │   │   │   ├── auth/         # Register, Login, Refresh, Logout
    │   │   │   ├── admin/        # Doctor & Pharmacy verification approval
    │   │   │   └── users/        # Pharmacy & Doctor directories
    │   │   ├── utils/            # JWT, bcrypt, custom error classes
    │   │   ├── routes.ts         # API routes gateway
    │   │   └── index.ts          # Express server entry point
    │   └── package.json
    └── mobile/                   # Expo React Native App (all 3 roles)
        ├── app.json
        └── package.json
```

---

## 🚀 Key Features

### 👨‍⚕️ Doctor
- Role-based clinical registration with Medical Registration Number verification.
- Create tamper-proof e-prescriptions with cryptographic QR codes and human-readable tokens.
- Manage appointment schedule.
- Access patient historical records only with explicit digital patient consent.

### 💊 Medical Shop Owner (Pharmacy)
- Register with State Drug License Number verification.
- Scan prescription QR code or enter code to inspect medicines.
- Instant dispensing action that locks prescription status to `DISPENSED`, permanently preventing fraud or reuse.
- Issue digital invoices with tax calculations and multiple payment channels (Cash, UPI, Card, Khata).
- Khata (Ledger) tracking for credit accounts and pending dues.
- Refill reminder alerts for chronic patients.

### 🧑 Patient
- Instant onboarding with digital prescription wallet.
- Find verified pharmacy shops with operating hours, phone, and addresses.
- Book appointments with verified specialists.
- Digital vault for lab reports, imaging scans, and invoices.
- Grant or revoke doctor access to personal health history.

### 🛡 Admin & Verification Safeguards
- Medical practitioner credentials and pharmacy drug licenses require verification approval.
- Built-in verification guard middleware ensures unverified practitioners cannot prescribe or dispense medications until approved.

---

## 🛠 Getting Started

### 1. Prerequisites
- **Node.js**: v20 or v22
- **PostgreSQL**: Local instance or Docker container

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/RamaVenkataCharan/ANVAYA.git
cd ANVAYA

# Install workspace dependencies
npm install
```

### 3. Server Configuration & Database
```bash
# Copy environment variables
cp .env.example apps/server/.env

# Generate Prisma Client
npm run db:generate

# Run Database Migrations
npm run db:migrate

# Start Backend Dev Server
npm run dev:server
```

The API will be live at `http://localhost:4000/api/v1`.

### 4. Running the Mobile App
```bash
cd apps/mobile
npx expo start
```

---

## 🔒 Security & Privacy
- **Role-Based Access Control (RBAC)** on every endpoint.
- **Verification Guard**: Doctors and Pharmacies remain `PENDING` until administrative review.
- **Refresh Token Rotation**: SHA-256 hashed refresh tokens stored in database with automatic revocation upon rotation.
- **Comprehensive Audit Trail**: Every sensitive medical, billing, and auth event is logged to `AuditLog`.
- **Consent-First Architecture**: Clinical records cannot be accessed without an active consent agreement.
