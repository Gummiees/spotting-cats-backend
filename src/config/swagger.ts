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
            id: {
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
            avatarUrl: {
              type: 'string',
              example: 'https://example.com/avatar.jpg',
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
            banReason: {
              type: 'string',
              example: 'Violation of community guidelines',
            },
            lastLoginAt: {
              type: 'string',
              format: 'date-time',
              description:
                'Last login timestamp (set to creation time for new users)',
              example: '2024-01-15T10:30:00.000Z',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
            emailUpdatedAt: {
              type: 'string',
              format: 'date-time',
            },
            usernameUpdatedAt: {
              type: 'string',
              format: 'date-time',
            },
            avatarUpdatedAt: {
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
        PublicUser: {
          type: 'object',
          description:
            'Public user information returned by getUserById endpoint',
          properties: {
            id: {
              type: 'string',
              description: 'User ID (renamed from _id)',
              example: '507f1f77bcf86cd799439011',
            },
            username: {
              type: 'string',
              description: 'User username (optional)',
              example: 'johndoe',
            },
            avatarUrl: {
              type: 'string',
              description: 'User avatar URL (optional)',
              example: 'https://example.com/avatar.jpg',
            },
            isAdmin: {
              type: 'boolean',
              description: 'Whether the user is an admin',
              example: false,
            },
            isInactive: {
              type: 'boolean',
              description: 'True if user is not active or banned or deleted',
              example: false,
            },
            isBanned: {
              type: 'boolean',
              description: 'Whether the user is banned',
              example: false,
            },
            lastLoginAt: {
              type: 'string',
              format: 'date-time',
              description:
                'Last login timestamp (set to creation time for new users)',
              example: '2024-01-15T10:30:00.000Z',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation timestamp',
              example: '2024-01-01T00:00:00.000Z',
            },
          },
        },
        PublicUserByUsername: {
          type: 'object',
          description:
            'Public user information returned by getUserByUsername endpoint (no ID included)',
          properties: {
            username: {
              type: 'string',
              description: 'User username (optional)',
              example: 'johndoe',
            },
            avatarUrl: {
              type: 'string',
              description: 'User avatar URL (optional)',
              example: 'https://example.com/avatar.jpg',
            },
            isAdmin: {
              type: 'boolean',
              description: 'Whether the user is an admin',
              example: false,
            },
            isInactive: {
              type: 'boolean',
              description: 'True if user is not active or banned or deleted',
              example: false,
            },
            isBanned: {
              type: 'boolean',
              description: 'Whether the user is banned',
              example: false,
            },
            lastLoginAt: {
              type: 'string',
              format: 'date-time',
              description:
                'Last login timestamp (set to creation time for new users)',
              example: '2024-01-15T10:30:00.000Z',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation timestamp',
              example: '2024-01-01T00:00:00.000Z',
            },
          },
        },
        Cat: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            userId: {
              type: 'string',
              description: 'ID of the user who owns the cat',
              example: '507f1f77bcf86cd799439011',
            },
            protectorId: {
              type: 'string',
              description: 'ID of the protector (optional)',
              example: '507f1f77bcf86cd799439012',
            },
            colonyId: {
              type: 'string',
              description: 'ID of the colony (optional)',
              example: '507f1f77bcf86cd799439013',
            },
            totalLikes: {
              type: 'number',
              description: 'Total number of likes',
              example: 0,
            },
            name: {
              type: 'string',
              example: 'Fluffy',
            },
            age: {
              type: 'number',
              minimum: 0,
              maximum: 30,
              example: 3,
            },
            breed: {
              type: 'string',
              description: 'Cat breed (optional)',
              example: 'Persian',
            },
            imageUrls: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Array of image URLs',
              example: [
                'https://example.com/cat1.jpg',
                'https://example.com/cat2.jpg',
              ],
            },
            xCoordinate: {
              type: 'number',
              minimum: -180,
              maximum: 180,
              description: 'Longitude coordinate',
              example: -73.935242,
            },
            yCoordinate: {
              type: 'number',
              minimum: -90,
              maximum: 90,
              description: 'Latitude coordinate',
              example: 40.73061,
            },
            extraInfo: {
              type: 'string',
              description: 'Additional information about the cat (optional)',
              example: 'Very friendly cat, loves children',
            },
            isDomestic: {
              type: 'boolean',
              description: 'Whether the cat is domestic or feral',
              example: true,
            },
            isMale: {
              type: 'boolean',
              description: 'Whether the cat is male',
              example: true,
            },
            isSterilized: {
              type: 'boolean',
              description: 'Whether the cat is sterilized',
              example: false,
            },
            isFriendly: {
              type: 'boolean',
              description: 'Whether the cat is friendly',
              example: true,
            },
            isUserOwner: {
              type: 'boolean',
              description: 'Whether the user is the owner',
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
            confirmedOwnerAt: {
              type: 'string',
              format: 'date-time',
              description: 'When the owner was confirmed (optional)',
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
