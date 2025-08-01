import { Cat } from '@/models/cat';
import { CacheService } from '@/services/cacheService';
import {
  ICatService,
  CatFilters,
  CatResponse,
} from '@/services/interfaces/catServiceInterface';
import { userService } from '@/services/userService';

const CACHE_TTL = 300; // 5 minutes

export class CatCacheService implements ICatService {
  private dbService: ICatService;

  constructor(dbService: ICatService) {
    this.dbService = dbService;
  }

  async create(cat: Omit<Cat, 'id'>): Promise<CatResponse> {
    const newCat = await this.dbService.create(cat);
    await this.invalidateCachesForCreate(newCat, cat);
    return newCat;
  }

  async getAll(filters?: CatFilters, userId?: string): Promise<CatResponse[]> {
    const cacheKey = this.generateCacheKey(filters, userId);
    const cached = await CacheService.get<CatResponse[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.dbService.getAll(filters, userId);
    await CacheService.set(cacheKey, result, CACHE_TTL);

    return result;
  }

  async getById(id: string, userId?: string): Promise<CatResponse | null> {
    const cacheKey = userId ? `cats:${id}:user:${userId}` : `cats:${id}`;
    const cached = await CacheService.get<CatResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.dbService.getById(id, userId);

    if (result) {
      await CacheService.set(cacheKey, result, CACHE_TTL);
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

  private generateCacheKey(filters?: CatFilters, userId?: string): string {
    if (!filters || Object.keys(filters).length === 0) {
      return userId ? `cats:all:user:${userId}` : 'cats:all';
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

    const filtersString = JSON.stringify(sortedFilters);
    const baseKey = `cats:filtered:${filtersString}`;

    return userId ? `${baseKey}:user:${userId}` : baseKey;
  }

  private async invalidateCachesForCreate(
    newCat: CatResponse,
    originalCat: Omit<Cat, 'id'>
  ): Promise<void> {
    const invalidationPromises: Promise<void>[] = [];

    // Invalidate general list cache (both anonymous and user-specific)
    invalidationPromises.push(CacheService.delete('cats:all'));
    invalidationPromises.push(this.deleteCachePattern('cats:all:user:*'));

    // Invalidate user-specific caches for the cat owner
    if (newCat.username) {
      const userId = await this.getUserIdFromUsername(newCat.username);
      if (userId) {
        invalidationPromises.push(this.invalidateUserCaches(userId));
      }
    }

    // Invalidate protector-specific caches if applicable
    if (newCat.protectorId) {
      invalidationPromises.push(
        this.invalidateProtectorCaches(newCat.protectorId)
      );
    }

    // Invalidate colony-specific caches if applicable
    if (newCat.colonyId) {
      invalidationPromises.push(this.invalidateColonyCaches(newCat.colonyId));
    }

    // Invalidate filtered caches that might include this new cat
    invalidationPromises.push(this.invalidateFilteredCaches(newCat));

    await Promise.all(invalidationPromises);
  }

  private async invalidateCachesForUpdate(
    currentCat: CatResponse,
    update: Partial<Cat>
  ): Promise<void> {
    const invalidationPromises: Promise<void>[] = [];

    // Invalidate the specific cat cache (both anonymous and user-specific)
    invalidationPromises.push(CacheService.delete(`cats:${currentCat.id}`));
    invalidationPromises.push(
      this.deleteCachePattern(`cats:${currentCat.id}:user:*`)
    );

    // For totalLikes updates, invalidate ordering caches, specific cat cache, and user-specific list caches
    // This ensures isLiked status is updated in cached lists
    if (update.totalLikes !== undefined && Object.keys(update).length === 1) {
      // Only totalLikes is being updated, but we need to invalidate user-specific caches for isLiked
      invalidationPromises.push(this.invalidateOrderingCaches());
      invalidationPromises.push(this.deleteCachePattern('cats:all:user:*'));
      invalidationPromises.push(
        this.deleteCachePattern('cats:filtered:*:user:*')
      );
      // Also invalidate the specific cat cache for all users since isLiked status changes
      invalidationPromises.push(
        this.deleteCachePattern(`cats:${currentCat.id}:user:*`)
      );
    } else {
      // Full update, invalidate general list cache (both anonymous and user-specific)
      invalidationPromises.push(CacheService.delete('cats:all'));
      invalidationPromises.push(this.deleteCachePattern('cats:all:user:*'));

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
    }

    // If totalLikes or age are being updated, invalidate ordering caches specifically
    if (update.totalLikes !== undefined || update.age !== undefined) {
      invalidationPromises.push(this.invalidateOrderingCaches());
    }

    await Promise.all(invalidationPromises);
  }

  private async invalidateCachesForDelete(
    deletedCat: CatResponse
  ): Promise<void> {
    const invalidationPromises: Promise<void>[] = [];

    // Invalidate the specific cat cache (both anonymous and user-specific)
    invalidationPromises.push(CacheService.delete(`cats:${deletedCat.id}`));
    invalidationPromises.push(
      this.deleteCachePattern(`cats:${deletedCat.id}:user:*`)
    );

    // Invalidate general list cache (both anonymous and user-specific)
    invalidationPromises.push(CacheService.delete('cats:all'));
    invalidationPromises.push(this.deleteCachePattern('cats:all:user:*'));

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
      `cats:*:user:${userId}`,
      `cats:all:user:${userId}`,
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

    // Also invalidate caches that might be ordered by fields that could affect ordering
    const orderingPatterns = [
      `cats:filtered:*orderBy*totalLikes*`,
      `cats:filtered:*orderBy*age*`,
      `cats:filtered:*orderBy*createdAt*`,
    ];

    const allPatterns = [...patterns, ...orderingPatterns];
    const invalidationPromises = allPatterns.map((pattern) =>
      this.deleteCachePattern(pattern)
    );

    // Also invalidate user-specific versions of these patterns
    const userSpecificPatterns = allPatterns.map(
      (pattern) => `${pattern}:user:*`
    );
    const userSpecificPromises = userSpecificPatterns.map((pattern) =>
      this.deleteCachePattern(pattern)
    );

    await Promise.all([...invalidationPromises, ...userSpecificPromises]);
  }

  private async invalidateOrderingCaches(): Promise<void> {
    // Invalidate all caches that use ordering
    const patterns = [
      `cats:filtered:*orderBy*totalLikes*`,
      `cats:filtered:*orderBy*age*`,
      `cats:filtered:*orderBy*createdAt*`,
    ];

    const invalidationPromises = patterns.map((pattern) =>
      this.deleteCachePattern(pattern)
    );

    // Also invalidate user-specific versions of these patterns
    const userSpecificPatterns = patterns.map((pattern) => `${pattern}:user:*`);
    const userSpecificPromises = userSpecificPatterns.map((pattern) =>
      this.deleteCachePattern(pattern)
    );

    await Promise.all([...invalidationPromises, ...userSpecificPromises]);
  }

  private async invalidateAllCatCaches(): Promise<void> {
    const invalidationPromises: Promise<void>[] = [];

    // Delete all cache keys that start with 'cats:'
    const patterns = ['cats:*'];

    for (const pattern of patterns) {
      invalidationPromises.push(this.deleteCachePattern(pattern));
    }

    await Promise.all(invalidationPromises);
  }

  private async deleteCachePattern(pattern: string): Promise<void> {
    try {
      // Use Redis SCAN to find and delete all keys matching the pattern
      await CacheService.deletePattern(pattern);
    } catch (error) {
      console.error(`Error deleting cache pattern ${pattern}:`, error);
    }
  }
}
