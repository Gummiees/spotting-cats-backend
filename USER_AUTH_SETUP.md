# User Authentication System Setup

This project now includes a secure user authentication system using email-based verification codes and HTTP-only cookies.

## Features

- **Email-based authentication**: Users receive verification codes via email
- **Secure HTTP-only cookies**: JWT tokens stored in secure cookies
- **Account management**: Users can deactivate their accounts
- **Rate limiting**: Protection against brute force attacks (production only)
- **Account deactivation**: Users can be deactivated but not deleted
- **Account deletion**: Users can permanently delete their accounts
- **Automatic cleanup**: Deactivated accounts are automatically deleted after 30 days
- **User banning**: Admins can ban/unban users (banned users cannot authenticate)
- **Email verification**: Automatic email sending for verification codes
- **Secure email changes**: Two-step email change process with verification codes
- **Admin controls**: Admin-only endpoints for user management
- **Admin email whitelist**: Users with emails in the whitelist automatically become admins

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
SMTP_FROM=your-email@gmail.com

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Admin Configuration
ADMIN_EMAIL_WHITELIST=admin@example.com,superuser@example.com
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

#### Refresh Token
```
POST /api/v1/users/refresh-token
```
*Automatically refreshes the authentication token if it expires within 24 hours. Useful for maintaining long-term sessions.*

### Protected Endpoints (Authentication Required)

#### Get Current User Profile
```
GET /api/v1/users/profile
```

#### Update Username
```
PUT /api/v1/users/username
Content-Type: application/json

{
  "username": "newusername"
}
```

#### Initiate Email Change
```
PUT /api/v1/users/email
Content-Type: application/json

{
  "email": "newemail@example.com"
}
```

#### Verify Email Change
```
POST /api/v1/users/email/verify
Content-Type: application/json

{
  "code": "123456"
}
```

#### Deactivate Account
```
POST /api/v1/users/deactivate
```

#### Delete Account
```
POST /api/v1/users/delete
```

### Admin Endpoints (Admin Authentication Required)

#### Ban User
```
POST /api/v1/users/ban
Body: { "username": "string", "banReason": "string" }
```

#### Unban User
```
POST /api/v1/users/unban
Body: { "username": "string" }
```

#### Get All Users
```
GET /api/v1/users/admin/all
```

#### Manual Cleanup
```
POST /api/v1/users/admin/cleanup?days=30
```
*Rate limited to 3 requests per hour. Deletes deactivated users older than specified days (default 30).*

## Security Features

1. **HTTP-only Cookies**: JWT tokens are stored in secure HTTP-only cookies
2. **Rate Limiting**: Authentication endpoints are rate-limited to prevent brute force attacks (production only)
3. **Email Validation**: Proper email format validation
4. **Code Expiration**: Verification codes expire after 10 minutes
5. **Secure Email Changes**: Two-step email change process with verification codes sent to new email address
6. **Account Status Tracking**: Users can be active, deactivated, or banned
7. **Account Deactivation**: Deactivated users are marked as inactive but not physically removed
8. **Account Deletion**: Users can permanently delete their accounts (marked as deleted)
9. **Automatic Cleanup**: Deactivated accounts are automatically deleted after 30 days via scheduled cron job
10. **User Banning**: Banned users cannot authenticate or access protected endpoints
11. **Admin Controls**: Admin-only endpoints for user management with proper authorization
12. **Secure Headers**: Helmet.js provides security headers
13. **CORS Protection**: Configurable CORS settings
14. **JWT Token Security**: Tokens include user ID, email, username, and admin status for complete user context

## JWT Token Structure

The application uses JWT tokens for authentication with the following payload structure:

```javascript
{
  userId: string,        // User's unique identifier
  email: string,         // User's email address
  username: string,      // User's username
  isAdmin: boolean,      // Whether the user has admin privileges
  iat: number,          // Issued at timestamp (JWT standard)
  exp: number           // Expiration timestamp (JWT standard)
}
```

**Token Features:**
- **Complete User Context**: Contains all essential user information for authorization
- **Admin Status**: Includes admin privileges to avoid additional database queries
- **7-day Expiration**: Tokens expire after 7 days for security
- **Automatic Refresh**: Email and username changes automatically update the token to maintain session continuity
- **Proactive Refresh**: Tokens are automatically refreshed when they expire within 24 hours, maintaining seamless user sessions

## Secure Email Change Flow

The application implements a secure two-step email change process to prevent unauthorized email modifications:

### Step 1: Initiate Email Change
- **Endpoint**: `PUT /api/v1/users/email`
- **Authentication**: Required
- **Process**:
  1. User provides new email address
  2. System validates email format and availability
  3. System checks 90-day cooldown period (prevents frequent changes)
  4. System generates 6-digit verification code
  5. Verification code is sent to the new email address
  6. Email change request is stored with 10-minute expiration

### Step 2: Verify Email Change
- **Endpoint**: `POST /api/v1/users/email/verify`
- **Process**:
  1. User provides verification code from new email
  2. System validates code against stored request
  3. Email address is updated if verification succeeds
  4. New JWT token is generated with updated email address
  5. Authentication cookie is updated to maintain user session
  6. Email change request is cleaned up

