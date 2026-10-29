# ANVAYA Mobile Physical Phone Manual Test Checklist

This checklist provides a rigorous, step-by-step protocol for end-to-end verification of the ANVAYA Mobile Application (Expo SDK 53, React 19, TypeScript strict mode) on a physical iOS or Android smartphone.

---

## 1. Test Environment Setup & Pre-requisites

### 1.1 Local Backend & Network Connectivity
Because mobile devices cannot reach `localhost`, your development machine and physical phone must be on the same local Wi-Fi network.

1. **Find host machine LAN IP**:
   - macOS / Linux: `ifconfig | grep "inet "`
   - Windows: `ipconfig` (e.g. `192.168.1.105`)
2. **Configure Mobile Environment**:
   - Create or update `apps/mobile/.env`:
     ```env
     EXPO_PUBLIC_API_URL=http://<YOUR_LAN_IP>:4000/api/v1
     ```
3. **Start Server with Host Binding**:
   - Ensure `apps/server` is listening on `0.0.0.0` or local network interface:
     ```bash
     cd apps/server
     npm run dev
     ```
4. **Launch Expo Development Server**:
   ```bash
     cd apps/mobile
     npx expo start
   ```
5. **Open on Physical Device**:
   - **Android**: Scan the Metro QR code using the **Expo Go** app (or run custom dev client).
   - **iOS**: Scan the Metro QR code using the iOS Camera app to open in **Expo Go**.

---

## 2. Automated vs. Manual Test Scope

### What Has Been Verified via Automated Bundling & Type Checks
- [x] **TypeScript Strict Mode**: 100% clean check (`strict: true`, `noImplicitAny: true`, `strictNullChecks: true`) with no `@ts-ignore` or blanket `any`.
- [x] **Expo Doctor**: 18/18 health checks passed (dependencies pinned, SDK 53 alignment).
- [x] **Hermes Bytecode Bundles**: Clean export without syntax or runtime module errors for both Android (`dist/_expo/static/js/android/*.hbc`) and iOS (`dist/_expo/static/js/ios/*.hbc`).
- [x] **Server Integration Tests**: Report authenticated download access control, IDOR guards, and cryptographic token verification passing against test database.

### What MUST Be Tested on a Physical Phone
- [ ] **Hardware Camera**: Physical focus, lighting, and real-time barcode decoding (`CameraView` from `expo-camera`).
- [ ] **Native OS Sharing**: Invocation of Android Sharesheet / iOS `UIActivityViewController` (`expo-sharing`).
- [ ] **File System Cache**: Writing binary streams to device sandboxed cache storage (`FileSystem.cacheDirectory`).
- [ ] **Native PDF Renderer**: `expo-print` rendering on iOS WebKit and Android Chromium print spooler.
- [ ] **Network State Transitions**: Airplane mode toggle, offline banner appearance, and reconnect recovery.
- [ ] **Touch & Keyboard Ergonomics**: Min 44pt touch targets, safe area inset handling (Dynamic Island / notch / Android navigation bar), and keyboard avoiding behavior.

---

## 3. Step-by-Step Test Scenarios

---

### Scenario 0: Group A Account & System Test Protocol

#### Step 0.1: Welcome & Onboarding Carousel
1. On fresh launch (or clear storage), verify 3-slide onboarding screen loads with pagination dots.
2. Swipe through Slide 1 (Prescription Vault), Slide 2 (Pharmacy Dispense), Slide 3 (Unified Khata).
3. Tap **"Skip"** or **"Get Started"** -> Verify redirection to Sign In and `has_seen_onboarding` persistence.

#### Step 0.2: Forgot Password Flow (OTP Verification)
1. On Login screen -> Tap **"Forgot Password?"**.
2. Enter registered phone or email -> Tap **"Send Reset Code"**.
3. Check server console for `[DEV OTP PROVIDER]` log displaying verification code `123456`.
4. Enter code `123456`, new password (`Password@456`), confirm password -> Tap **"Reset Password"**.
5. Verify alert confirmation and log in with new password.

#### Step 0.3: Multi-Language Toggle (English & Telugu)
1. Navigate to **Settings** (`/(common)/settings`).
2. Tap **"తెలుగు (Telugu)"** -> Verify all UI labels update to Telugu immediately.
3. Verify `machine-drafted, needs native review` notice.
4. Tap **"English"** -> Verify instant switch back to English.
5. Kill and restart app -> Verify language choice is persisted.

