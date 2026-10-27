import { createApp } from './app';
import { config } from './config';
import { connectDatabase, disconnectDatabase } from './config/prisma';
import { initRefillReminderCron } from './jobs/refillReminders';

const app = createApp();

// Start Server
const server = app.listen(config.port, '0.0.0.0', async () => {
  console.log(`
=============================================================
  🌿 ANVAYA Healthcare Server is running!
  🚀 Port: ${config.port}
  🌍 Environment: ${config.env}
  🔗 API Gateway: http://localhost:${config.port}${config.apiPrefix}
  🩺 Health check: http://localhost:${config.port}${config.apiPrefix}/health
=============================================================
  `);
  try {
    await connectDatabase();
    initRefillReminderCron();
  } catch (error) {
    if (config.isProd) {
      console.error('Fatal startup error:', error);
      process.exit(1);
    }
  }
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
