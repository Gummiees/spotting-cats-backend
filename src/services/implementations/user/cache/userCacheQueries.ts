import { User, BasicUser } from '@/models/user';
import { UserServiceInterface } from '../../../interfaces/userServiceInterface';
import { UserCacheCore } from './userCacheCore';

export class UserCacheQueries extends UserCacheCore {
  constructor(private userService: UserServiceInterface) {
    super();
  }

  async getUserById(userId: string): Promise<User | null> {
    try {
      // Try to get from cache first
      const cachedUser = await this.getUserFromCache(userId);
      if (cachedUser) {
        return cachedUser;
      }

      // If not in cache, get from database
      const user = await this.userService.getUserById(userId);
      if (user) {
        await this.cacheUserData(user);
      }

      return user;
    } catch (error) {
      console.error('Error getting user by ID from cache:', error);
      // Fallback to database service
      return this.userService.getUserById(userId);
    }
  }

  async getBasicUserById(userId: string): Promise<BasicUser | null> {
    try {
      // Try to get from cache first
      const cachedUser = await this.getUserFromCache(userId);
      if (cachedUser) {
        // Convert User to BasicUser
        return {
          username: cachedUser.username,
          avatarUrl: cachedUser.avatarUrl,
          role: cachedUser.role,
          isInactive: !cachedUser.isActive,
          isBanned: cachedUser.isBanned,
          lastLoginAt: cachedUser.lastLoginAt,
          createdAt: cachedUser.createdAt,
          updatedAt: cachedUser.updatedAt,
          emailUpdatedAt: cachedUser.emailUpdatedAt,
          usernameUpdatedAt: cachedUser.usernameUpdatedAt,
          avatarUpdatedAt: cachedUser.avatarUpdatedAt,
        };
      }

      // If not in cache, get from database
      const user = await this.userService.getBasicUserById(userId);
      if (user) {
        // Cache the full user data for future requests
        const fullUser = await this.userService.getUserById(userId);
        if (fullUser) {
          await this.cacheUserData(fullUser);
        }
      }

      return user;
    } catch (error) {
      console.error('Error getting basic user by ID from cache:', error);
      // Fallback to database service
      return this.userService.getBasicUserById(userId);
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      // Check cache first using normalized email
      const cachedUserId = await this.getUserIdFromEmailCache(email);
      if (cachedUserId) {
        const cachedUser = await this.getUserFromCache(cachedUserId);
        if (cachedUser) {
          return cachedUser;
        }
      }

      // If not in cache, get from database service
      const user = await this.userService.getUserByEmail(email);
      if (user) {
        // Cache the user data with normalized email
        const normalizedEmail = email.toLowerCase().trim();
        await this.cacheUserData(user, normalizedEmail);
      }

      return user;
    } catch (error) {
      console.error('Error getting user by email from cache:', error);
      // Fallback to database service
      return this.userService.getUserByEmail(email);
    }
  }

  async getUserByUsername(username: string): Promise<User | null> {
    try {
      // Check cache first using username
      const cachedUserId = await this.getUserIdFromUsernameCache(username);
      if (cachedUserId) {
        const cachedUser = await this.getUserFromCache(cachedUserId);
        if (cachedUser) {
          return cachedUser;
        }
      }

      // If not in cache, get from database service
      const user = await this.userService.getUserByUsername(username);
      if (user) {
        // Cache the user data with username
        const normalizedUsername = username.toLowerCase().trim();
        await this.cacheUserData(user, undefined, normalizedUsername);
      }

      return user;
    } catch (error) {
      console.error('Error getting user by username from cache:', error);
      // Fallback to database service
      return this.userService.getUserByUsername(username);
    }
  }

  async getBasicUserByUsername(username: string): Promise<BasicUser | null> {
    try {
      // Check cache first using username
      const cachedUserId = await this.getUserIdFromUsernameCache(username);
      if (cachedUserId) {
        const cachedUser = await this.getUserFromCache(cachedUserId);
        if (cachedUser) {
          // Convert User to BasicUser
          return {
            username: cachedUser.username,
            avatarUrl: cachedUser.avatarUrl,
            role: cachedUser.role,
            isInactive: !cachedUser.isActive,
            isBanned: cachedUser.isBanned,
            lastLoginAt: cachedUser.lastLoginAt,
            createdAt: cachedUser.createdAt,
            updatedAt: cachedUser.updatedAt,
            emailUpdatedAt: cachedUser.emailUpdatedAt,
            usernameUpdatedAt: cachedUser.usernameUpdatedAt,
            avatarUpdatedAt: cachedUser.avatarUpdatedAt,
          };
        }
      }

      // If not in cache, get from database service
      const user = await this.userService.getBasicUserByUsername(username);
      if (user) {
        // Cache the full user data for future requests
        const fullUser = await this.userService.getUserByUsername(username);
        if (fullUser) {
          const normalizedUsername = username.toLowerCase().trim();
          await this.cacheUserData(fullUser, undefined, normalizedUsername);
        }
      }

      return user;
    } catch (error) {
      console.error('Error getting basic user by username from cache:', error);
      // Fallback to database service
      return this.userService.getBasicUserByUsername(username);
    }
  }

  async getUserByUsernameForAdmin(username: string): Promise<any> {
    // For admin responses, always bypass cache and go directly to the admin service
    // This ensures proper resolution of user IDs to usernames and handles sensitive data correctly
    return await this.userService.getUserByUsernameForAdmin(username);
  }

  async getAllUsers(): Promise<{
    success: boolean;
    users: User[];
    message: string;
  }> {
    try {
      // Try to get from cache first
      const cachedUsers = await this.getAllUsersFromCache();
      if (cachedUsers) {
        return {
          success: true,
          users: cachedUsers,
          message: 'Users retrieved from cache',
        };
      }

      // If not in cache, get from database service
      const result = await this.userService.getAllUsers();
      if (result.success && result.users.length > 0) {
        // Cache all users
        await this.cacheAllUsers(result.users);
      }

      return result;
    } catch (error) {
      console.error('Error getting all users from cache:', error);
      // Fallback to database service
      return this.userService.getAllUsers();
    }
  }
}