#### Step 0.4: Session Management & Logout All Devices
1. In Settings -> Tap **"Log Out of All Devices"**.
2. Confirm prompt -> Verify server revokes refresh tokens and returns to login.

#### Step 0.5: Provider Rejection & Correction Resubmission
1. Log in with a rejected Doctor or Shop account.
2. Verify immediate redirection to `/(auth)/rejected-verification`.
3. Verify rejection reason is displayed clearly in warning banner.
4. Edit clinic address / store timings and tap **"Update Details & Resubmit"**.
5. Verify status returns to `PENDING` and redirects to Pending Verification screen.

#### Step 0.6: Legal, Help & Data Export
1. In Settings -> Tap **"Legal, Terms & Privacy"**.
2. Verify prominent `DRAFT ONLY — Needs review by qualified person` notice.
3. Open **Help & FAQ** -> Test search filter and expandable question cards.
4. Open **Account Actions** -> Tap **"Generate Data Export"** and verify JSON payload generation.

#### Step 0.7: Group B Patient Flows (Home, Booking, Prescriptions, Bills, Access Log)
1. **Patient Home Redesign (B1)**:
   - Log in as patient.
   - Verify Greeting header with user name and notification bell with unread indicator dot.
   - Verify "Upcoming visit" hero card with doctor avatar, date/time, and "View details" / "Reschedule" buttons.
   - Verify 4 Quick Action cards: "Book Appointment", "My Visits", "Prescriptions", "Reports".
   - Verify "Your health" cards: Vitals and Lab Reports.
2. **Find Doctor & Book (B2)**:
   - Tap "Book Appointment" -> Search doctor by name or specialty.
   - Tap on a doctor card -> Select appointment date chip and time slot chip.
   - Enter consultation reason -> Tap "Book Appointment" -> Verify confirmation and redirect to appointments list.
3. **Appointment Detail & Cancellation (B3b)**:
   - Open appointment detail -> Verify status timeline (SCHEDULED, CONFIRMED, COMPLETED, CANCELLED).
   - Tap "Cancel Appointment" -> Confirm modal -> Verify status updates to CANCELLED.
4. **Prescriptions List & QR Code (B4a, B4b)**:
   - Tap "Prescriptions" -> Filter by ALL, ACTIVE, DISPENSED.
   - Open prescription detail -> Verify QR code generation for pharmacy scan.
5. **My Bills & Share Sheet (B5a, B5b)**:
   - In More -> Tap "Bills" -> View pharmacy bills.
   - Tap a bill to open receipt breakdown -> Tap "Share / Print Receipt" -> Verify native iOS / Android sharesheet invocation.
6. **Refill Reminders (B6)**:
   - In More -> Tap "Refill Reminders" -> Verify repeat intervals -> Tap "Dismiss" to dismiss.
7. **Record Access Log & Audit History (B8)**:
   - Navigate to Consent -> Tap 3rd tab **"Access Log"**.
   - Verify audit entries of healthcare professionals who have viewed medical records.
8. **Pharmacy Directory & Directions (B9a, B9b)**:
   - Navigate to Pharmacy Directory -> Tap a store card.
   - Verify Pharmacy Detail view with phone call and Google Maps directions triggers.

#### Step 0.8: Group C Doctor Flows (Dashboard, Consultation, Templates, Voiding)
1. **Doctor Home Dashboard (C1)**:
   - Log in as verified Doctor.
   - Verify Doctor greeting header with avatar and notification bell with unread indicator dot.
   - Test date navigation: tap `‹` and `›` to move between dates, verify `< Today >` label and formatted date.
   - Verify 3 Summary Cards: Appointments (dark teal), Follow ups (mint), New patient (coral).
   - Verify Patient Queue list showing scheduled time, patient name, chief complaint, and status badges (`Checked in`, `Waiting`, `Scheduled`).
2. **Consultation & Status Progression (C2b)**:
   - Tap a patient in queue -> Open Appointment Detail.
   - Transition status: `SCHEDULED` -> `CHECKED_IN` -> `IN_CONSULTATION` -> `COMPLETED`.
   - Verify status pill updates on screen and on the main dashboard queue.
3. **Patient Clinical Summary & Consent Gate (C3b)**:
   - Tap "View Patient History" -> If no consent, verify "Consent Required" gate and "Request Consent" button.
   - If consented, verify display of blood group, known allergies, previous prescriptions, and diagnostic lab reports.
