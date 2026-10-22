# ANVAYA - Product Requirements Document (PRD)

## 1. Executive Summary
**ANVAYA** is an integrated, paperless healthcare platform designed to streamline interactions between **Doctors**, **Medical Shop Owners (Pharmacies)**, and **Patients**. By digitizing the end-to-end medical lifecycle—from appointments and e-prescriptions to digital billing, refill reminders, and health record storage—ANVAYA eliminates physical paper prescriptions and lost invoices, combats prescription fraud and reuse, and maintains patient privacy.

---

## 2. User Roles & Personas

### 2.1 Doctor
- **Role Objective**: Deliver clinical care, issue legally compliant e-prescriptions, track appointments, and review patient medical history under strict consent.
- **Key Features**:
  - Sign up with Medical Council Registration Number & Specialization.
  - Verification workflow: Account remains `PENDING` until administrative review.
  - Digital appointment queue & status updates (`SCHEDULED`, `CONFIRMED`, `COMPLETED`, `CANCELLED`).
  - E-prescription generator with structured medicine name, dosage, frequency, duration, quantity, and instructions.
  - Cryptographic QR token and human-readable code generation for every issued prescription.
  - Access patient health reports and diagnostic history only when authorized by patient consent.

### 2.2 Medical Shop Owner (Pharmacy)
- **Role Objective**: Dispense medications accurately, eliminate prescription reuse, manage digital billing/invoices, provide refill reminders, and maintain a credit ledger (Khata).
- **Key Features**:
  - Sign up with State Drug License Number, shop name, address, and operating timings.
  - Verification workflow: Account remains `PENDING` until drug license verification.
  - Scan prescription QR code or enter code to inspect prescription validity and items.
  - One-click prescription dispensing: Immediately locks prescription status to `DISPENSED`, preventing multiple redemptions across pharmacies.
  - Digital invoicing with tax, itemized totals, and multiple payment options (Cash, UPI, Card, Khata).
  - Khata (Ledger) tracking for credit accounts and patient payment reconciliations.
  - Refill reminder alerts for patients with chronic medication needs.

### 2.3 Patient
- **Role Objective**: Securely access personal healthcare records, store e-prescriptions, locate verified pharmacies, book doctor appointments, and manage consent.
- **Key Features**:
  - Immediate sign-up and onboarding (no clinical verification required).
  - Prescription Wallet: View active and past prescriptions with QR code for pharmacy scanning.
  - Appointment booking with verified doctors.
  - Pharmacy directory: Find nearby verified medical shops with timings, address, and contact.
  - Digital vault for lab reports, imaging scans, discharge summaries, and bills.
  - Granular consent control: Grant and revoke clinical access to specific doctors.

### 2.4 System Administrator
- **Role Objective**: Verify credentials of medical practitioners and pharmacies, monitor platform integrity, and review audit logs.
- **Key Features**:
  - Review pending doctor medical registrations and pharmacy drug licenses.
  - Approve or reject applications with audit notes.
  - System-wide audit log inspection and metric oversight.

---

## 3. Core Business & Clinical Workflows

### 3.1 Verification Loop
1. Doctor or Shop signs up via mobile or web client.
2. System sets `verificationStatus = PENDING`.
3. The user can log in and view their pending status screen, but cannot issue prescriptions (Doctor) or dispense prescriptions/bills (Shop).
4. Administrator inspects registration credentials and marks status as `APPROVED`.
5. Practitioner receives instant activation to perform all clinical operations.

### 3.2 The E-Prescription Loop
1. Doctor consults with Patient and creates an e-prescription.
2. System generates:
   - Unique human-readable code (e.g., `ANV-8942-7193`).
   - Tamper-proof cryptographic QR token.
3. Patient receives notification; prescription appears in their mobile Wallet.
4. Patient presents QR code at any verified pharmacy.
5. Pharmacist scans QR code -> system verifies validity and displays medicine details.
6. Pharmacist dispenses medications and confirms fulfillment -> prescription status switches to `DISPENSED`.
7. Pharmacist generates digital bill linked to the prescription; patient receives digital receipt.

### 3.3 Patient Consent Model
- Patient records and history are private by default.
- Doctors cannot query past prescriptions or lab reports unless an active `Consent` record exists between that patient and doctor.
- Patients can revoke consent at any time from their privacy settings.

---

## 4. Non-Functional Requirements
- **Security**: AES-256 for data at rest, TLS 1.3 for data in transit, bcrypt password hashing, JWT token rotation with SHA-256 hashed DB records.
- **Traceability**: Complete immutable `AuditLog` capturing user actions, timestamps, IP addresses, and resource IDs.
- **Performance**: Sub-100ms API response time for prescription QR verification.
