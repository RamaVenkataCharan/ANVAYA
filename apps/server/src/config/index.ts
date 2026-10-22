import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
// Fallback to current directory .env if present
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  isDev: (process.env.NODE_ENV || 'development') === 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: parseInt(process.env.PORT || '4000', 10),
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:8081',

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'anvaya_default_access_secret_key_needs_replacement',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'anvaya_default_refresh_secret_key_needs_replacement',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  adminCode: process.env.ADMIN_REGISTRATION_CODE || 'ANVAYA_ADMIN_2026_SECURE',

  s3: {
    bucket: process.env.S3_BUCKET || '',
    region: process.env.S3_REGION || 'auto',
    endpoint: process.env.S3_ENDPOINT || '',
    accessKey: process.env.S3_ACCESS_KEY || '',
    secretKey: process.env.S3_SECRET_KEY || '',
  },
};