4. **Prescription Templates (C5)**:
   - Open More or Templates -> View standardized condition bundles (URI, Hypertension, Diabetes, GERD).
   - Tap "Apply to Prescription" -> Verify auto-fill of diagnosis and standard medicine items into New Prescription screen.
5. **Prescription Detail & Void / Cancellation (C4, C6)**:
   - Open an active prescription -> Verify medicine table with dosage and frequency.
   - Tap "Cancel / Void Prescription" -> Enter clinical reason -> Confirm voiding.
   - Verify prescription status updates to CANCELLED and is permanently locked.

#### Step 0.9: Group D Pharmacy Flows (Dashboard, Dispense, Billing, Khata, Invoices)
1. **Pharmacy Home Dashboard (D1)**:
   - Log in as verified Medical Shop account.
   - Verify Pharmacy greeting header with green store avatar and notification bell.
   - Verify 2 Summary Cards: Today's Prescriptions (mint background with pill icon) and Today's Billing total (peach background with ₹ rupee icon).
   - Test Segmented Tab Switcher: toggle between "To dispense" and "Dispensed".
   - Verify queue items display document icon, patient name, time, items count, and `Pending` / `Dispensed` status badge.
   - Verify bottom "Outstanding" credit ticker displaying amount (e.g. `₹ 3,280`) with navigation link to Khata.
2. **QR Dispense & Medicine Verification (D2)**:
   - Navigate to Dispense tab -> Test camera permissions dialog.
   - Scan patient QR code or manually enter prescription code.
   - Review verified patient details and prescribed medicine line items.
   - Input batch numbers and expiry dates per medicine -> Tap "Fulfill & Dispense".
   - Confirm status locks to DISPENSED and transitions to dispensed queue.
3. **Interactive Billing & Khata Credit (D3)**:
   - Navigate to Billing tab -> Look up customer by phone number.
   - Add medicine line items: verify quantity, unit price, and subtotal calculation.
   - Select Payment Mode: CASH, UPI, CARD, or KHATA (Store Credit).
   - Tap "Generate & Save Invoice" -> Verify bill creation and balance adjustment.
4. **Customer Khata Ledger (D4)**:
   - Navigate to Customers / Khata tab -> View store credit balances.
   - Tap a customer to view transaction history (Credit vs Payment entries).
   - Tap "Record Payment" -> Enter settlement amount -> Verify balance decreases immediately.
5. **Invoice Archive & Native Sharing (D6)**:
   - Open Invoices from More tab -> View past issued bills.
   - Tap an invoice to view receipt breakdown.
   - Tap "Share / Print Receipt" -> Verify native iOS / Android print spooler and sharesheet invocation.


---

### Scenario A: Role Registration & Authentication
#### Step A.1: Patient Registration
1. Launch app -> Tap **"Create an account"**.
2. Select role **Patient**.
3. Fill in:
   - Full Name: `Aarav Sharma`
   - Email: `aarav.patient@example.com`
   - Phone: `9876543210` (10 digits)
   - Password: `Password@123`
   - Date of Birth: `1992-08-15`
   - Gender: `MALE`
   - Blood Group: `O+`
   - Address: `Indiranagar, Bengaluru`
4. Tap **Register as Patient**.
- **Expected Result**: Successfully registers, receives JWT token, and immediately redirects to the **Patient Dashboard** showing "👤 Patient" badge and "✓ VERIFIED" health profile card.

#### Step A.2: Doctor Registration & Pending Verification
1. Log out or clear cache -> Tap **"Create an account"**.
2. Select role **Doctor**.
3. Fill in:
   - Full Name: `Dr. Neha Rao`
   - Email: `dr.neha@example.com`
   - Phone: `9876543211`
   - Password: `Password@123`
   - Medical Registration No: `KMC-2024-88991`
   - Specialization: `Cardiology`
   - Clinic Address: `Apollo Heart Clinic, Bengaluru`
4. Tap **Register as Doctor**.
- **Expected Result**: Redirects to the **Credential Review** screen (`/(auth)/pending-verification`) showing yellow status badge `⏳ PENDING VERIFICATION`, role "Medical Doctor", and Registration No `KMC-2024-88991`. Protected clinical routes are locked.

#### Step A.3: Pharmacy Registration & Pending Verification
1. Tap **Sign Out** on pending screen -> Tap **"Create an account"**.
2. Select role **Medical Shop**.
3. Fill in:
   - Authorized Name: `Ramesh Kumar`
   - Email: `ramesh.meds@example.com`
   - Phone: `9876543212`
   - Password: `Password@123`
   - Pharmacy / Store Name: `Sanjivani Chemist & Druggist`
   - Drug License No: `DL-KA-BNG-99214`
   - Address: `12th Main, Jayanagar, Bengaluru`
   - Operating Hours: `08:00 AM - 10:30 PM`
