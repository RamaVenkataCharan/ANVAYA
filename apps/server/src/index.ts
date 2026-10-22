import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { connectDatabase, disconnectDatabase } from './config/prisma';
import { apiRouter } from './routes';
import { errorHandler } from './middleware/errorHandler';
import { NotFoundError } from './utils/errors';

const app = express();

// Security HTTP headers
app.use(helmet());

// CORS Configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow mobile apps, local dev, or tools with no origin header
      if (!origin || origin.startsWith('http://localhost') || origin.startsWith('exp://')) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in dev, customize for strict prod domain
    },
    credentials: true,
  })
);

// Logging
app.use(morgan(config.isDev ? 'dev' : 'combined'));

// Rate Limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per 15 min
  message: {
    success: false,
    error: 'TooManyRequests',
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(generalLimiter);

// Specific Auth Rate Limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // Limit auth attempts to prevent brute-forcing
  message: {
    success: false,
    error: 'TooManyRequests',
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
});
app.use(`${config.apiPrefix}/auth`, authLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Mount API routes
app.use(config.apiPrefix, apiRouter);

// Root route redirect/info
app.get('/', (_req, res) => {
  res.json({
    name: 'ANVAYA API Gateway',
    version: '1.0.0',
    description: 'Paperless Healthcare Ecosystem connecting Doctors, Medical Shops, and Patients',
    docs: `${config.apiPrefix}/health`,
  });
});

// 404 Handler
app.use((req, _res, next) => {
  next(new NotFoundError(`Endpoint not found: ${req.method} ${req.originalUrl}`));
});

// Centralized Error Handling
app.use(errorHandler);

// Start Server
const server = app.listen(config.port, async () => {
  console.log(`
=============================================================
  🌿 ANVAYA Healthcare Server is running!
  🚀 Port: ${config.port}
  🌍 Environment: ${config.env}
  🔗 API Gateway: http://localhost:${config.port}${config.apiPrefix}
  🩺 Health check: http://localhost:${config.port}${config.apiPrefix}/health
=============================================================
  `);
  await connectDatabase();
});

// Graceful Shutdown
async function handleShutdown(signal: string) {
  console.log(`\n🛑 Received ${signal}. Gracefully terminating ANVAYA server...`);
  server.close(async () => {
    await disconnectDatabase();
    console.log('💤 Server and database connections closed. Bye!');
    process.exit(0);
  });
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

export default app;
