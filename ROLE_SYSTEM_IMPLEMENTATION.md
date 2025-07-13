# Role-Based Access Control System Implementation

This document outlines the comprehensive role-based access control (RBAC) system implemented in the backend project, replacing the simple admin/user binary system with a four-tier role hierarchy.

## Overview

The system now supports four distinct user roles with hierarchical permissions:

1. **User** (default) - Basic user with standard permissions
2. **Moderator** - Can ban/unban regular users
3. **Admin** - Can ban/unban moderators and users, can promote users to moderators
4. **Superadmin** - Can manage all roles except other superadmins, can promote to admin

## Implementation Details

### 1. Database Schema Changes

#### User Model Updates (`src/models/user.ts`)
- Replaced `isAdmin: boolean` with `role: UserRole`
- Added role tracking fields:
  - `roleUpdatedAt?: Date` - When the role was last changed
  - `roleUpdatedBy?: string` - ID of the user who made the change

#### New Type Definitions
```typescript
export type UserRole = 'user' | 'moderator' | 'admin' | 'superadmin';

export interface User {
  // ... existing fields
  role: UserRole;
  roleUpdatedAt?: Date;
  roleUpdatedBy?: string;
}
```

### 2. Role Hierarchy and Permissions

#### Role Hierarchy Constants
```typescript
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  user: 0,
  moderator: 1,
  admin: 2,
  superadmin: 3,
};
```

#### Permission Functions
- `hasRolePermission(userRole, requiredRole)` - Check if user has required role level
- `canManageRole(managerRole, targetRole)` - Check if user can assign target role
- `canBanUser(managerRole, targetRole)` - Check if user can ban target role

### 3. Configuration Updates

#### Environment Variables
```env
# Role Configuration
ADMIN_EMAIL_WHITELIST=admin@example.com,superuser@example.com
SUPERADMIN_EMAIL_WHITELIST=superadmin@example.com,owner@example.com
```

#### Config Structure (`src/config/index.ts`)
```typescript
export const config = {
  // ... existing config
  admin: {
    emailWhitelist: adminEmailWhitelist,
    superadminEmailWhitelist: superadminEmailWhitelist,
  },
};
```

### 4. Authentication Middleware Updates

#### New Middleware Functions (`src/middleware/auth.ts`)
- `requireRole(requiredRole)` - Generic role requirement middleware
- `requireModerator` - Convenience middleware for moderator access
- `requireAdmin` - Convenience middleware for admin access
- `requireSuperadmin` - Convenience middleware for superadmin access
- `validateRoleManagement` - Validates role management permissions
- `validateBanPermission` - Validates ban permissions

### 5. Service Layer Updates

#### User Service Interface (`src/services/interfaces/userServiceInterface.ts`)
Added new methods:
- `updateUserRole(userId, newRole, updatedByUserId)` - Update user role
- `getAllUsers()` - Get all users (admin/superadmin only)

#### User Database Service (`src/services/implementations/userDatabaseService.ts`)
- Updated `createUserData()` to assign roles based on email whitelists
- Updated JWT token creation to include role instead of isAdmin
- Updated user mapping to include role fields
- Implemented role management methods

### 6. Controller Updates

#### User Controller (`src/controllers/userController.ts`)
- Updated admin validation to use role-based checks
- Added `updateUserRole()` method for role management
- Updated `banUser()` and `unbanUser()` to use role-based permissions
- Updated `getAllUsers()` to work with new role system
- Added role validation functions

### 7. Route Updates

#### New Endpoints (`src/routes/userRoutes.ts`)
- `PUT /api/v1/users/role` - Update user role (Admin/Superadmin only)
- Updated existing admin endpoints with proper role documentation

### 8. API Documentation Updates

#### Swagger Schema Updates (`src/config/swagger.ts`)
- Updated User schema to include `role` field instead of `isAdmin`
- Updated PublicUser and PublicUserByUsername schemas
- Added comprehensive documentation for role management endpoints

