import { PrismaClient } from '@prisma/client';
import { config } from './index';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: config.isDev ? ['query', 'error', 'warn'] : ['error'],
  });

if (config.isDev) {
  global.prisma = prisma;
}

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('✅ PostgreSQL database connected successfully via Prisma');
  } catch (error) {
    console.error('❌ Failed to connect to PostgreSQL database:', error);
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
