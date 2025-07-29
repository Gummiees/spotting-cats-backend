import { TheCatAPI } from '@thatapicompany/thecatapi';
import { config } from '@/config';
import { CacheService } from '@/services/cacheService';
import { isStaging } from '@/constants/environment';

export interface CatApiImage {
  id: string;
  url: string;
  width: number;
  height: number;
  breeds?: Array<{
    id: string;
    name: string;
    temperament?: string;
    origin?: string;
    description?: string;
  }>;
}

export interface CatApiFilters {
  limit?: number;
  page?: number;
}

export class CatApiService {
  private theCatAPI: TheCatAPI | null = null;
  private static readonly CACHE_TTL = 3600;
  private static readonly CACHE_PREFIX = 'catapi:images';

  constructor() {
    // Initialize CatAPI only if conditions are met
    if (this.shouldUseCatApi()) {
      this.theCatAPI = new TheCatAPI(config.catApi.apiKey);
    }
  }

  /**
   * Check if we should use the CatAPI based on environment conditions
   */
  private shouldUseCatApi(): boolean {
    return (
      isStaging(config.nodeEnv) &&
      config.catApi.enabled &&
      config.catApi.apiKey !== ''
    );
  }

  /**
   * Get cat images from CatAPI with caching
   */
  async getCatImages(filters?: CatApiFilters): Promise<CatApiImage[]> {
    if (!this.shouldUseCatApi()) {
      throw new Error('CatAPI is not enabled or not properly configured');
    }

    if (!this.theCatAPI) {
      throw new Error('CatAPI client not initialized');
    }

    const limit = filters?.limit || 10;
    const page = filters?.page || 1;

    // Try to get from cache first
    const cacheKey = this.generateCacheKey(limit, page);
    const cachedImages = await CacheService.get<CatApiImage[]>(cacheKey);

    if (cachedImages) {
      console.log(
        `CatAPI: Returning ${cachedImages.length} images from cache (page ${page}, limit ${limit})`
      );
      return cachedImages;
    }

    // If not in cache, fetch from API
    try {
      console.log(
        `CatAPI: Fetching ${limit} images from external API (page ${page})`
      );
      const images = await this.theCatAPI.images.searchImages({
        limit,
        page,
        order: 'RAND',
        hasBreeds: true,
        mimeTypes: ['png'],
      });

      const catImages = images.map((image: any) => ({
        id: image.id,
        url: image.url,
        width: image.width,
        height: image.height,
        breeds: image.breeds?.map((breed: any) => ({
          id: breed.id,
          name: breed.name,
          temperament: breed.temperament,
          origin: breed.origin,
          description: breed.description,
        })),
      }));

      // Store in cache for future requests
      await CacheService.set(cacheKey, catImages, CatApiService.CACHE_TTL);
      console.log(
        `CatAPI: Cached ${catImages.length} images for ${CatApiService.CACHE_TTL} seconds (page ${page}, limit ${limit})`
      );

      return catImages;
    } catch (error) {
      console.error('Error fetching cat images from CatAPI:', error);
      throw new Error('Failed to fetch cat images from external API');
    }
  }

  /**
   * Check if CatAPI is available and properly configured
   */
  isAvailable(): boolean {
    return this.shouldUseCatApi();
  }

  /**
   * Generate cache key for cat images based on limit and page
   */
  private generateCacheKey(limit: number, page: number): string {
    return `${CatApiService.CACHE_PREFIX}:limit:${limit}:page:${page}`;
  }

  /**
   * Clear all cached cat images
   */
  async clearCache(): Promise<void> {
    try {
      // This is a simplified approach - in a real implementation,
      // you might want to use Redis SCAN to find all matching keys
      console.log('CatAPI: Clearing cache');

      // For now, we'll clear common limit and page combinations
      const commonLimits = [5, 10, 20, 50, 100];
      const commonPages = [1, 2, 3, 4, 5];

      const deletePromises: Promise<void>[] = [];

      for (const limit of commonLimits) {
        for (const page of commonPages) {
          deletePromises.push(
            CacheService.delete(this.generateCacheKey(limit, page))
          );
        }
      }

      await Promise.all(deletePromises);
      console.log('CatAPI: Cache cleared');
    } catch (error) {
      console.error('Error clearing CatAPI cache:', error);
    }
  }

  /**
   * Get configuration status for debugging
   */
  getConfigStatus(): {
    nodeEnv: string;
    catApiEnabled: boolean;
    hasApiKey: boolean;
    shouldUse: boolean;
  } {
    return {
      nodeEnv: config.nodeEnv,
      catApiEnabled: config.catApi.enabled,
      hasApiKey: config.catApi.apiKey !== '',
      shouldUse: this.shouldUseCatApi(),
    };
  }
}
