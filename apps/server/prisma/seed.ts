import {
  PrismaClient,
  Role,
  VerificationStatus,
  PrescriptionStatus,
  AppointmentStatus,
  PaymentStatus,
  LedgerType,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

export function verifySeedEnvironment(): void {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PROD_SEED !== 'true') {
    throw new Error('Database seeding is strictly blocked in production environment. To force, set ALLOW_PROD_SEED=true.');
  }
}

async function main() {
  verifySeedEnvironment();

  console.log('\n🌱 =========================================================');
  console.log('   Seeding ANVAYA Database with Production-Ready Demo Data');
  console.log('=========================================================\n');

  // Dynamic demo password: read strictly from environment or default to Password123
  const demoPassword = process.env.DEMO_PASSWORD || 'Password123';
  const passwordHash = await bcrypt.hash(demoPassword, 10);

  // ── 1. Admin Account (1) ──────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: 'admin@anvaya.health' },
    update: { passwordHash, isActive: true },
    create: {
      name: 'System Administrator',
      email: 'admin@anvaya.health',
      phone: '+919999900001',
      passwordHash,
      role: Role.ADMIN,
      isActive: true,
    },
  });
  console.log(`✅ [ADMIN] Created: ${admin.name} (${admin.email})`);

  // ── 2. Doctors (2 Verified, 1 Pending) ───────────────────────────────────
  // Verified Doctor 1: Dr. Rajesh Sharma
  const doc1User = await prisma.user.upsert({
    where: { email: 'dr.sharma@anvaya.health' },
    update: { passwordHash, isActive: true },
    create: {
      name: 'Dr. Rajesh Sharma',
      email: 'dr.sharma@anvaya.health',
      phone: '+919876543210',
      passwordHash,
      role: Role.DOCTOR,
      isActive: true,
      doctorProfile: {
        create: {
          specialization: 'Cardiology & Internal Medicine',
          registrationNo: 'MCI-194820-A',
          clinicAddress: 'Suite 4B, Apollo Health City, Jubilee Hills, Hyderabad',
          verificationStatus: VerificationStatus.APPROVED,
          verifiedAt: new Date(Date.now() - 30 * 86400000),
        },
      },
    },
    include: { doctorProfile: true },
  });
  console.log(`✅ [DOCTOR] Created Verified: ${doc1User.name} (${doc1User.email})`);

  // Verified Doctor 2: Dr. Priya Nair
  const doc2User = await prisma.user.upsert({
    where: { email: 'dr.nair@anvaya.health' },
    update: { passwordHash, isActive: true },
    create: {
      name: 'Dr. Priya Nair',
      email: 'dr.nair@anvaya.health',
      phone: '+919876543211',
      passwordHash,
      role: Role.DOCTOR,
      isActive: true,
      doctorProfile: {
        create: {
          specialization: 'Pediatrics & Child Health',
          registrationNo: 'MCI-882910-B',
          clinicAddress: 'Rainbow Children Hospital, Road No 2, Banjara Hills, Hyderabad',
          verificationStatus: VerificationStatus.APPROVED,
          verifiedAt: new Date(Date.now() - 15 * 86400000),
        },
      },
    },
    include: { doctorProfile: true },
  });
  console.log(`✅ [DOCTOR] Created Verified: ${doc2User.name} (${doc2User.email})`);

  // Pending Doctor: Dr. Rahul Patel (Awaiting Admin Review)
  const docPendingUser = await prisma.user.upsert({
    where: { email: 'dr.patel@anvaya.health' },
    update: { passwordHash, isActive: true },
    create: {
      name: 'Dr. Rahul Patel',
      email: 'dr.patel@anvaya.health',
      phone: '+919876543213',
      passwordHash,
      role: Role.DOCTOR,
      isActive: true,
      doctorProfile: {
        create: {
          specialization: 'Neurology & Stroke Specialist',
          registrationNo: 'MCI-994102-PENDING',
          clinicAddress: 'Care Hospital, Road No 1, Banjara Hills, Hyderabad',
          verificationStatus: VerificationStatus.PENDING,
        },
      },
    },
    include: { doctorProfile: true },
  });
  console.log(`⏳ [DOCTOR] Created Pending: ${docPendingUser.name} (${docPendingUser.email})`);

  // ── 3. Medical Shops / Pharmacies (2 Verified, 1 Pending) ────────────────
  // Verified Shop 1: Apollo Pharmacy
  const shop1User = await prisma.user.upsert({
    where: { email: 'apollo.jubilee@anvaya.health' },
    update: { passwordHash, isActive: true },
    create: {
      name: 'Venkatesh Prasad',
      email: 'apollo.jubilee@anvaya.health',
      phone: '+919876543220',
      passwordHash,
      role: Role.SHOP,
      isActive: true,
      shopProfile: {
        create: {
          shopName: 'Apollo Pharmacy Jubilee Hills',
          licenseNo: 'DL-TS-HYD-2024-8821',
          address: 'Plot 12, Road No 36, Jubilee Hills, Hyderabad',
          phone: '+914023558899',
          timings: '24/7 (Mon-Sun)',
          verificationStatus: VerificationStatus.APPROVED,
          verifiedAt: new Date(Date.now() - 25 * 86400000),
        },
      },
    },
    include: { shopProfile: true },
  });
  console.log(`✅ [SHOP] Created Verified: ${shop1User.shopProfile?.shopName}`);

  // Verified Shop 2: MedPlus Pharmacy
  const shop2User = await prisma.user.upsert({
    where: { email: 'medplus.banjara@anvaya.health' },
    update: { passwordHash, isActive: true },
    create: {
      name: 'Suresh Reddy',
      email: 'medplus.banjara@anvaya.health',
      phone: '+919876543221',
      passwordHash,
      role: Role.SHOP,
      isActive: true,
      shopProfile: {
        create: {
          shopName: 'MedPlus Pharmacy Banjara Hills',
          licenseNo: 'DL-TS-HYD-2023-4412',
          address: 'Opp. Care Hospital, Road No 1, Banjara Hills, Hyderabad',
          phone: '+914023349911',
          timings: '07:00 AM - 11:00 PM',
          verificationStatus: VerificationStatus.APPROVED,
          verifiedAt: new Date(Date.now() - 20 * 86400000),
        },
      },
    },
    include: { shopProfile: true },
  });
  console.log(`✅ [SHOP] Created Verified: ${shop2User.shopProfile?.shopName}`);

  // Pending Shop: Sanjivani Medical Store
  const shopPendingUser = await prisma.user.upsert({
    where: { email: 'sanjivani.pharmacy@anvaya.health' },
    update: { passwordHash, isActive: true },
    create: {
      name: 'Mohan Lal',
      email: 'sanjivani.pharmacy@anvaya.health',
      phone: '+919876543222',
      passwordHash,
      role: Role.SHOP,
      isActive: true,
      shopProfile: {
        create: {
          shopName: 'Sanjivani Medical & General Store',
          licenseNo: 'DL-TS-HYD-PENDING-771',
          address: 'Shop 4, Main Road, Madhapur, Hyderabad',
          phone: '+914023118833',
          timings: '08:00 AM - 10:30 PM',
          verificationStatus: VerificationStatus.PENDING,
        },
      },
    },
    include: { shopProfile: true },
  });
  console.log(`⏳ [SHOP] Created Pending: ${shopPendingUser.shopProfile?.shopName}`);

  // ── 4. Patients (4) ───────────────────────────────────────────────────────
  const patientsData = [
    {
      name: 'Arjun Kapoor',
      email: 'arjun.kapoor@anvaya.health',
      phone: '+919876543231',
      dob: new Date('1992-05-14'),
      gender: 'MALE',
      bloodGroup: 'O+',
      emergencyContact: '+919876540001',
      address: 'Flat 402, Green Meadows, Madhapur, Hyderabad',
    },
    {
      name: 'Sneha Rao',
      email: 'sneha.rao@anvaya.health',
      phone: '+919876543232',
      dob: new Date('1996-11-20'),
      gender: 'FEMALE',
      bloodGroup: 'B+',
      emergencyContact: '+919876540002',
      address: 'Villa 18, Palm Springs, Kondapur, Hyderabad',
    },
    {
      name: 'Mohammed Farooq',
      email: 'm.farooq@anvaya.health',
      phone: '+919876543233',
      dob: new Date('1985-02-03'),
      gender: 'MALE',
      bloodGroup: 'A+',
      emergencyContact: '+919876540003',
      address: 'House 8-2-293, Banjara Hills, Hyderabad',
    },
    {
      name: 'Kavita Sen',
      email: 'kavita.sen@anvaya.health',
      phone: '+919876543234',
      dob: new Date('2001-09-17'),
      gender: 'FEMALE',
      bloodGroup: 'AB-',
      emergencyContact: '+919876540004',
      address: 'Tower B, Phoenix Golf Edge, Gachibowli, Hyderabad',
    },
  ];

  const createdPatients: any[] = [];
  for (const p of patientsData) {
    const patientUser = await prisma.user.upsert({
      where: { email: p.email },
      update: { passwordHash, isActive: true },
      create: {
        name: p.name,
        email: p.email,
        phone: p.phone,
        passwordHash,
        role: Role.PATIENT,
        isActive: true,
        patientProfile: {
          create: {
            dob: p.dob,
            gender: p.gender,
            bloodGroup: p.bloodGroup,
            emergencyContact: p.emergencyContact,
            address: p.address,
          },
        },
      },
      include: { patientProfile: true },
    });
    createdPatients.push(patientUser);
    console.log(`✅ [PATIENT] Created: ${patientUser.name} (${patientUser.email})`);
  }

  const doctor1Id = doc1User.doctorProfile!.id;
  const doctor2Id = doc2User.doctorProfile!.id;
  const shop1Id = shop1User.shopProfile!.id;
  const shop2Id = shop2User.shopProfile!.id;
  const patient1Id = createdPatients[0].patientProfile!.id;
  const patient2Id = createdPatients[1].patientProfile!.id;
  const patient3Id = createdPatients[2].patientProfile!.id;
  const patient4Id = createdPatients[3].patientProfile!.id;

  // ── 5. Prescriptions in EACH status (ISSUED, DISPENSED, CANCELLED) ─────────
  // A. Prescription 1: ISSUED (Ready to scan/dispense by shop)
  const rxIssued = await prisma.prescription.upsert({
    where: { code: 'ANV-8942-7193' },
    update: {},
    create: {
      code: 'ANV-8942-7193',
      qrToken: crypto.randomBytes(32).toString('hex'),
      doctorId: doctor1Id,
      patientId: patient1Id,
      status: PrescriptionStatus.ISSUED,
      diagnosis: 'Acute Bronchitis and Upper Respiratory Infection',
      notes: 'Take medicines after food. Increase fluid intake.',
      issuedAt: new Date(Date.now() - 2 * 3600000),
      items: {
        create: [
          {
            medicine: 'Amoxicillin 500mg',
            dosage: '500mg',
            frequency: '1-0-1 (Morning - Night)',
            duration: '5 days',
            quantity: 10,
            instructions: 'Take after meals with water',
          },
          {
            medicine: 'Paracetamol 650mg',
            dosage: '650mg',
            frequency: 'SOS (As needed)',
            duration: '3 days',
            quantity: 6,
            instructions: 'Take in case of fever > 100°F',
          },
          {
            medicine: 'Cetirizine 10mg',
            dosage: '10mg',
            frequency: '0-0-1 (Night only)',
            duration: '5 days',
            quantity: 5,
            instructions: 'May cause drowsiness',
          },
        ],
      },
    },
  });
  console.log(`✅ [PRESCRIPTION] Created ISSUED: ${rxIssued.code}`);

  // B. Prescription 2: DISPENSED (Completed cycle)
  const rxDispensed = await prisma.prescription.upsert({
    where: { code: 'ANV-4421-9982' },
    update: {},
    create: {
      code: 'ANV-4421-9982',
      qrToken: crypto.randomBytes(32).toString('hex'),
      doctorId: doctor2Id,
      patientId: patient2Id,
      shopId: shop1Id,
      status: PrescriptionStatus.DISPENSED,
      diagnosis: 'Type 2 Diabetes Mellitus & Dyslipidemia',
      notes: 'HbA1c regular review in 3 months.',
      issuedAt: new Date(Date.now() - 5 * 86400000),
      dispensedAt: new Date(Date.now() - 4 * 86400000),
      items: {
        create: [
          {
            medicine: 'Metformin 500mg SR',
            dosage: '500mg',
            frequency: '1-0-1 with food',
            duration: '30 days',
            quantity: 60,
            instructions: 'Do not crush tablets',
          },
          {
            medicine: 'Atorvastatin 10mg',
            dosage: '10mg',
            frequency: '0-0-1 before sleep',
            duration: '30 days',
            quantity: 30,
            instructions: 'Take consistently at night',
          },
        ],
      },
    },
  });
  console.log(`✅ [PRESCRIPTION] Created DISPENSED: ${rxDispensed.code}`);

  // C. Prescription 3: CANCELLED (Revoked by physician)
  const rxCancelled = await prisma.prescription.upsert({
    where: { code: 'ANV-1102-3349' },
    update: {},
    create: {
      code: 'ANV-1102-3349',
      qrToken: crypto.randomBytes(32).toString('hex'),
      doctorId: doctor1Id,
      patientId: patient3Id,
      status: PrescriptionStatus.CANCELLED,
      diagnosis: 'Suspected Otitis Media',
      notes: 'Prescription cancelled: Patient reported adverse reaction to macrolides.',
      issuedAt: new Date(Date.now() - 10 * 86400000),
      items: {
        create: [
          {
            medicine: 'Azithromycin 500mg',
            dosage: '500mg',
            frequency: '1-0-0',
            duration: '3 days',
            quantity: 3,
            instructions: 'Cancelled by physician',
          },
        ],
      },
    },
  });
  console.log(`✅ [PRESCRIPTION] Created CANCELLED: ${rxCancelled.code}`);

  // ── 6. Bills (CASH, UPI, and KHATA_CREDIT) ────────────────────────────────
  // Bill 1: CASH (Paid)
  const bill1 = await prisma.bill.upsert({
    where: { billNumber: 'INV-2026-0001' },
    update: {},
    create: {
      billNumber: 'INV-2026-0001',
      shopId: shop1Id,
      patientId: patient2Id,
      prescriptionId: rxDispensed.id,
      subtotal: 318.18,
      tax: 31.82,
      total: 350.0,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'CASH',
      notes: 'Dispensed against e-prescription ANV-4421-9982',
      items: {
        create: [
          { medicine: 'Metformin 500mg SR (60 Tabs)', quantity: 60, unitPrice: 3.5, totalPrice: 210.0 },
          { medicine: 'Atorvastatin 10mg (30 Tabs)', quantity: 30, unitPrice: 4.67, totalPrice: 140.0 },
        ],
      },
    },
  });
  console.log(`✅ [BILL] Created CASH: ${bill1.billNumber} (Total: ₹${bill1.total})`);

  // Bill 2: UPI (Paid)
  const bill2 = await prisma.bill.upsert({
    where: { billNumber: 'INV-2026-0002' },
    update: {},
    create: {
      billNumber: 'INV-2026-0002',
      shopId: shop2Id,
      patientId: patient1Id,
      subtotal: 654.55,
      tax: 65.45,
      total: 720.0,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'UPI',
      notes: 'OTC Wellness and First Aid Kit',
      items: {
        create: [
          { medicine: 'Digital Thermometer', quantity: 1, unitPrice: 280.0, totalPrice: 280.0 },
          { medicine: 'Multivitamin Complex 30s', quantity: 1, unitPrice: 440.0, totalPrice: 440.0 },
        ],
      },
    },
  });
  console.log(`✅ [BILL] Created UPI: ${bill2.billNumber} (Total: ₹${bill2.total})`);

  // Bill 3: KHATA_CREDIT (Pending with atomic Ledger Credit)
  const bill3 = await prisma.bill.upsert({
    where: { billNumber: 'INV-2026-0003' },
    update: {},
    create: {
      billNumber: 'INV-2026-0003',
      shopId: shop1Id,
      patientId: patient3Id,
      subtotal: 1318.18,
      tax: 131.82,
      total: 1450.0,
      paymentStatus: PaymentStatus.PENDING,
      paymentMethod: 'KHATA_CREDIT',
      notes: 'Khata Credit Bill for monthly maintenance drugs',
      items: {
        create: [
          { medicine: 'Telmisartan 40mg (60 Tabs)', quantity: 60, unitPrice: 8.5, totalPrice: 510.0 },
          { medicine: 'Rosuvastatin 20mg (30 Tabs)', quantity: 30, unitPrice: 16.0, totalPrice: 480.0 },
          { medicine: 'Blood Glucose Test Strips (50s)', quantity: 1, unitPrice: 460.0, totalPrice: 460.0 },
        ],
      },
    },
  });
  console.log(`✅ [BILL] Created KHATA_CREDIT: ${bill3.billNumber} (Total: ₹${bill3.total})`);

  // ── 7. Ledger Entries with Non-Zero Balance ────────────────────────────────
  // Clean prior entries for patient 3 to maintain deterministic balance
  await prisma.ledgerEntry.deleteMany({
    where: { shopId: shop1Id, patientId: patient3Id },
  });

  // Credit entry (+1450)
  await prisma.ledgerEntry.create({
    data: {
      shopId: shop1Id,
      patientId: patient3Id,
      billId: bill3.id,
      amount: 1450.0,
      type: LedgerType.CREDIT,
      description: `Khata credit extended for bill ${bill3.billNumber}`,
      createdAt: new Date(Date.now() - 3 * 86400000),
    },
  });

  // Partial repayment entry (-500)
  await prisma.ledgerEntry.create({
    data: {
      shopId: shop1Id,
      patientId: patient3Id,
      amount: 500.0,
      type: LedgerType.PAYMENT,
      description: 'Partial payment settled via Cash at counter',
      createdAt: new Date(Date.now() - 1 * 86400000),
    },
  });
  // Net Balance: 1450 - 500 = ₹950.00
  console.log(`✅ [LEDGER] Created Khata entries: Patient Mohammed Farooq net balance = ₹950.00 due to Apollo Pharmacy`);

  // ── 8. Appointments ───────────────────────────────────────────────────────
  await prisma.appointment.deleteMany({
    where: { patientId: { in: [patient1Id, patient2Id, patient4Id] } },
  });

  await prisma.appointment.createMany({
    data: [
      {
        doctorId: doctor1Id,
        patientId: patient1Id,
        dateTime: new Date(Date.now() + 2 * 86400000),
        status: AppointmentStatus.CONFIRMED,
        reason: 'Follow-up Cardiology Evaluation & ECG Review',
        notes: 'Fasting lipid panel to be done prior to consult',
      },
      {
        doctorId: doctor2Id,
        patientId: patient4Id,
        dateTime: new Date(Date.now() + 4 * 86400000),
        status: AppointmentStatus.SCHEDULED,
        reason: 'Annual Preventive Health Checkup',
      },
      {
        doctorId: doctor1Id,
        patientId: patient2Id,
        dateTime: new Date(Date.now() - 7 * 86400000),
        status: AppointmentStatus.COMPLETED,
        reason: 'Initial Hypertension Consultation',
        notes: 'Prescribed medication and recommended low-sodium diet',
      },
    ],
  });
  console.log(`✅ [APPOINTMENTS] Created scheduled, confirmed, and completed consultations`);

  // ── 9. Consent Records (Active and Revoked) ────────────────────────────────
  await prisma.consent.deleteMany({
    where: { patientId: { in: [patient1Id, patient2Id] } },
  });

  // Active Consent: Patient 1 -> Doctor 1
  await prisma.consent.create({
    data: {
      patientId: patient1Id,
      doctorId: doctor1Id,
      isActive: true,
      grantedAt: new Date(Date.now() - 14 * 86400000),
      notes: 'Active consent for ongoing cardiovascular treatment and report analysis',
    },
  });

  // Revoked Consent: Patient 2 -> Doctor 2
  await prisma.consent.create({
    data: {
      patientId: patient2Id,
      doctorId: doctor2Id,
      isActive: false,
      grantedAt: new Date(Date.now() - 60 * 86400000),
      revokedAt: new Date(Date.now() - 5 * 86400000),
      notes: 'Patient revoked record viewing access upon discharge',
    },
  });
  console.log(`✅ [CONSENT] Created Active & Revoked consent gates`);

  // ── 10. Refill Reminders ──────────────────────────────────────────────────
  await prisma.refillReminder.deleteMany({
    where: { patientId: patient2Id },
  });

  await prisma.refillReminder.create({
    data: {
      prescriptionId: rxDispensed.id,
      patientId: patient2Id,
      remindAt: new Date(Date.now() + 5 * 86400000),
      sent: false,
    },
  });
  console.log(`✅ [REFILLS] Created refill reminder for prescription ${rxDispensed.code}`);

  // ── 11. Initial Audit Logs ────────────────────────────────────────────────
  await prisma.auditLog.createMany({
    data: [
      {
        userId: admin.id,
        action: 'DOCTOR_VERIFIED',
        resource: 'DOCTOR',
        resourceId: doctor1Id,
        metadata: {
          doctorUserId: doc1User.id,
          registrationNo: 'MCI-194820-A',
          status: 'APPROVED',
        },
        createdAt: new Date(Date.now() - 30 * 86400000),
      },
      {
        userId: admin.id,
        action: 'SHOP_VERIFIED',
        resource: 'SHOP',
        resourceId: shop1Id,
        metadata: {
          shopUserId: shop1User.id,
          licenseNo: 'DL-TS-HYD-2024-8821',
          status: 'APPROVED',
        },
        createdAt: new Date(Date.now() - 25 * 86400000),
      },
    ],
  });
  console.log(`✅ [AUDIT] Seeded initial compliance audit events`);

  // ── Print Demo Login Credentials Table ───────────────────────────────────
  console.log('\n================================================================================================');
  console.log('                          🌿 ANVAYA DEMO LOGIN CREDENTIALS                                     ');
  console.log('================================================================================================');
  console.log(
    '  All demo passwords are generated from DEMO_PASSWORD env (default: "Password123").'
  );
  console.log(
    '  Passwords are never hardcoded in application logic.\n'
  );

  const demoAccounts = [
    {
      Role: 'ADMIN',
      Name: admin.name,
      Identifier: admin.email,
      Password: demoPassword,
      Status: 'Active Administrator',
    },
    {
      Role: 'DOCTOR',
      Name: doc1User.name,
      Identifier: doc1User.email,
      Password: demoPassword,
      Status: 'VERIFIED (Cardiology)',
    },
    {
      Role: 'DOCTOR',
      Name: doc2User.name,
      Identifier: doc2User.email,
      Password: demoPassword,
      Status: 'VERIFIED (Pediatrics)',
    },
    {
      Role: 'DOCTOR',
      Name: docPendingUser.name,
      Identifier: docPendingUser.email,
      Password: demoPassword,
      Status: 'PENDING Admin Review',
    },
    {
      Role: 'SHOP',
      Name: shop1User.shopProfile?.shopName || 'Apollo Pharmacy',
      Identifier: shop1User.email,
      Password: demoPassword,
      Status: 'VERIFIED (Jubilee Hills)',
    },
    {
      Role: 'SHOP',
      Name: shop2User.shopProfile?.shopName || 'MedPlus Pharmacy',
      Identifier: shop2User.email,
      Password: demoPassword,
      Status: 'VERIFIED (Banjara Hills)',
    },
    {
      Role: 'SHOP',
      Name: shopPendingUser.shopProfile?.shopName || 'Sanjivani Store',
      Identifier: shopPendingUser.email,
      Password: demoPassword,
      Status: 'PENDING Admin Review',
    },
    {
      Role: 'PATIENT',
      Name: createdPatients[0].name,
      Identifier: createdPatients[0].email,
      Password: demoPassword,
      Status: 'Active (Rx ISSUED ready)',
    },
    {
      Role: 'PATIENT',
      Name: createdPatients[1].name,
      Identifier: createdPatients[1].email,
      Password: demoPassword,
      Status: 'Active (Rx DISPENSED)',
    },
    {
      Role: 'PATIENT',
      Name: createdPatients[2].name,
      Identifier: createdPatients[2].email,
      Password: demoPassword,
      Status: 'Active (Khata ₹950 due)',
    },
    {
      Role: 'PATIENT',
      Name: createdPatients[3].name,
      Identifier: createdPatients[3].email,
      Password: demoPassword,
      Status: 'Active (Appt Scheduled)',
    },
  ];

  console.table(demoAccounts);
  console.log('================================================================================================\n');
}

if (!process.env.VITEST && process.env.NODE_ENV !== 'test') {
  main()
    .catch((e) => {
      console.error('❌ Error during seeding:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
