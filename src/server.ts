import 'module-alias/register';
import app from '@/app';
import { config } from '@/config';
import { disconnectRedis } from '@/utils/redis';
import { disconnectMongo } from '@/utils/mongo';

const startServer = (): void => {
  const server = app.listen(config.port, () => {
    console.log(`🚀 Server is running on port ${config.port}`);
    console.log(`📡 API available at http://localhost:${config.port}`);
    console.log(
      `🔗 Hello World endpoint: http://localhost:${config.port}/api/hello`
    );
    console.log(`💚 Health check: http://localhost:${config.port}/api/health`);
    console.log(`🌍 Environment: ${config.nodeEnv}`);
    console.log(`📦 Version: ${config.version}`);
  });

  // Graceful shutdown
  const gracefulShutdown = async (signal: string) => {
    console.log(`${signal} received, shutting down gracefully`);
    server.close(async () => {
      try {
        await disconnectRedis();
        console.log('✅ Redis disconnected');
      } catch (error) {
        console.error('❌ Error disconnecting Redis:', error);
      }

      try {
        await disconnectMongo();
        console.log('✅ MongoDB disconnected');
      } catch (error) {
        console.error('❌ Error disconnecting MongoDB:', error);
      }

      console.log('Process terminated');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
};

startServer();
