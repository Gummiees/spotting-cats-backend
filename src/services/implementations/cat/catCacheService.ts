import { Cat } from '@/models/cat';
import { CacheService } from '@/services/cacheService';
import {
  ICatService,
  CatFilters,
  CatResponse,
} from '@/services/interfaces/catServiceInterface';
import { CatDatabaseService } from './catDatabaseService';
import { userService } from '@/services/userService';

const CACHE_TTL = 300; // 5 minutes

export class CatCacheService implements ICatService {
  private dbService: ICatService;

  constructor() {
    this.dbService = new CatDatabaseService();
  }

  async create(cat: Omit<Cat, 'id'>): Promise<CatResponse> {
    const newCat = await this.dbService.create(cat);

    console.log('Cat created with ID:', newCat.id);
    console.log('Invalidating caches for new cat...');
    await this.invalidateCachesForCreate(newCat, cat);
    console.log('Cache invalidation completed');

    return newCat;
  }

  async getAll(filters?: CatFilters): Promise<CatResponse[]> {
    const cacheKey = this.generateCacheKey(filters);
    console.log('Getting cats with cache key:', cacheKey);

    const cached = await CacheService.get<Cat[]>(cacheKey);
    if (cached) {
      console.log('Returning cached cats, count:', cached.length);
      return cached;
    }

    console.log('Cache miss, fetching from database');
    const result = await this.dbService.getAll(filters);
    console.log('Fetched cats from database, count:', result.length);

    // Check if cache was invalidated recently
    const cacheExists = await CacheService.exists(cacheKey);
    if (cacheExists) {
      console.log(
        'Cache key still exists after invalidation, skipping cache set'
      );
    } else {
      await CacheService.set(cacheKey, result, CACHE_TTL);
      console.log('Cached result with key:', cacheKey);
    }

    return result;
  }

  async getById(id: string): Promise<CatResponse | null> {
    const cached = await CacheService.get<CatResponse>(`cats:${id}`);
    if (cached) {
      return cached;
    }

    const result = await this.dbService.getById(id);

    if (result) {
      await CacheService.set(`cats:${id}`, result, CACHE_TTL);
    }

    return result;
  }

  async getByIdForAuth(id: string): Promise<Cat | null> {
    const cached = await CacheService.get<Cat>(`cats:auth:${id}`);
    if (cached) {
      return cached;
    }

    const result = await this.dbService.getByIdForAuth(id);

    if (result) {
      await CacheService.set(`cats:auth:${id}`, result, CACHE_TTL);
    }

    return result;
  }

