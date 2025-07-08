import 'module-alias/register';
import app from '@/app';
import { config } from '@/config';

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
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      console.log('Process terminated');
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
      console.log('Process terminated');
    });
  });
};

startServer();