4. Tap **Register as Medical Shop**.
- **Expected Result**: Redirects to the **Credential Review** screen showing `⏳ PENDING VERIFICATION` and Drug License No. Pharmacy terminal routes are locked.

---

### Scenario B: Administrative Verification (Terminal / Database)
Since admin verification requires superadmin approval, approve the credentials via server command or database update:
```sql
UPDATE "User" SET "verificationStatus" = 'APPROVED' WHERE email IN ('dr.neha@example.com', 'ramesh.meds@example.com');
UPDATE "Doctor" SET "verificationStatus" = 'APPROVED' WHERE "registrationNo" = 'KMC-2024-88991';
UPDATE "MedicalShop" SET "verificationStatus" = 'APPROVED' WHERE "licenseNo" = 'DL-KA-BNG-99214';
```
1. On Dr. Neha's phone, tap **"🔄 Check Verification Status"**.
- **Expected Result**: Screen detects `APPROVED` status and immediately transitions to the **Clinical Portal Dashboard** displaying `🩺 Doctor` role and `✓ VERIFIED` badge.
2. Log in as Ramesh Kumar (`ramesh.meds@example.com`).
- **Expected Result**: Immediately opens the **Pharmacy Terminal Dashboard** with `💊 Pharmacy` role and `✓ VERIFIED` badge.

---

### Scenario C: E-Prescription Issuance (Doctor Portal)
1. In Doctor Portal, tap **"Issue New Prescription"** (`/(doctor)/new-prescription`).
2. Search patient by phone: enter `9876543210` -> Tap **Lookup Patient**.
   - Verified patient card appears: `Aarav Sharma (O+, Male)`.
3. Enter Clinical Diagnosis: `Acute Bronchitis & Seasonal Allergy`.
4. Add Medication #1 using **Autocomplete**:
   - In the medicine field, type `Amox`.
   - The dropdown displays suggestions: `Amoxicillin 500mg (Antibiotic)`, `Amoxicillin + Clavulanic Acid 625mg (Antibiotic)`.
   - Tap `Amoxicillin + Clavulanic Acid 625mg`.
   - Free-text verification: Modify or append specific instructions if desired.
   - Enter Dosage: `625mg`, Frequency: `1-0-1 (Twice Daily)`, Duration: `5 days`, Quantity: `10`.
5. Add Medication #2:
   - Type `Cetirizine`.
   - Tap `Cetirizine 10mg (Antihistamine)`.
   - Enter Dosage: `10mg`, Frequency: `0-0-1 (Night)`, Duration: `5 days`, Quantity: `5`.
6. Add General Notes: `Take after food. Avoid cold beverages.`.
7. Tap **"Issue Verified Prescription"**.
- **Expected Result**: Button shows loading spinner, disables repeated taps, creates the prescription record with cryptographic token, displays a success confirmation, and redirects to Issued Prescriptions (`/(doctor)/prescriptions`) showing code (e.g. `PRX-XXXXXX`) and `ISSUED` status badge.

---

### Scenario D: Patient Wallet & Single-Use QR Code
1. Log in on physical device as Patient Aarav Sharma (`aarav.patient@example.com`).
2. On Dashboard, tap **"Prescription Wallet"** (`/(patient)/wallet`).
   - Notice the newly issued prescription item (`PRX-XXXXXX`) with `ISSUED` / `ACTIVE` badge.
   - Pull-to-refresh to verify smooth refresh animation.
3. Tap on the prescription card to open full details (`/(patient)/prescription/[id]`).
- **Expected Result**:
  - Displays high-contrast, scannable QR code encoding the cryptographic dispense token.
  - Displays prescriber details (`Dr. Neha Rao`), diagnosis, and detailed medicine items with dosages.
  - Status displays `ACTIVE (Ready for Dispense)`.

---

### Scenario E: Pharmacy Scan & Dispensing Flow
1. Switch to (or log into) the licensed Pharmacy account on physical device (`ramesh.meds@example.com`).
2. From Pharmacy dashboard, tap **"Dispense Prescription"** (`/(shop)/scan-prescription`).
3. **Camera Permission Handling**:
   - If prompted, tap **"Allow"** for Camera permission.
   - Verify camera viewfinder renders smoothly with target reticle.
