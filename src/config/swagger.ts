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
              description:
                'User username (mandatory, auto-generated for new users)',
            },
            avatarUrl: {
              type: 'string',
              example: 'https://example.com/avatar.jpg',
            },
            role: {
              type: 'string',
              enum: ['user', 'moderator', 'admin', 'superadmin'],
              example: 'user',
              description:
                'User role in the system. Banned users are automatically demoted to "user" role.',
            },
            isActive: {
              type: 'boolean',
              example: true,
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
            bannedAt: {
              type: 'string',
              format: 'date-time',
            },
            bannedBy: {
              type: 'string',
              description:
                'Username of the user who banned this user (only visible to elevated permissions)',
              example: 'admin_user',
            },
            roleUpdatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'When the user role was last updated',
            },
            roleUpdatedBy: {
              type: 'string',
              description:
                'Username of the user who last updated this user role (only visible to elevated permissions)',
              example: 'superadmin_user',
            },
            ipAddresses: {
              type: 'array',
              items: {
                type: 'string',
              },
              description:
                'Array of IP addresses used for authentication (only visible to admin and superadmin users)',
              example: ['192.168.1.1', '10.0.0.1'],
            },
          },
        },
        PublicUser: {
          type: 'object',
          description:
            'Public user information returned by user endpoints (excludes email, IP addresses, and user ID)',
          properties: {
            username: {
              type: 'string',
              description: 'User username (mandatory)',
              example: 'johndoe',
            },
            avatarUrl: {
              type: 'string',
              description: 'User avatar URL (optional)',
              example: 'https://example.com/avatar.jpg',
            },
            role: {
              type: 'string',
              enum: ['user', 'moderator', 'admin', 'superadmin'],
              description: 'User role in the system',
              example: 'user',
            },
            isActive: {
              type: 'boolean',
              description: 'Whether the user account is active',
              example: true,
            },
            isBanned: {
              type: 'boolean',
              description: 'Whether the user is banned',
              example: false,
            },
            banReason: {
              type: 'string',
              description: 'Reason for the ban (if banned)',
              example: 'Violation of community guidelines',
            },
            bannedBy: {
              type: 'string',
              description: 'Username of the user who banned this user',
              example: 'admin_user',
            },
            lastLoginAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last login timestamp',
              example: '2024-01-15T10:30:00.000Z',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation timestamp',
              example: '2024-01-01T00:00:00.000Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
            emailUpdatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'When email was last updated',
            },
            usernameUpdatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'When username was last updated',
            },
            avatarUpdatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'When avatar was last updated',
            },
            deactivatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'When account was deactivated',
            },
            bannedAt: {
              type: 'string',
              format: 'date-time',
              description: 'When user was banned',
            },
            roleUpdatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'When the user role was last updated',
            },
            roleUpdatedBy: {
              type: 'string',
              description:
                'Username of the user who last updated this user role',
              example: 'superadmin_user',
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
              description: 'User username (mandatory)',
              example: 'johndoe',
            },
            avatarUrl: {
              type: 'string',
              description: 'User avatar URL (optional)',
              example: 'https://example.com/avatar.jpg',
            },
            role: {
              type: 'string',
              enum: ['user', 'moderator', 'admin', 'superadmin'],
              description: 'User role in the system',
              example: 'user',
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
        UsernameAvailabilityResponse: {
          type: 'object',
          description: 'Response for username availability check',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
              properties: {
                available: {
                  type: 'boolean',
                  description: 'Whether the username is available',
                  example: true,
                },
                message: {
                  type: 'string',
                  description: 'Human-readable message about availability',
                  example: 'Username is available',
                },
              },
            },
            message: {
              type: 'string',
              example: 'Username is available',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        EmailAvailabilityResponse: {
          type: 'object',
          description: 'Response for email availability check',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
              properties: {
                available: {
                  type: 'boolean',
                  description: 'Whether the email is available',
                  example: true,
                },
                message: {
                  type: 'string',
                  description: 'Human-readable message about availability',
                  example: 'Email is available',
                },
              },
            },
            message: {
              type: 'string',
              example: 'Email is available',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        EmailChangeVerificationRequest: {
          type: 'object',
          description: 'Request body for email change verification',
          required: ['code'],
          properties: {
            code: {
              type: 'string',
              description: 'Verification code sent to the new email address',
              example: '123456',
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
              description: 'Cat name (optional)',
              example: 'Fluffy',
            },
            age: {
              type: 'number',
              minimum: 0,
              maximum: 30,
              description: 'Cat age in years (optional)',
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
              description: 'Whether the cat is domestic or feral (optional)',
              example: true,
            },
            isMale: {
              type: 'boolean',
              description: 'Whether the cat is male (optional)',
              example: true,
            },
            isSterilized: {
              type: 'boolean',
              description: 'Whether the cat is sterilized (optional)',
              example: false,
            },
            isFriendly: {
              type: 'boolean',
              description: 'Whether the cat is friendly (optional)',
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
        Note: {
          type: 'object',
          description:
            'Note entity for privileged users to add notes about users',
          properties: {
            id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            forUserId: {
              type: 'string',
              description: 'ID of the user the note is for',
              example: '507f1f77bcf86cd799439011',
            },
            fromUserId: {
              type: 'string',
              description: 'ID of the user who created the note',
              example: '507f1f77bcf86cd799439012',
            },
            note: {
              type: 'string',
              description: 'The note content',
              example: 'User has been reported for inappropriate behavior',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'When the note was created',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'When the note was last updated (optional)',
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
        WhitelistRoleUpdateResponse: {
          type: 'object',
          description:
            'Response for whitelist-based role update endpoint (promotes whitelisted emails and demotes superadmins not in whitelist)',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
              properties: {
                totalWhitelistedEmails: {
                  type: 'number',
                  description: 'Total number of whitelisted emails processed',
                  example: 5,
                },
                promotedCount: {
                  type: 'number',
                  description:
                    'Number of users promoted to admin/superadmin roles',
                  example: 2,
                },
                demotedCount: {
                  type: 'number',
                  description:
                    'Number of superadmins demoted to user role (not in superadmin whitelist)',
                  example: 1,
                },
                noChangeCount: {
                  type: 'number',
                  description: 'Number of users who already had correct roles',
                  example: 2,
                },
                notFoundCount: {
                  type: 'number',
                  description:
                    "Number of whitelisted emails that don't have corresponding users",
                  example: 1,
                },
                totalUpdated: {
                  type: 'number',
                  description:
                    'Total number of users whose roles were changed (promoted + demoted)',
                  example: 3,
                },
                updates: {
                  type: 'array',
                  description:
                    'Detailed list of all processed emails and their results',
                  items: {
                    type: 'object',
                    properties: {
                      email: {
                        type: 'string',
                        description:
                          'Email address from the whitelist or existing superadmin',
                        example: 'admin@example.com',
                      },
                      previousRole: {
                        type: 'string',
                        description:
                          'User\'s previous role (or "N/A" if user not found)',
                        example: 'user',
                      },
                      newRole: {
                        type: 'string',
                        description:
                          'Target role based on whitelist or demotion to user',
                        example: 'admin',
                      },
                      updated: {
                        type: 'boolean',
                        description: 'Whether the role was actually updated',
                        example: true,
                      },
                      userFound: {
                        type: 'boolean',
                        description: 'Whether a user with this email exists',
                        example: true,
                      },
                      action: {
                        type: 'string',
                        enum: ['promoted', 'demoted', 'no_change', 'not_found'],
                        description: 'Type of action performed on this user',
                        example: 'promoted',
                      },
                    },
                  },
                },
              },
            },
            message: {
              type: 'string',
              description: 'Human-readable summary of the operation',
              example:
                'Processed 5 whitelisted emails and 2 superadmin users. Promoted 2, demoted 1, 2 no changes, 1 not found.',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        IpBanResponse: {
          type: 'object',
          description:
            'Response for IP ban operations with role hierarchy protection',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
              properties: {
                targetUser: {
                  $ref: '#/components/schemas/User',
                },
                affectedUsers: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/User',
                  },
                  description: 'Users who were successfully banned',
                },
                bannedIps: {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                  example: ['192.168.1.1', '10.0.0.1'],
                },
                totalBanned: {
                  type: 'number',
                  example: 3,
                  description: 'Number of users successfully banned',
                },
              },
            },
            message: {
              type: 'string',
              example: 'Successfully banned 3 users from 2 IP addresses',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        IpUnbanResponse: {
          type: 'object',
          description: 'Response for IP unban operations',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
              properties: {
                targetUser: {
                  $ref: '#/components/schemas/User',
                },
                affectedUsers: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/User',
                  },
                },
                unbannedIps: {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                  example: ['192.168.1.1', '10.0.0.1'],
                },
                totalUnbanned: {
                  type: 'number',
                  example: 3,
                },
              },
            },
            message: {
              type: 'string',
              example: 'Successfully unbanned 3 users from 2 IP addresses',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
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
