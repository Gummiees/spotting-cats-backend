# User Authentication System Setup

This project now includes a secure user authentication system using email-based verification codes and HTTP-only cookies.

## Features

- **Email-based authentication**: Users receive verification codes via email
- **Secure HTTP-only cookies**: JWT tokens stored in secure cookies
- **Account management**: Users can deactivate their accounts
- **Rate limiting**: Protection against brute force attacks
- **Account deactivation**: Users can be deactivated but not deleted
- **Email verification**: Automatic email sending for verification codes

## Environment Variables Required

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# MongoDB Configuration
MONGO_URL=mongodb://localhost:27017/your-database-name
MONGO_DB_NAME=your-database-name

# Redis Configuration (optional)
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

## API Endpoints

### Public Endpoints (No Authentication Required)

#### Send Verification Code
```
POST /api/v1/users/send-code
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Verify Code and Authenticate
```
POST /api/v1/users/verify-code
Content-Type: application/json

{
  "email": "user@example.com",
  "code": "123456"
}
```

#### Logout
```
POST /api/v1/users/logout
```

### Protected Endpoints (Authentication Required)

#### Get Current User Profile
```
GET /api/v1/users/profile
```

#### Deactivate Account
```
POST /api/v1/users/deactivate
```



## Security Features

1. **HTTP-only Cookies**: JWT tokens are stored in secure HTTP-only cookies
2. **Rate Limiting**: Authentication endpoints are rate-limited to prevent brute force attacks
3. **Email Validation**: Proper email format validation
4. **Code Expiration**: Verification codes expire after 10 minutes
5. **Account Status Tracking**: Users can be active or deactivated
6. **Account Deactivation**: Deactivated users are marked as inactive but not physically removed
7. **Secure Headers**: Helmet.js provides security headers
8. **CORS Protection**: Configurable CORS settings

## Database Collections

### Users Collection
```javascript
{
  _id: ObjectId,
  email: String (unique, lowercase),
  isVerified: Boolean,
  isActive: Boolean,
  isDeleted: Boolean,
  createdAt: Date,
  updatedAt: Date,
  lastLoginAt: Date,
  deactivatedAt: Date,
  deletedAt: Date
}
```

### Auth Codes Collection
```javascript
{
  _id: ObjectId,
  email: String,
  code: String,
  expiresAt: Date,
  used: Boolean,
  createdAt: Date
}
```

## Usage Flow

1. **Registration/Login**: User provides email
2. **Code Generation**: System generates 6-digit verification code
3. **Email Sending**: Code is sent to user's email
4. **Code Verification**: User enters the code
5. **Account Creation/Login**: System creates account or logs in existing user
6. **Cookie Setting**: JWT token is set as HTTP-only cookie
7. **Authentication**: Subsequent requests use the cookie for authentication

## Email Setup

For Gmail, you'll need to:
1. Enable 2-factor authentication
2. Generate an App Password
3. Use the App Password in SMTP_PASS

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Security Considerations

- Change JWT_SECRET in production
- Use HTTPS in production
- Configure proper CORS origins
- Set up proper email service
- Monitor rate limiting
- Regularly clean up expired verification codes 