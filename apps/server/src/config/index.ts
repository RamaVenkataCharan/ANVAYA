import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load environment variables from .env files
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

/**
 * Zod schema for validating server environment configuration.
 * Enforces production security constraints (strong secrets, database URL)
 * while allowing sensible defaults for local development and testing.
 */
const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z
      .string()
      .regex(/^\d+$/, 'PORT must be a numeric integer')
      .default('4000')
      .transform(Number),
    API_PREFIX: z.string().default('/api/v1'),
    DATABASE_URL: z.string().optional(),
    ALLOWED_ORIGINS: z.string().optional(),
    CLIENT_URL: z.string().default('http://localhost:8081'),
    WEB_URL: z.string().default('http://localhost:5173'),

    JWT_ACCESS_SECRET: z
      .string()
      .default('anvaya_default_access_secret_key_needs_replacement'),
    JWT_REFRESH_SECRET: z
      .string()
      .default('anvaya_default_refresh_secret_key_needs_replacement'),
    JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

    ADMIN_REGISTRATION_CODE: z.string().default('ANVAYA_ADMIN_2026_SECURE'),
    DEMO_PASSWORD: z.string().default('Password123'),

    S3_BUCKET: z.string().optional().default(''),
    S3_REGION: z.string().optional().default('auto'),
    S3_ENDPOINT: z.string().optional().default(''),
    S3_ACCESS_KEY: z.string().optional().default(''),
    S3_SECRET_KEY: z.string().optional().default(''),
  })
  .superRefine((data, ctx) => {
    // Production Security Checks
    if (data.NODE_ENV === 'production') {
      const knownInsecureSecrets = [
        'anvaya_default_access_secret_key_needs_replacement',
        'anvaya_default_refresh_secret_key_needs_replacement',
        'secret',
        'changeme',
        'password',
        '123456',
        'admin',
      ];

      if (!data.DATABASE_URL || data.DATABASE_URL.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['DATABASE_URL'],
          message: 'DATABASE_URL is required in production mode (PostgreSQL connection string)',
        });
      }

      if (
        !data.JWT_ACCESS_SECRET ||
        data.JWT_ACCESS_SECRET.length < 32 ||
        knownInsecureSecrets.includes(data.JWT_ACCESS_SECRET)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JWT_ACCESS_SECRET'],
          message:
            'JWT_ACCESS_SECRET must be at least 32 characters long and not use weak/default values in production',
        });
      }

      if (
        !data.JWT_REFRESH_SECRET ||
        data.JWT_REFRESH_SECRET.length < 32 ||
        knownInsecureSecrets.includes(data.JWT_REFRESH_SECRET)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JWT_REFRESH_SECRET'],
          message:
            'JWT_REFRESH_SECRET must be at least 32 characters long and not use weak/default values in production',
        });
      }
    }
  });

// Validate process.env on startup
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('\n❌ FATAL CONFIGURATION ERROR: Environment validation failed:');
  parsed.error.issues.forEach((issue) => {
    console.error(`   • [${issue.path.join('.') || 'CONFIG'}]: ${issue.message}`);
  });
  console.error('\nPlease check your .env file or container environment variables.\n');
  process.exit(1);
}

const env = parsed.data;

// Parse allowed origins for CORS
const parsedAllowedOrigins = env.ALLOWED_ORIGINS
  ? env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
  : [];

export const config = {
  env: env.NODE_ENV,
  isDev: env.NODE_ENV === 'development',
  isProd: env.NODE_ENV === 'production',
  port: env.PORT,
  apiPrefix: env.API_PREFIX,
  clientUrl: env.CLIENT_URL,
  webUrl: env.WEB_URL,
  allowedOrigins: Array.from(
    new Set([
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:8081',
      env.CLIENT_URL,
      env.WEB_URL,
      ...parsedAllowedOrigins,
    ].filter(Boolean))
  ),
  databaseUrl: env.DATABASE_URL,
  demoPassword: env.DEMO_PASSWORD,
  jwt: {
    accessSecret: env.JWT_ACCESS_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  },
  adminCode: env.ADMIN_REGISTRATION_CODE,
  s3: {
    bucket: env.S3_BUCKET,
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT,
    accessKey: env.S3_ACCESS_KEY,
    secretKey: env.S3_SECRET_KEY,
  },
};