4. Point the phone camera at the patient's QR code displayed on the other screen (or a second phone / monitor).
- **Expected Result**:
  - Camera detects the code within ~500ms and triggers haptic feedback.
  - Automatically fetches prescription details and displays items to dispense.
5. Tap **"Confirm & Lock Dispense"**.
6. Destructive Confirm Dialog appears:
   - Title: `Confirm Dispensing`
   - Message: `This action will mark the prescription as dispensed. It cannot be used again.`
7. Tap **"Yes, Dispense"**.
- **Expected Result**:
  - Shows loading indicator on button.
  - Dispense completes; status updates to `DISPENSED`.
  - Immediate re-scan attempt fails with error message: `Prescription has already been dispensed.` (Replay attack prevention).

---

### Scenario F: Pharmacy Digital Billing & Khata Credit
1. From Pharmacy dashboard, tap **"Billing & Checkout"** (`/(shop)/billing`).
2. Lookup customer: enter `9876543210` -> verified customer `Aarav Sharma` appears.
3. Add Line Item 1 using **Autocomplete**:
   - Type `Paracetamol` -> select `Paracetamol 650mg`.
   - Quantity: `2`, Unit Price: `30` -> Total: `₹60`.
4. Add Line Item 2:
   - Type `Vitamin C` -> select `Vitamin C / Zinc (Supplement)`.
   - Quantity: `1`, Unit Price: `120` -> Total: `₹120`.
5. Review Calculations:
   - Subtotal: `₹180`
   - GST (5%): `₹9`
   - Grand Total: `₹189`
6. Select Payment Method:
   - Test **A: UPI / Cash**: Invoice marked `PAID`.
   - Test **B: Khata Credit**: Select `Khata Credit (Store Ledger)`.
7. Tap **"Generate Tax Invoice"**.
- **Expected Result**:
  - Generates invoice with bill number (e.g. `INV-2026-XXXX`).
  - Navigates to invoice receipt screen.

---

### Scenario G: Invoice PDF Generation & Native Share Sheet
1. On the invoice receipt or in **"Invoice History"** (`/(shop)/invoices`), locate `INV-2026-XXXX`.
2. Tap **"Share Invoice PDF"**.
- **Expected Result**:
  - `expo-print` renders HTML template into an official tax invoice PDF in cache.
  - `expo-sharing` triggers the native OS Share Sheet (iOS Share Sheet / Android Sharesheet).
  - Can save to Files, send via WhatsApp, AirDrop, or Print.
  - PDF contains pharmacy license, customer details, itemized table, tax breakdown, and electronic verification note.

---

### Scenario H: Khata Store Ledger (Credit & Payment)
1. From Pharmacy dashboard, tap **"Khata Ledger"** (`/(shop)/ledger`).
2. Search customer `Aarav Sharma`.
- **Expected Result**:
  - Displays customer ledger balance showing outstanding balance `₹189` with `CREDIT GIVEN` status badge.
3. Tap customer card to open ledger history.
4. Tap **"Record Payment"**.
5. Enter Amount: `189`, Method: `UPI`, Reference: `UPI-RR-99128`.
6. Tap **"Save Payment"**.
- **Expected Result**:
  - Ledger balance drops to `₹0.00`.
  - Payment entry appears with `PAYMENT RECEIVED` badge and timestamp.

---

### Scenario I: Refill Reminders Scheduling & Push Alerts
1. In Pharmacy dashboard, tap **"Refill Reminders"** (`/(shop)/refill-reminders`).
2. Tap **"Schedule New Reminder"**.
3. Select Patient `Aarav Sharma` and active medication.
4. Set Refill Due Date: `7 days` from today.
5. Tap **"Schedule Reminder"**.
- **Expected Result**:
  - Reminder appears in list with `⏳ SCHEDULED` status badge.
  - Log into Patient account -> Open Prescription Wallet -> Reminder appears under `⏰ Refill Reminders` section with due date.

---

### Scenario J: Consultation Appointments Flow
1. In Patient Portal, tap **"Appointments"** (`/(patient)/appointments`).
2. Tap **"Book New Appointment"**.
3. Select Doctor `Dr. Neha Rao (Cardiology)`.
4. Pick consultation date/time and reason: `Follow-up blood pressure check`.
5. Tap **"Confirm Appointment Request"**.
- **Expected Result**:
  - Request created with `SCHEDULED` status badge.
