import { PrismaClient, Role, VerificationStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding ANVAYA database with initial test accounts...');

  const defaultPasswordHash = await bcrypt.hash('Password123!', 10);

  // 1. Admin Account
  const admin = await prisma.user.upsert({
    where: { email: 'admin@anvaya.com' },
    update: {},
    create: {
      name: 'System Administrator',
      email: 'admin@anvaya.com',
      phone: '+919999900001',
      passwordHash: defaultPasswordHash,
      role: Role.ADMIN,
    },
  });
  console.log('✅ Created Admin user:', admin.email);

  // 2. Verified Doctor
  const doctorUser = await prisma.user.upsert({
    where: { email: 'dr.sharma@anvaya.com' },
    update: {},
    create: {
      name: 'Dr. Rajesh Sharma',
      email: 'dr.sharma@anvaya.com',
      phone: '+919999900002',
      passwordHash: defaultPasswordHash,
      role: Role.DOCTOR,
      doctorProfile: {
        create: {
          specialization: 'General Medicine & Diabetology',
          registrationNo: 'MCI-194820-A',
          clinicAddress: 'Care Clinic, 4th Block, Koramangala, Bengaluru',
          verificationStatus: VerificationStatus.APPROVED,
          verifiedAt: new Date(),
        },
      },
    },
  });
  console.log('✅ Created Verified Doctor:', doctorUser.email);

  // 3. Pending Doctor (Awaiting Admin Review)
  const pendingDoctorUser = await prisma.user.upsert({
    where: { email: 'dr.pending@anvaya.com' },
    update: {},
    create: {
      name: 'Dr. Ananya Reddy',
      email: 'dr.pending@anvaya.com',
      phone: '+919999900003',
      passwordHash: defaultPasswordHash,
      role: Role.DOCTOR,
      doctorProfile: {
        create: {
          specialization: 'Pediatrics',
          registrationNo: 'MCI-2026-PENDING-99',
          clinicAddress: 'Rainbow Children Health, HSR Layout, Bengaluru',
          verificationStatus: VerificationStatus.PENDING,
        },
      },
    },
  });
  console.log('✅ Created Pending Doctor:', pendingDoctorUser.email);

  // 4. Verified Medical Shop (Pharmacy)
  const shopUser = await prisma.user.upsert({
    where: { email: 'apollo.koramangala@anvaya.com' },
    update: {},
    create: {
      name: 'Venkatesh Prasad',
      email: 'apollo.koramangala@anvaya.com',
      phone: '+919999900004',
      passwordHash: defaultPasswordHash,
      role: Role.SHOP,
      shopProfile: {
        create: {
          shopName: 'Apollo Pharmacy Koramangala',
          licenseNo: 'DL-KA-BNG-88291',
          address: 'No 45, 80 Feet Road, 4th Block, Koramangala, Bengaluru',
          phone: '+918025539988',
          timings: '07:00 AM - 11:30 PM (Mon-Sun)',
          verificationStatus: VerificationStatus.APPROVED,
          verifiedAt: new Date(),
        },
      },
    },
  });
  console.log('✅ Created Verified Medical Shop:', shopUser.email);

  // 5. Patient Account
  const patientUser = await prisma.user.upsert({
    where: { email: 'arjun.kapoor@anvaya.com' },
    update: {},
    create: {
      name: 'Arjun Kapoor',
      email: 'arjun.kapoor@anvaya.com',
      phone: '+919999900005',
      passwordHash: defaultPasswordHash,
      role: Role.PATIENT,
      patientProfile: {
        create: {
          dob: new Date('1994-08-12'),
          gender: 'MALE',
          address: 'Apartment 402, Sunshine Heights, Bengaluru',
          bloodGroup: 'B+',
          emergencyContact: '+919999900099',
        },
      },
    },
  });
  console.log('✅ Created Patient:', patientUser.email);

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
