import { Options } from 'swagger-jsdoc';

const swaggerOptions: Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Backend Project API',
      version: '1.0.0',
      description:
        'A comprehensive backend API with user authentication, cat management, caching, and health monitoring',
      contact: {
        name: 'API Support',
        email: 'support@example.com',
      },
      license: {
        name: 'ISC',
        url: 'https://opensource.org/licenses/ISC',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'auth-token',
          description: 'JWT token stored in HTTP-only cookie',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
              example: 'Error message',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
            },
            message: {
              type: 'string',
              example: 'Operation successful',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com',
            },
            username: {
              type: 'string',
              example: 'johndoe',
            },
            usernameUpdatedAt: {
              type: 'string',
              format: 'date-time',
            },
            isAdmin: {
              type: 'boolean',
              example: false,
            },
            isActive: {
              type: 'boolean',
              example: true,
            },
            isDeleted: {
              type: 'boolean',
              example: false,
            },
            isBanned: {
              type: 'boolean',
              example: false,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
            lastLoginAt: {
              type: 'string',
              format: 'date-time',
            },
            deactivatedAt: {
              type: 'string',
              format: 'date-time',
            },
            deletedAt: {
              type: 'string',
              format: 'date-time',
            },
            bannedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Cat: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            name: {
              type: 'string',
              example: 'Fluffy',
            },
            breed: {
              type: 'string',
              example: 'Persian',
            },
            age: {
              type: 'number',
              example: 3,
            },
            color: {
              type: 'string',
              example: 'White',
            },
            weight: {
              type: 'number',
              example: 4.5,
            },
            isVaccinated: {
              type: 'boolean',
              example: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        HealthStatus: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['healthy', 'unhealthy'],
              example: 'healthy',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
            uptime: {
              type: 'number',
              example: 3600,
            },
            version: {
              type: 'string',
              example: '1.0.0',
            },
          },
        },
        DatabaseStatus: {
          type: 'object',
          properties: {
            mongodb: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  enum: ['connected', 'disconnected', 'error'],
                  example: 'connected',
                },
                responseTime: {
                  type: 'number',
                  example: 15,
                },
              },
            },
            redis: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  enum: ['connected', 'disconnected', 'error'],
                  example: 'connected',
                },
                responseTime: {
                  type: 'number',
                  example: 5,
                },
              },
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization endpoints',
      },
      {
        name: 'Users',
        description: 'User management endpoints',
      },
      {
        name: 'Admin',
        description: 'Admin-only user management endpoints',
      },
      {
        name: 'Cats',
        description: 'Cat management endpoints',
      },
      {
        name: 'Health',
        description: 'Health check and monitoring endpoints',
      },
      {
        name: 'Cache',
        description: 'Cache management endpoints',
      },
      {
        name: 'Hello',
        description: 'Welcome and basic endpoints',
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts', './src/models/*.ts'],
};

export default swaggerOptions;
