import { CatDatabaseService } from './implementations/cat/catDatabaseService';
import { CatCacheService } from './implementations/cat/catCacheService';
import { ICatService } from './interfaces/catServiceInterface';

// Create database service instance
const catDatabaseService = new CatDatabaseService();

// Create cache service instance (wraps database service)
const catCacheService = new CatCacheService(catDatabaseService);

// Export the cache service as the main cat service
export const catService: ICatService = catCacheService;
