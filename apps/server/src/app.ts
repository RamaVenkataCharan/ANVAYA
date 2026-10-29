/**
 * app.ts — Express application factory, separate from server startup.
 * Imported by index.ts (which adds listen()) and by integration tests (which use supertest).
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { apiRouter } from './routes';
import { errorHandler } from './middleware/errorHandler';
import { NotFoundError } from './utils/errors';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        // Mobile apps, curl, or same-origin requests send no origin header
        if (!origin) return callback(null, true);

        // Check if origin matches any configured allowed origin
        if (config.allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        // In development or test, permit local dev tools and mobile Expo
        if (config.isDev || config.env === 'test') {
          if (
            origin.startsWith('http://localhost') ||
            origin.startsWith('http://127.0.0.1') ||
            origin.startsWith('http://192.168.') ||
            origin.startsWith('http://10.') ||
            origin.startsWith('exp://')
          ) {
            return callback(null, true);
          }
        }

        return callback(new Error(`CORS policy violation: Origin ${origin} is not allowed.`));
      },
      credentials: true,
    })
  );

  // Silence request logs in test
  if (config.env !== 'test') {
    app.use(morgan(config.isDev ? 'dev' : 'combined'));
  }

  // Global rate limiter — lifted for tests by setting a very high max
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: config.env === 'test' ? 10_000 : 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: 'TooManyRequests',
      message: 'Too many requests from this IP, please try again after 15 minutes.',
    },
  });
  app.use(generalLimiter);

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: config.env === 'test' ? 10_000 : 30,
    message: {
      success: false,
      error: 'TooManyRequests',
      message: 'Too many authentication attempts. Please try again after 15 minutes.',
    },
  });
  app.use(`${config.apiPrefix}/auth`, authLimiter);

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  app.use(config.apiPrefix, apiRouter);

  app.get('/', (_req, res) => {
    res.json({
      name: 'ANVAYA API Gateway',
      version: '1.0.0',
      description: 'Paperless Healthcare Ecosystem connecting Doctors, Medical Shops, and Patients',
      docs: `${config.apiPrefix}/health`,
    });
  });

  app.use((req, _res, next) => {
    next(new NotFoundError(`Endpoint not found: ${req.method} ${req.originalUrl}`));
  });

  app.use(errorHandler);

  return app;
}
