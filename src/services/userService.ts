import { UserDatabaseService } from './implementations/user/userDatabaseService';
import { UserCacheService } from './implementations/user/userCacheService';
import { UserServiceInterface } from './interfaces/userServiceInterface';

// Create database service instance
const userDatabaseService = new UserDatabaseService();

// Create cache service instance (wraps database service)
const userCacheService = new UserCacheService(userDatabaseService);

// Export the cache service as the main user service
export const userService: UserServiceInterface = userCacheService;
