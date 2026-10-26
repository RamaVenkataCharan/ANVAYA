import { PrismaClient } from '@prisma/client';
import { config } from './index';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
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

/**
 * Asserts that a real database connection is active.
 * In production mode, in-memory fallback is strictly forbidden.
 */
export function assertDbConnection(): void {
  if (config.isProd && !dbConnected) {
    throw new Error(
      'FATAL: Database connection is required in production environment. In-memory store fallback is disabled.'
    );
  }
}

/**
 * Connects to PostgreSQL database via Prisma Client.
 * Fails fast with an error in production or when TEST_DB=postgres is active.
 */
export async function connectDatabase(): Promise<boolean> {
  try {
    await prisma.$connect();
    dbConnected = true;
    console.log('✅ PostgreSQL database connected successfully via Prisma');
    return true;
  } catch (error) {
    dbConnected = false;

    // Fail fast in production — in-memory fallback is disabled
    if (config.isProd || process.env.NODE_ENV === 'production') {
      const errMessage = (error as Error).message || String(error);
      console.error(
        `\n❌ FATAL: PostgreSQL database unreachable in production mode (${errMessage}). Refusing to start with in-memory fallback.\n`
      );
      throw new Error(`Database connection failed in production: ${errMessage}`);
    }

    // Fail fast in postgres test mode
    if (process.env.TEST_DB === 'postgres') {
      const errMessage = (error as Error).message || String(error);
      console.error(
        `\n❌ TEST_DB=postgres failed: Cannot reach PostgreSQL at ${process.env.DATABASE_URL || 'localhost:5432'}: ${errMessage}\n`
      );
      throw new Error(`PostgreSQL test connection failed: ${errMessage}`);
    }

    console.warn(
      '⚠️  PostgreSQL offline or unreachable. ANVAYA is operating with in-memory store for local development.'
    );
    return false;
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (dbConnected) {
    await prisma.$disconnect();
    dbConnected = false;
  }
}
