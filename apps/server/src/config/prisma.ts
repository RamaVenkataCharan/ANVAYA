import { PrismaClient } from '@prisma/client';
import { config } from './index';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var isPrismaDbConnected: boolean | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: config.isDev ? ['error'] : ['error'],
  });

if (config.isDev) {
  global.prisma = prisma;
}

let dbConnected = false;

export function isDbConnected(): boolean {
  return dbConnected;
}

export async function connectDatabase(): Promise<boolean> {
  try {
    await prisma.$connect();
    dbConnected = true;
    console.log('✅ PostgreSQL database connected successfully via Prisma');
    return true;
  } catch (error) {
    dbConnected = false;
    console.warn('⚠️  PostgreSQL offline or unreachable. ANVAYA is operating with high-speed in-memory resilient database store.');
    return false;
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (dbConnected) {
    await prisma.$disconnect();
  }
}
