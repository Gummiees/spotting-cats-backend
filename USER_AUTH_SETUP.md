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
- **Data encryption**: Email addresses are encrypted in the database
- **IP hashing**: IP addresses are hashed for privacy and security

## Data Security

### Email Encryption
- **Method**: AES-256-GCM encryption
- **Purpose**: Protect user email addresses in the database
- **Reversible**: Yes, for sending emails and user operations
- **Key Storage**: Environment variable `EMAIL_ENCRYPTION_KEY` (32 bytes, hex format)
- **Usage**: All email operations automatically encrypt/decrypt as needed

### IP Address Hashing
- **Method**: HMAC-SHA256 hashing
- **Purpose**: Protect user IP addresses while maintaining ban functionality
- **Reversible**: No, but can still ban/check IPs by hashing input
- **Key Storage**: Environment variable `IP_HASH_KEY` (32 bytes, hex format)
- **Usage**: IP addresses are hashed before storage, but ban operations work normally

### Environment Variables Required
```env
# Email encryption key (32 bytes = 64 hex characters)
EMAIL_ENCRYPTION_KEY=your_32_byte_encryption_key_here_as_hex

# IP hashing key (32 bytes = 64 hex characters)  
IP_HASH_KEY=your_32_byte_hashing_key_here_as_hex
```

### Security Benefits
- **Email Protection**: Encrypted emails prevent data breaches from exposing user emails
- **IP Privacy**: Hashed IPs prevent user tracking while maintaining security features
- **Compliance**: Meets GDPR and other privacy regulation requirements
- **Key Management**: Separate keys for different data types allow for independent rotation

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

#### User
- Basic user permissions
- Cannot ban or modify other users

## Authentication Flow

### 1. Email Verification Request
1. User submits email address
2. System validates email format
3. System checks if IP is banned
4. System generates verification code
5. System sends email with verification code
6. System stores encrypted email and hashed IP in database

### 2. Code Verification and Authentication
1. User submits email and verification code
2. System validates verification code
3. System creates new user or updates existing user
4. System generates JWT token with user information
5. System sets secure HTTP-only cookie
6. System returns user data (email decrypted for client)

### 3. Session Management
- JWT tokens include user ID, email, username, and role
- Tokens expire after 7 days
- Automatic token refresh when within 24 hours of expiration
- Secure cookie settings for production environments

## Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  email: String (encrypted with AES-256-GCM),
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
  ipAddresses: Array<String> (hashed with HMAC-SHA256)
}
```

### IP Address Tracking

The system automatically tracks IP addresses used for authentication:

- **New Users**: IP address is hashed and recorded when the account is created
- **Existing Users**: Hashed IP address is added to the array when they log in (if not already present)
- **Privacy**: IP addresses are hashed before storage for privacy
- **Ban Operations**: IP banning works by comparing hashed IPs
- **Storage**: Uses MongoDB's `$addToSet` operator to prevent duplicate hashed IP addresses
- **Proxy Support**: Handles various proxy headers (X-Forwarded-For, X-Real-IP, CF-Connecting-IP)

## Cleanup System

### Automatic Cleanup
The system includes an automatic cleanup process that runs daily at 2:00 AM UTC:

- **Deactivated User Cleanup**: Automatically deletes user accounts that have been deactivated for more than 30 days
- **Expired Verification Codes**: Removes expired email verification codes
- **Expired Email Change Requests**: Removes expired email change verification codes

### Manual Cleanup
- **Admin Triggered**: Admins can manually trigger cleanup with custom retention periods
- **Rate Limited**: Manual cleanup is rate limited to prevent abuse
- **Audit Trail**: All cleanup operations are logged for audit purposes

## Security Features

### Rate Limiting
- **Email Verification**: Rate limited to prevent spam
- **Login Attempts**: Rate limited to prevent brute force attacks
- **Email Changes**: Rate limited to prevent abuse
- **Admin Operations**: Rate limited to prevent abuse

### Input Validation
- **Email Format**: Strict email format validation
- **Username Format**: Alphanumeric and underscore only, 3-20 characters
- **Avatar URLs**: Must be valid HTTPS URLs from trusted sources
- **XSS Protection**: Input sanitization and validation

### Security Headers
- **Helmet.js**: Comprehensive security headers
- **CORS**: Configurable cross-origin resource sharing
- **Content Security Policy**: XSS protection
- **HSTS**: HTTP Strict Transport Security

## API Endpoints

### Authentication
- `POST /api/v1/users/send-code` - Send verification code
- `POST /api/v1/users/verify-code` - Verify code and authenticate
- `POST /api/v1/users/logout` - Logout and clear cookie
- `POST /api/v1/users/refresh-token` - Refresh authentication token

### User Management
- `GET /api/v1/users/profile` - Get current user profile
- `PUT /api/v1/users/username` - Update username
- `PUT /api/v1/users/email` - Initiate email change
- `POST /api/v1/users/email/verify` - Verify email change
- `PUT /api/v1/users/avatar` - Update avatar URL
- `POST /api/v1/users/deactivate` - Deactivate account
- `DELETE /api/v1/users/delete` - Permanently delete account

### Admin Operations
- `GET /api/v1/users/admin/all` - Get all users (admin only)
- `POST /api/v1/users/admin/ban` - Ban user (admin only)
- `POST /api/v1/users/admin/unban` - Unban user (admin only)
- `POST /api/v1/users/admin/role` - Update user role (admin only)
- `POST /api/v1/users/admin/ip-ban` - Ban users by IP (admin only)
- `POST /api/v1/users/admin/ip-unban` - Unban users by IP (admin only)

## Error Handling

### Standard Error Response
```json
{
  "success": false,
  "error": "Error Type",
  "message": "Human-readable error message",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Specific Error Codes
- `EMAIL_SAME_AS_CURRENT` - New email same as current email
- `EMAIL_CHANGE_RATE_LIMITED` - Email change rate limit exceeded
- `ACCOUNT_BANNED` - User account is banned
- `IP_BANNED` - IP address is banned

## JWT Token Structure

The application uses JWT tokens for authentication with the following payload structure:

```javascript
{
  userId: string,        // User's unique identifier
  email: string,         // User's email address (decrypted)
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

## Implementation Notes

### Key Management
- **Key Generation**: Use cryptographically secure random key generation
- **Key Storage**: Store keys in environment variables or secure key management systems
- **Key Rotation**: Plan for regular key rotation without service disruption
- **Backup**: Ensure keys are backed up securely for disaster recovery

### Migration Considerations
- **Existing Data**: Existing unencrypted emails and IPs will need migration
- **Downtime**: Encryption migration may require brief service downtime
- **Rollback Plan**: Maintain ability to rollback to unencrypted data if needed
- **Testing**: Thoroughly test encryption/decryption in staging environment

### Performance Impact
- **Email Operations**: Minimal performance impact from encryption/decryption
- **IP Operations**: No performance impact from hashing
- **Database Queries**: Encrypted email lookups require full table scans (consider indexing strategies)
- **Caching**: User cache service handles encrypted data transparently

## Compliance and Privacy

### GDPR Compliance
- **Data Minimization**: Only collect necessary user data
- **Encryption**: Sensitive data encrypted at rest
- **Right to Deletion**: Users can permanently delete their accounts
- **Data Portability**: Users can export their data
- **Consent Management**: Clear consent for data collection and processing

### Security Best Practices
- **Defense in Depth**: Multiple layers of security controls
- **Principle of Least Privilege**: Users only have necessary permissions
- **Secure by Default**: Security features enabled by default
- **Regular Audits**: Security reviews and penetration testing
- **Incident Response**: Plan for security incident handling 