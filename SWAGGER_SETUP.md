# Swagger API Documentation Setup

This project now includes comprehensive Swagger/OpenAPI documentation for all API endpoints.

## Features

- **Interactive API Documentation**: Browse and test all endpoints directly from the browser
- **Authentication Support**: Cookie-based authentication for protected endpoints
- **Request/Response Examples**: Detailed examples for all endpoints
- **Schema Definitions**: Complete data models for all entities
- **Error Handling**: Documented error responses and status codes
- **Rate Limiting**: Documented rate limiting for authentication endpoints

## Accessing the Documentation

Once the server is running, you can access the Swagger documentation at:

```
http://localhost:3000/api-docs
```

## API Endpoints Documentation

### Authentication Endpoints
- **POST** `/api/v1/users/send-code` - Send verification code to email
- **POST** `/api/v1/users/verify-code` - Verify code and authenticate user
- **POST** `/api/v1/users/logout` - Logout user

### User Management Endpoints
- **GET** `/api/v1/users/{userId}` - Get user by ID (Public access, returns limited user fields)
- **GET** `/api/v1/users/profile` - Get current user profile (Protected)
- **PUT** `/api/v1/users/username` - Update user's username (Protected)
- **POST** `/api/v1/users/deactivate` - Deactivate user account (Protected)
- **DELETE** `/api/v1/users/delete` - Permanently delete user account (Protected)

### Admin Management Endpoints
- **POST** `/api/v1/users/{userId}/ban` - Ban a user (Admin Only)
- **POST** `/api/v1/users/{userId}/unban` - Unban a user (Admin Only)
- **GET** `/api/v1/users/admin/all` - Get all users (Admin Only)

### Cat Management Endpoints
- **POST** `/api/v1/cats` - Create a new cat
- **GET** `/api/v1/cats` - Get all cats with filtering and pagination
- **GET** `/api/v1/cats/{id}` - Get a cat by ID
- **PUT** `/api/v1/cats/{id}` - Update a cat by ID
- **DELETE** `/api/v1/cats/{id}` - Delete a cat by ID

### Health Check Endpoints
- **GET** `/api/v1/health` - Basic health status
- **GET** `/api/v1/health/detailed` - Detailed health with system info
- **GET** `/api/v1/health/database` - Database connection status

### Cache Management Endpoints
- **POST** `/api/v1/cache/flush` - Flush all cache data
- **GET** `/api/v1/cache/{key}` - Get cache information for a key
- **POST** `/api/v1/cache/{key}` - Set cache data for a key
- **DELETE** `/api/v1/cache/{key}` - Delete cache data for a key

### Hello Endpoints
- **GET** `/` - Root welcome message
- **GET** `/api/v1/hello` - Simple hello message
- **GET** `/api/v1/hello/welcome` - Welcome message

## Authentication

The API uses HTTP-only cookies for authentication. When you authenticate via the `/api/v1/users/verify-code` endpoint, a JWT token is automatically set as a secure HTTP-only cookie.

### Testing Protected Endpoints

1. First, authenticate using the `/api/v1/users/verify-code` endpoint
2. The Swagger UI will automatically include the authentication cookie in subsequent requests
3. You can now test protected endpoints that require authentication

## Data Models

### User Model (Full)
```json
{
  "id": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "username": "johndoe",
  "avatarUrl": "https://example.com/avatar.jpg",
  "isAdmin": false,
  "isActive": true,
  "isBanned": false,
  "isDeleted": false,
  "banReason": "Violation of community guidelines",
  "lastLoginAt": "2024-01-15T10:30:00.000Z",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z",
  "emailUpdatedAt": "2024-01-05T12:00:00.000Z",
  "usernameUpdatedAt": "2024-01-10T15:20:00.000Z",
  "deactivatedAt": null,
  "deletedAt": null,
  "bannedAt": null
}
```

### Public User Model (for GET /api/v1/users/{userId})
```json
{
  "id": "507f1f77bcf86cd799439011",
  "username": "johndoe",
  "avatarUrl": "https://example.com/avatar.jpg",
  "isAdmin": false,
  "isInactive": false,
  "isBanned": false,
  "lastLoginAt": "2024-01-15T10:30:00.000Z",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### Cat Model
```json
{
  "id": "507f1f77bcf86cd799439011",
  "userId": "507f1f77bcf86cd799439011",
  "protectorId": "507f1f77bcf86cd799439012",
  "colonyId": "507f1f77bcf86cd799439013",
  "totalLikes": 0,
  "name": "Fluffy",
  "age": 3,
  "breed": "Persian",
  "imageUrls": ["https://example.com/cat1.jpg", "https://example.com/cat2.jpg"],
  "xCoordinate": -73.935242,
  "yCoordinate": 40.730610,
  "extraInfo": "Very friendly cat, loves children",
  "isDomestic": true,
  "isMale": true,
  "isSterilized": false,
  "isFriendly": true,
  "isUserOwner": false,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "confirmedOwnerAt": "2024-01-01T00:00:00.000Z"
}
```

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data here
  },
  "message": "Operation successful",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Rate Limiting

Authentication endpoints are rate-limited to prevent brute force attacks:
- **send-code**: 5 requests per 15 minutes
- **verify-code**: 10 requests per 15 minutes

## Development

### Adding New Endpoints

To add Swagger documentation for new endpoints:

1. Add JSDoc comments above your route definitions
2. Use the `@swagger` tag to define the OpenAPI specification
3. Include proper request/response schemas
4. Add appropriate tags for categorization

Example:
```javascript
/**
 * @swagger
 * /api/v1/example:
 *   get:
 *     summary: Example endpoint
 *     tags: [Example]
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.get('/example', controller.example);
```

### Updating Schemas

To add new data models, update the `src/config/swagger.ts` file and add new schemas to the `components.schemas` section.

## Configuration

The Swagger configuration is located in `src/config/swagger.ts`. You can customize:

- API information (title, version, description)
- Server URLs
- Security schemes
- Data schemas
- Tags and categories

## Security Considerations

- The Swagger UI is configured to include cookies in requests for authentication
- All sensitive endpoints are properly documented with authentication requirements
- Rate limiting information is included in the documentation
- Error responses are documented to help with debugging

## Troubleshooting

### Swagger UI Not Loading
- Ensure all dependencies are installed: `npm install`
- Check that the server is running on the correct port
- Verify that the `/api-docs` route is properly configured

### Authentication Issues
- Make sure to authenticate first using the `/api/v1/users/verify-code` endpoint
- Check that cookies are enabled in your browser
- Verify that the authentication cookie is being set correctly

### Missing Endpoints
- Ensure JSDoc comments are properly formatted
- Check that the file paths in `swaggerOptions.apis` are correct
- Restart the server after adding new documentation