import { Cat } from '@/models/cat';
import { CacheService } from '@/services/cacheService';
import {
  ICatService,
  CatFilters,
} from '@/services/interfaces/catServiceInterface';
import { CatDatabaseService } from './catDatabaseService';

const CACHE_TTL = 300; // 5 minutes

export class CatCacheService implements ICatService {
  private dbService: ICatService;

  constructor() {
    this.dbService = new CatDatabaseService();
  }

  async create(cat: Omit<Cat, '_id'>): Promise<Cat> {
    const newCat = await this.dbService.create(cat);

    // Invalidate all related caches
    await this.invalidateCachesForCreate(newCat);

    return newCat;
  }

  async getAll(filters?: CatFilters): Promise<Cat[]> {
    const cacheKey = this.generateCacheKey(filters);
    const cached = await CacheService.get<Cat[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.dbService.getAll(filters);
    await CacheService.set(cacheKey, result, CACHE_TTL);

    return result;
  }

  async getById(id: string): Promise<Cat | null> {
    const cached = await CacheService.get<Cat>(`cats:${id}`);
    if (cached) {
      return cached;
    }

    const result = await this.dbService.getById(id);

    if (result) {
      await CacheService.set(`cats:${id}`, result, CACHE_TTL);
    }

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

  private generateCacheKey(filters?: CatFilters): string {
    if (!filters || Object.keys(filters).length === 0) {
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
    return `cats:filtered:${encodedFilters}`;
  }

  private async invalidateCachesForCreate(newCat: Cat): Promise<void> {
    const invalidationPromises: Promise<void>[] = [];

    // Invalidate general list cache
    invalidationPromises.push(CacheService.delete('cats:all'));

    // Invalidate user-specific caches
    invalidationPromises.push(this.invalidateUserCaches(newCat.userId));

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
    currentCat: Cat,
    update: Partial<Cat>
  ): Promise<void> {
    const invalidationPromises: Promise<void>[] = [];

    // Invalidate the specific cat cache
    invalidationPromises.push(CacheService.delete(`cats:${currentCat._id}`));

    // Invalidate general list cache
    invalidationPromises.push(CacheService.delete('cats:all'));

    // Invalidate current user caches
    invalidationPromises.push(this.invalidateUserCaches(currentCat.userId));

    // If userId is being changed, invalidate new user caches too
    if (update.userId && update.userId !== currentCat.userId) {
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

  private async invalidateCachesForDelete(deletedCat: Cat): Promise<void> {
    const invalidationPromises: Promise<void>[] = [];

    // Invalidate the specific cat cache
    invalidationPromises.push(CacheService.delete(`cats:${deletedCat._id}`));

    // Invalidate general list cache
    invalidationPromises.push(CacheService.delete('cats:all'));

    // Invalidate user-specific caches
    invalidationPromises.push(this.invalidateUserCaches(deletedCat.userId));

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
    // Delete all cache keys that contain this userId
    const userPattern = `cats:filtered:*userId*${userId}*`;
    await this.deleteCachePattern(userPattern);
  }

  private async invalidateProtectorCaches(protectorId: string): Promise<void> {
    // Delete all cache keys that contain this protectorId
    const protectorPattern = `cats:filtered:*protectorId*${protectorId}*`;
    await this.deleteCachePattern(protectorPattern);
  }

  private async invalidateColonyCaches(colonyId: string): Promise<void> {
    // Delete all cache keys that contain this colonyId
    const colonyPattern = `cats:filtered:*colonyId*${colonyId}*`;
    await this.deleteCachePattern(colonyPattern);
  }

  private async invalidateFilteredCaches(cat: Cat): Promise<void> {
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

  private async deleteCachePattern(pattern: string): Promise<void> {
    try {
      // This is a simplified pattern deletion - in a real Redis implementation,
      // you would use Redis SCAN or similar methods to find and delete matching keys
      // For now, we'll implement a basic approach

      // Note: This requires the CacheService to support pattern deletion
      // If not available, you might need to maintain a separate index of cache keys

      // For demonstration, we'll just log the pattern that should be deleted
      console.log(`Would delete cache pattern: ${pattern}`);

      // In a real implementation, you might do something like:
      // const keys = await redis.keys(pattern);
      // if (keys.length > 0) {
      //   await redis.del(...keys);
      // }
    } catch (error) {
      console.error(`Error deleting cache pattern ${pattern}:`, error);
    }
  }
}