## Username Update Flow

The application supports secure username updates with automatic token regeneration:

### Username Update Process
- **Endpoint**: `PUT /api/v1/users/username`
- **Authentication**: Required
- **Process**:
  1. User provides new username
  2. System validates username format and availability
  3. System checks 30-day cooldown period (prevents frequent changes)
  4. Username is updated if validation succeeds
  5. New JWT token is generated with updated username
  6. Authentication cookie is updated to maintain user session

### Security Features
- **30-day Cooldown**: Users can only change username once every 30 days
- **Format Validation**: Username must be 3-20 characters, alphanumeric + underscores only
- **Availability Check**: Username must be unique across all users
- **Reserved Names**: Certain usernames (admin, root, etc.) are reserved
- **Automatic Token Update**: JWT token is automatically updated with new username
- **Session Continuity**: User session is maintained without requiring re-authentication

## Proactive Token Refresh

The application implements a proactive token refresh mechanism to maintain seamless user sessions:

### How It Works
- **24-Hour Threshold**: Tokens are automatically refreshed when they expire within the next 24 hours
- **Automatic Detection**: The auth middleware checks token expiration on every authenticated request
- **Seamless Experience**: Users don't need to manually re-authenticate when tokens are close to expiring
- **Cookie Update**: New tokens are automatically set as secure HTTP-only cookies

### Refresh Scenarios
1. **Automatic Refresh**: Happens transparently during normal API calls
2. **Explicit Refresh**: Clients can call `/api/v1/users/refresh-token` to proactively refresh tokens
3. **No Refresh Needed**: If token is still valid for more than 24 hours, no action is taken

### Security Features
- **Verification Codes**: 6-digit codes sent to new email address
- **10-minute Expiration**: Codes expire after 10 minutes
- **Single Use**: Codes can only be used once
- **90-day Cooldown**: Users can only change email once every 90 days
- **Automatic Cleanup**: Email change requests are cleaned up when users are deleted/banned
- **Email Validation**: Comprehensive email format and availability checks

### Database Storage
Email change requests are stored in the `auth_codes` collection with additional fields:
```javascript
{
  _id: ObjectId,
  userId: ObjectId,        // Reference to user
  newEmail: String,        // The new email address
  code: String,           // 6-digit verification code
  expiresAt: Date,        // 10-minute expiration
  used: Boolean,          // Whether code has been used
  createdAt: Date         // Creation timestamp
}
```

## Database Collections

### Users Collection
```javascript
{
  _id: ObjectId,
  email: String (unique, lowercase),
  username: String (optional),
  usernameUpdatedAt: Date (optional),
  avatarUrl: String (optional),
  avatarUpdatedAt: Date (optional),
  isAdmin: Boolean (default: false),
  isVerified: Boolean,
  isActive: Boolean,
  isDeleted: Boolean,
  isBanned: Boolean (default: false),
  createdAt: Date,
  updatedAt: Date,
  lastLoginAt: Date,
  deactivatedAt: Date (optional),
  deletedAt: Date (optional),
  bannedAt: Date (optional)
}
```

## Cleanup System

### Automatic Cleanup
The system includes an automatic cleanup process that runs daily at 2:00 AM UTC:

- **Deactivated User Cleanup**: Automatically deletes user accounts that have been deactivated for more than 30 days
- **Expired Code Cleanup**: Removes expired verification codes every hour
- **Data Orphaning**: Before deleting users, related data (cats, etc.) is properly orphaned to maintain data integrity

### Manual Cleanup
Admins can manually trigger the cleanup process using the admin endpoint:

```bash
# Default cleanup (30 days retention)
POST /api/v1/users/admin/cleanup

# Custom retention period
POST /api/v1/users/admin/cleanup?days=7
```

**Rate Limiting**: Manual cleanup is rate-limited to 3 requests per hour per IP address in production.

### Cleanup Process Details
1. **User Identification**: Finds users with `isActive: false` and `deactivatedAt` older than retention period
2. **Data Orphaning**: Removes user references from related collections (cats, etc.)
3. **User Deletion**: Permanently removes user records from the database
4. **Banned Users**: Banned users are excluded from cleanup to prevent accidental deletion
5. **Logging**: All cleanup operations are logged for audit purposes

### Configuration
- **Retention Period**: 30 days (configurable via manual endpoint)
- **Schedule**: Daily at 2:00 AM UTC
- **Timezone**: UTC (configurable in cleanup service)

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

### Gmail Configuration
For Gmail, you'll need to:
1. Enable 2-factor authentication on your Google account
2. Generate an App Password (Google Account → Security → App Passwords)
3. Use the App Password in `SMTP_PASS`

### SMTP_FROM Configuration
The `SMTP_FROM` environment variable specifies the sender email address that will appear in the "From" field of emails. This should be:
- The same as `SMTP_USER` for most cases
- A verified email address that your SMTP provider allows you to send from
- Properly configured to avoid email delivery issues

**Note**: The `SMTP_FROM` field is required by most SMTP servers. If not set, it defaults to the `SMTP_USER` value.

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