# User Authentication System Setup

This project now includes a secure user authentication system using email-based verification codes and HTTP-only cookies with comprehensive role-based access control.

## Features

- **Email-based authentication**: Users receive verification codes via email
- **Secure HTTP-only cookies**: JWT tokens stored in secure cookies
- **Account management**: Users can deactivate their accounts
- **Rate limiting**: Protection against brute force attacks (production only)
- **Account deactivation**: Users can be deactivated but not deleted
- **Account deletion**: Users can permanently delete their accounts
- **Automatic cleanup**: Deactivated accounts are automatically deleted after 30 days
- **Role-based access control**: Four-tier role system (user, moderator, admin, superadmin)
- **User banning**: Role-based banning with proper permission checks
- **Email verification**: Automatic email sending for verification codes
- **Secure email changes**: Two-step email change process with verification codes
- **Admin controls**: Role-based endpoints for user management
- **Email whitelist**: Users with emails in whitelists automatically get appropriate roles

## Role System

### Role Hierarchy
1. **User** (default) - Basic user with standard permissions
2. **Moderator** - Can ban/unban regular users
3. **Admin** - Can ban/unban moderators and users, can promote users to moderators
4. **Superadmin** - Can manage all roles except other superadmins, can promote to admin

### Role Permissions

#### Superadmin
- Can ban/unban users, moderators, and admins
- Can promote users to moderator, admin, or superadmin roles
- Cannot ban or modify other superadmins
- Can view all users

#### Admin
- Can ban/unban users and moderators
- Can promote users to moderator role
- Cannot ban or modify admins or superadmins
- Can view all users

#### Moderator
- Can ban/unban regular users only
- Cannot ban or modify moderators, admins, or superadmins
- Cannot promote users to any role

#### User
- Standard user permissions
- Cannot ban or modify any users
- Cannot promote users to any role

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

# Role Configuration
ADMIN_EMAIL_WHITELIST=admin@example.com,superuser@example.com
SUPERADMIN_EMAIL_WHITELIST=superadmin@example.com,owner@example.com
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

### Role Management Endpoints (Role-based Authentication Required)

#### Update User Role
```
PUT /api/v1/users/role
Content-Type: application/json

{
  "username": "johndoe",
  "role": "moderator"
}
```
*Admin/Superadmin only. Cannot update your own role.*

#### Update User Roles by Whitelist (Open Endpoint)
```
POST /api/v1/users/role/whitelist
```
*No authentication required. Rate limited to 1 request per 15 minutes. Automatically promotes users whose emails are in admin/superadmin whitelists and demotes superadmins who are no longer in the superadmin whitelist.*

#### Ban User
```
POST /api/v1/users/ban
Body: { "username": "string", "reason": "string" }
```
*Role-based: Moderators can ban users, Admins can ban moderators and users, Superadmins can ban everyone except other superadmins.*

#### Unban User
```
POST /api/v1/users/unban
Body: { "username": "string" }
```
*Same role-based permissions as ban.*

#### Get All Users
```
GET /api/v1/users/admin/all
```
*Admin/Superadmin only.*

#### Manual Cleanup
```
POST /api/v1/users/admin/cleanup?days=30
```
*Admin/Superadmin only. Rate limited to 3 requests per hour. Deletes deactivated users older than specified days (default 30).*

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
10. **Role-based Banning**: Users can only ban users with roles they have permission to manage
11. **Role Management**: Proper role hierarchy enforcement with permission checks
12. **Secure Headers**: Helmet.js provides security headers
13. **CORS Protection**: Configurable CORS settings
14. **JWT Token Security**: Tokens include user ID, email, username, and role for complete user context
15. **IP Address Tracking**: Automatic tracking of IP addresses used for authentication (visible only to privileged users)

## JWT Token Structure

The application uses JWT tokens for authentication with the following payload structure:

```javascript
{
  userId: string,        // User's unique identifier
  email: string,         // User's email address
  username: string,      // User's username
  role: string,          // User's role (user, moderator, admin, superadmin)
  iat: number,          // Issued at timestamp (JWT standard)
  exp: number           // Expiration timestamp (JWT standard)
}
```

**Token Features:**
- **Complete User Context**: Contains all essential user information for authorization
- **Role Information**: Includes user role to avoid additional database queries
- **7-day Expiration**: Tokens expire after 7 days for security
- **Automatic Refresh**: Email and username changes automatically update the token to maintain session continuity
- **Proactive Refresh**: Tokens are automatically refreshed when they expire within 24 hours, maintaining seamless user sessions

## Role Assignment

### Automatic Role Assignment
- **Superadmin**: Users with emails in `SUPERADMIN_EMAIL_WHITELIST` automatically become superadmins
- **Admin**: Users with emails in `ADMIN_EMAIL_WHITELIST` (but not in superadmin list) automatically become admins
- **User**: All other users start with the 'user' role

### Manual Role Management
- **Admins** can promote users to moderator role
- **Superadmins** can promote users to moderator, admin, or superadmin roles
- Users cannot modify their own roles
- Role changes are tracked with timestamps and the ID of the user who made the change

## Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  email: String (unique, lowercase),
  username: String (unique),
  usernameUpdatedAt: Date (optional),
  avatarUrl: String (optional),
  avatarUpdatedAt: Date (optional),
  role: String (enum: 'user', 'moderator', 'admin', 'superadmin'),
  roleUpdatedAt: Date (optional),
  roleUpdatedBy: String (optional, ObjectId of user who updated role),
  isVerified: Boolean,
  isActive: Boolean,
  isDeleted: Boolean,
  isBanned: Boolean (default: false),
  banReason: String (optional),
  bannedBy: String (optional, ObjectId of user who banned them),
  createdAt: Date,
  updatedAt: Date,
  lastLoginAt: Date,
  deactivatedAt: Date (optional),
  bannedAt: Date (optional),
  ipAddresses: Array<String> (optional, array of IP addresses used for authentication)
}
```

### IP Address Tracking

The system automatically tracks IP addresses used for authentication:

- **New Users**: IP address is recorded when the account is created
- **Existing Users**: IP address is added to the array when they log in (if not already present)
- **Privacy**: IP addresses are only visible to users with elevated permissions (moderator, admin, superadmin)
- **Storage**: Uses MongoDB's `$addToSet` operator to prevent duplicate IP addresses
- **Proxy Support**: Handles various proxy headers (X-Forwarded-For, X-Real-IP, CF-Connecting-IP)

## Cleanup System

### Automatic Cleanup
The system includes an automatic cleanup process that runs daily at 2:00 AM UTC:

- **Deactivated User Cleanup**: Automatically deletes user accounts that have been deactivated for more than 30 days
- **Expired Code Cleanup**: Removes expired verification codes every hour
- **Data Orphaning**: Before deleting users, related data (cats, etc.) is properly orphaned to maintain data integrity

### Manual Cleanup
Admins and Superadmins can manually trigger the cleanup process using the admin endpoint:

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
6. **Role Assignment**: User gets appropriate role based on email whitelists
7. **Cookie Setting**: JWT token is set as HTTP-only cookie
8. **Authentication**: Subsequent requests use the cookie for authentication

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
- Review role assignments regularly
- Monitor role change logs for security
- Ensure superadmin emails are secure and limited 