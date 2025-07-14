import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import swaggerOptions from '@/config/swagger';
import { RequestHandler } from 'express';

const specs = swaggerJsdoc(swaggerOptions);

export const swaggerMiddleware: RequestHandler[] = [
  ...swaggerUi.serve,
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
      requestInterceptor: (req: Record<string, unknown>) => {
        // Enable cookies for authentication
        req.credentials = 'include';
        return req;
      },
    },
  }),
];
export default swaggerMiddleware;