  async getByUserId(userId: string): Promise<CatResponse[]> {
    const cacheKey = `cats:user:${userId}`;
    const cached = await CacheService.get<Cat[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.dbService.getByUserId(userId);
    await CacheService.set(cacheKey, result, CACHE_TTL);

    return result;
  }

  async update(id: string, update: Partial<Cat>): Promise<boolean> {
    // Get the current cat to understand what needs to be invalidated
    const currentCat = await this.dbService.getById(id);

    const success = await this.dbService.update(id, update);

    if (success && currentCat) {
      // Invalidate caches related to the updated cat
      await this.invalidateCachesForUpdate(currentCat, update);
    }

    return success;
  }

  async delete(id: string): Promise<boolean> {
    // Get the current cat to understand what needs to be invalidated
    const currentCat = await this.dbService.getById(id);

    const success = await this.dbService.delete(id);

    if (success && currentCat) {
      // Invalidate caches related to the deleted cat
      await this.invalidateCachesForDelete(currentCat);
    }

    return success;
  }

  async purge(): Promise<number> {
    const deletedCount = await this.dbService.purge();

    if (deletedCount > 0) {
      await this.invalidateAllCatCaches();
    }

    return deletedCount;
  }

  private generateCacheKey(filters?: CatFilters): string {
    if (!filters || Object.keys(filters).length === 0) {
      console.log('Generated cache key: cats:all (no filters)');
      return 'cats:all';
    }

    // Create a sorted string representation of filters for consistent cache keys
    const sortedFilters = Object.keys(filters)
      .sort()
      .reduce((result: any, key) => {
        const value = (filters as any)[key];
        if (value !== undefined) {
          result[key] = value;
        }
        return result;
      }, {});

    const filterString = JSON.stringify(sortedFilters);
    const encodedFilters = Buffer.from(filterString).toString('base64');
    const cacheKey = `cats:filtered:${encodedFilters}`;
    console.log(
      'Generated cache key:',
      cacheKey,
      'for filters:',
      sortedFilters
    );
    return cacheKey;
  }

  private async invalidateCachesForCreate(
    newCat: CatResponse,
    originalCat: Omit<Cat, 'id'>
  ): Promise<void> {
    console.log('Invalidating all cat caches...');
    await this.invalidateAllCatCaches();
    console.log('All cat caches invalidated');
  }

  private async invalidateCachesForUpdate(
    currentCat: CatResponse,
    update: Partial<Cat>
  ): Promise<void> {
    const invalidationPromises: Promise<void>[] = [];

    // Invalidate the specific cat cache
    invalidationPromises.push(CacheService.delete(`cats:${currentCat.id}`));

    // Invalidate general list cache
    invalidationPromises.push(CacheService.delete('cats:all'));

    // Get current userId from username for comparison
    let currentUserId: string | null = null;
    if (currentCat.username) {
      currentUserId = await this.getUserIdFromUsername(currentCat.username);
      if (currentUserId) {
        invalidationPromises.push(this.invalidateUserCaches(currentUserId));
      }
    }

    // If userId is being changed, invalidate new user caches too
    if (update.userId && update.userId !== currentUserId) {
      invalidationPromises.push(this.invalidateUserCaches(update.userId));
    }

    // Handle protector changes
    if (currentCat.protectorId) {
      invalidationPromises.push(
        this.invalidateProtectorCaches(currentCat.protectorId)
      );
    }
    if (update.protectorId && update.protectorId !== currentCat.protectorId) {
      invalidationPromises.push(
        this.invalidateProtectorCaches(update.protectorId)
      );
    }

    // Handle colony changes
    if (currentCat.colonyId) {
      invalidationPromises.push(
        this.invalidateColonyCaches(currentCat.colonyId)
      );
    }
    if (update.colonyId && update.colonyId !== currentCat.colonyId) {
      invalidationPromises.push(this.invalidateColonyCaches(update.colonyId));
    }

    // Invalidate filtered caches that might be affected
    invalidationPromises.push(this.invalidateFilteredCaches(currentCat));

    await Promise.all(invalidationPromises);
  }

  private async invalidateCachesForDelete(
    deletedCat: CatResponse
  ): Promise<void> {
    const invalidationPromises: Promise<void>[] = [];

    // Invalidate the specific cat cache
    invalidationPromises.push(CacheService.delete(`cats:${deletedCat.id}`));

    // Invalidate general list cache
    invalidationPromises.push(CacheService.delete('cats:all'));

    if (deletedCat.username) {
      const userId = await this.getUserIdFromUsername(deletedCat.username);
      if (userId) {
        invalidationPromises.push(this.invalidateUserCaches(userId));
      }
    }

    // Invalidate protector-specific caches if applicable
    if (deletedCat.protectorId) {
      invalidationPromises.push(
        this.invalidateProtectorCaches(deletedCat.protectorId)
      );
    }

    // Invalidate colony-specific caches if applicable
    if (deletedCat.colonyId) {
      invalidationPromises.push(
        this.invalidateColonyCaches(deletedCat.colonyId)
      );
    }

    // Invalidate filtered caches that might have included this cat
    invalidationPromises.push(this.invalidateFilteredCaches(deletedCat));

    await Promise.all(invalidationPromises);
  }

  private async invalidateUserCaches(userId: string): Promise<void> {
    // Delete all cache keys related to this user
    const patterns = [
      `cats:user:${userId}`,
      `cats:filtered:*userId*${userId}*`,
    ];

    for (const pattern of patterns) {
      await this.deleteCachePattern(pattern);
    }
  }

  private async getUserIdFromUsername(
    username: string
  ): Promise<string | null> {
    try {
      const user = await userService.getUserByUsername(username);
      return user?.id || null;
    } catch (error) {
      console.error(`Failed to get userId for username ${username}:`, error);
      return null;
    }
  }

  private async invalidateProtectorCaches(protectorId: string): Promise<void> {
    // Delete all cache keys that contain this protectorId
    const patterns = [`cats:filtered:*protectorId*${protectorId}*`];

    for (const pattern of patterns) {
      await this.deleteCachePattern(pattern);
    }
  }

  private async invalidateColonyCaches(colonyId: string): Promise<void> {
    // Delete all cache keys that contain this colonyId
    const patterns = [`cats:filtered:*colonyId*${colonyId}*`];

    for (const pattern of patterns) {
      await this.deleteCachePattern(pattern);
    }
  }

  private async invalidateFilteredCaches(cat: CatResponse): Promise<void> {
    // Invalidate filtered caches that might match this cat's properties
    const patterns = [
      `cats:filtered:*age*${cat.age}*`,
      `cats:filtered:*isDomestic*${cat.isDomestic}*`,
      `cats:filtered:*isMale*${cat.isMale}*`,
      `cats:filtered:*isSterilized*${cat.isSterilized}*`,
      `cats:filtered:*isFriendly*${cat.isFriendly}*`,
      `cats:filtered:*isUserOwner*${cat.isUserOwner}*`,
    ];

    const invalidationPromises = patterns.map((pattern) =>
      this.deleteCachePattern(pattern)
    );
    await Promise.all(invalidationPromises);
  }

  private async invalidateAllCatCaches(): Promise<void> {
    const invalidationPromises: Promise<void>[] = [];

    // Delete all cache keys that start with 'cats:'
    const patterns = ['cats:*'];

    console.log('Invalidating patterns:', patterns);
    for (const pattern of patterns) {
      invalidationPromises.push(this.deleteCachePattern(pattern));
    }

    await Promise.all(invalidationPromises);
    console.log('All cat cache invalidation completed');
  }

  private async deleteCachePattern(pattern: string): Promise<void> {
    try {
      // Use Redis SCAN to find and delete all keys matching the pattern
      const deletedCount = await CacheService.deletePattern(pattern);
      if (deletedCount > 0) {
        console.log(
          `Deleted ${deletedCount} cache keys matching pattern: ${pattern}`
        );
      }
    } catch (error) {
      console.error(`Error deleting cache pattern ${pattern}:`, error);
    }
  }
}