6. Switch to Doctor Portal (`dr.neha@example.com`) -> Open **"Appointment Schedule"** (`/(doctor)/appointments`).
7. The appointment appears under `SCHEDULED`.
8. Tap **"Confirm Booking"** -> updates badge to `CONFIRMED`.
9. Tap **"Complete Consultation"** -> updates badge to `COMPLETED`.
10. Test Cancellation Confirm Dialog:
    - Tap **"Cancel Appointment"**.
    - Alert prompts for confirmation -> Tap **"Yes, Cancel"** -> badge updates to `CANCELLED`.

---

### Scenario K: Clinical Consent Flow
1. In Patient Portal, tap **"Clinical Consent"** (`/(patient)/consent`).
2. Tap **"Authorize New Doctor"**.
3. Select `Dr. Neha Rao` and set scope: `General consultation and lab report access`.
4. Tap **"Grant Clinical Consent"**.
- **Expected Result**:
  - Consent active with `ACTIVE` badge and authorization timestamp.
5. Log into Doctor Portal (`dr.neha@example.com`) -> Tap **"My Consenting Patients"** (`/(doctor)/patients`).
- **Expected Result**:
  - Patient `Aarav Sharma` appears with `ACTIVE ACCESS` badge and phone/email details.
6. In Patient Portal, tap **"Revoke Consent"** on Dr. Neha Rao.
7. Confirm dialog appears: `Are you sure you want to revoke clinical access?` -> Tap **"Yes, Revoke"**.
- **Expected Result**:
  - Access is immediately revoked.
  - Doctor's patient list removes Aarav Sharma, preventing unauthorized access.

---

### Scenario L: Medical Vault Report Upload & Authenticated Document Viewer
1. Log in as Patient Aarav Sharma -> Tap **"Medical Vault & Records"** (`/(patient)/records`).
2. Tap **"Upload Diagnostic Document"**.
3. Select Document Type: `LAB_REPORT`, Title: `Complete Blood Count (CBC)`.
4. Upload file (pick PDF or image from phone file picker / camera roll).
5. Tap **"Save to Secure Vault"**.
- **Expected Result**: Document uploads and appears in Patient's list.
6. **Test Report Viewing (Audit Finding FLAG-DEV-02 verification)**:
   - Tap **"View / Share Document"** on the CBC report.
   - Modal opens (`ReportViewModal`).
   - Downloads document internally into `FileSystem.cacheDirectory` using authenticated `Authorization: Bearer <token>` header.
   - Shows progress spinner during fetch.
   - **For Images**: Previews directly inside the in-app modal image viewer with zoom/pan.
   - **For PDFs**: Automatically launches native OS share/preview sheet via `expo-sharing`.
   - **Offline / Failure Retry**: Test retry button by disabling network -> verify error message and tap **"Retry Download"**.

---

### Scenario M: Offline Banner & Error Recovery
1. While anywhere in the app, switch physical phone to **Airplane Mode** (or disable Wi-Fi/cellular).
- **Expected Result**:
  - An accessible warning banner slides in at the top of the screen:
    `⚠️ No internet connection. Real-time updates may be unavailable. [Retry]`
2. Attempt an API action (e.g. pull-to-refresh on Prescriptions).
- **Expected Result**:
  - Network error triggers the banner or display error state with retry button.
  - Application does NOT crash or white-screen.
3. Turn Wi-Fi back on -> Tap **"Retry"** in the banner.
- **Expected Result**:
  - Banner verifies connectivity with backend health check and automatically dismisses.

---

## 4. Manual Testing Sign-Off Matrix

| Flow / Feature | Tester Name | Device Model & OS | Date | Result (PASS / FAIL) | Notes / Observations |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **A. Patient Registration** | | | | | |
| **B. Doctor Verification** | | | | | |
| **C. Pharmacy Verification** | | | | | |
| **D. Doctor Rx Autocomplete** | | | | | |
| **E. Patient Wallet QR** | | | | | |
| **F. Pharmacy QR Scanner** | | | | | |
| **G. Dispense Replay Guard** | | | | | |
| **H. Pharmacy Billing & GST** | | | | | |
| **I. Invoice PDF & Sharing** | | | | | |
| **J. Khata Store Credit** | | | | | |
| **K. Refill Reminders** | | | | | |
| **L. Appointments Booking** | | | | | |
| **M. Clinical Consent Revoke**| | | | | |
| **N. Auth Report Download** | | | | | |
| **O. Offline & Error Recovery**| | | | | |
