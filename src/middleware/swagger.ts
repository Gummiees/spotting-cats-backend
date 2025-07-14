import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import swaggerOptions from '@/config/swagger';

const specs = swaggerJsdoc(swaggerOptions);

export const swaggerMiddleware = [
  swaggerUi.serve,
  swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Backend Project API Documentation',
    customfavIcon: '/favicon.ico',
    swaggerOptions: {
      docExpansion: 'list',
      filter: true,
      showRequestHeaders: true,
      tryItOutEnabled: true,
      requestInterceptor: (req: any) => {
        // Enable cookies for authentication
        req.credentials = 'include';
        return req;
      },
    },
  }),
] as any;

export default swaggerMiddleware;
