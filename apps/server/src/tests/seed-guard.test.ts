import { describe, it, expect } from 'vitest';
import { verifySeedEnvironment } from '../../prisma/seed';

describe('FLAG-08: Production Database Seed Execution Guard', () => {
  it('Throws error and blocks execution when NODE_ENV=production and ALLOW_PROD_SEED is not set', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalOverride = process.env.ALLOW_PROD_SEED;

    try {
      process.env.NODE_ENV = 'production';
      delete process.env.ALLOW_PROD_SEED;

      expect(() => verifySeedEnvironment()).toThrow(
        /Database seeding is strictly blocked in production environment/i
      );
    } finally {
      process.env.NODE_ENV = originalEnv;
      process.env.ALLOW_PROD_SEED = originalOverride;
    }
  });

  it('Permits execution when NODE_ENV=production AND ALLOW_PROD_SEED=true', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalOverride = process.env.ALLOW_PROD_SEED;

    try {
      process.env.NODE_ENV = 'production';
      process.env.ALLOW_PROD_SEED = 'true';

      expect(() => verifySeedEnvironment()).not.toThrow();
    } finally {
      process.env.NODE_ENV = originalEnv;
      process.env.ALLOW_PROD_SEED = originalOverride;
    }
  });

  it('Permits execution when NODE_ENV is development or test', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalOverride = process.env.ALLOW_PROD_SEED;

    try {
      process.env.NODE_ENV = 'development';
      delete process.env.ALLOW_PROD_SEED;
      expect(() => verifySeedEnvironment()).not.toThrow();

      process.env.NODE_ENV = 'test';
      expect(() => verifySeedEnvironment()).not.toThrow();
    } finally {
      process.env.NODE_ENV = originalEnv;
      process.env.ALLOW_PROD_SEED = originalOverride;
    }
  });
});