## Role Permissions Matrix

| Action | User | Moderator | Admin | Superadmin |
|--------|------|-----------|-------|------------|
| Ban User | ❌ | ✅ | ✅ | ✅ |
| Ban Moderator | ❌ | ❌ | ✅ | ✅ |
| Ban Admin | ❌ | ❌ | ❌ | ✅ |
| Ban Superadmin | ❌ | ❌ | ❌ | ❌ |
| Promote to User | ❌ | ❌ | ❌ | ✅ |
| Promote to Moderator | ❌ | ❌ | ✅ | ✅ |
| Promote to Admin | ❌ | ❌ | ❌ | ✅ |
| Promote to Superadmin | ❌ | ❌ | ❌ | ✅ |
| View All Users | ❌ | ❌ | ✅ | ✅ |
| Update Own Role | ❌ | ❌ | ❌ | ❌ |

## Security Features

### 1. Role Assignment Security
- **Automatic Assignment**: Roles are assigned based on email whitelists during user creation
- **Manual Assignment**: Only authorized users can promote others to higher roles
- **Self-Protection**: Users cannot modify their own roles
- **Audit Trail**: All role changes are tracked with timestamps and user IDs

### 2. Permission Enforcement
- **Middleware-based**: All role checks are enforced at the middleware level
- **Service-level**: Additional checks in service layer for critical operations
- **Controller-level**: Final validation in controllers before processing requests

### 3. Token Security
- **Role Information**: JWT tokens include user role for authorization
- **Automatic Updates**: Role changes automatically update user tokens
- **Session Continuity**: Users maintain sessions after role changes

## Migration Strategy

### For New Users
- All new users automatically get appropriate roles based on email whitelists
- No additional action required

### For Existing Users
- Existing users with `isAdmin: true` will need to be manually updated to appropriate roles
- Database migration script may be needed for existing deployments

### Database Migration
```javascript
// Example migration for existing users
db.users.updateMany(
  { isAdmin: true },
  { 
    $set: { 
      role: "admin",
      roleUpdatedAt: new Date(),
      roleUpdatedBy: "system-migration"
    },
    $unset: { isAdmin: "" }
  }
);
```

## API Endpoints

### Role Management
```
PUT /api/v1/users/role
{
  "username": "johndoe",
  "role": "moderator"
}
```

### User Management (Role-based)
```
POST /api/v1/users/ban
{
  "username": "johndoe",
  "banReason": "Violation of community guidelines"
}

POST /api/v1/users/unban
{
  "username": "johndoe"
}

GET /api/v1/users/admin/all
```

## Testing Considerations

### Role Assignment Tests
- Test automatic role assignment based on email whitelists
- Test manual role promotion with proper permissions
- Test role demotion restrictions

### Permission Tests
- Test ban/unban permissions for each role combination
- Test role management permissions
- Test self-modification restrictions

### Security Tests
- Test unauthorized role modification attempts
- Test privilege escalation attempts
- Test token updates after role changes

## Monitoring and Logging

### Role Change Tracking
- All role changes are logged with:
  - User being modified
  - User making the change
  - Previous and new roles
  - Timestamp

### Security Monitoring
- Monitor for unusual role change patterns
- Track failed permission attempts
- Monitor superadmin role assignments

## Future Enhancements

### Potential Improvements
1. **Role Expiration**: Add expiration dates for temporary roles
2. **Role Inheritance**: Allow role inheritance from groups
3. **Fine-grained Permissions**: Add specific permission flags within roles
4. **Role Templates**: Predefined role templates for common use cases
5. **Audit Dashboard**: Web interface for role management and audit logs

### Scalability Considerations
- Role-based caching for performance
- Database indexing on role fields
- Horizontal scaling with role-aware load balancing

## Conclusion

The new role-based access control system provides a robust, scalable foundation for user management with proper security boundaries and audit capabilities. The hierarchical design ensures clear permission boundaries while maintaining flexibility for future enhancements. 