import { Cat } from '@/models/cat';
import { CacheService } from '@/services/cacheService';
import { ICatService } from '@/services/interfaces/catServiceInterface';
import { CatDatabaseService } from './catDatabaseService';

const CACHE_TTL = 300; // 5 minutes

export class CatCacheService implements ICatService {
  private dbService: ICatService;

  constructor() {
    this.dbService = new CatDatabaseService();
  }

  async create(cat: Omit<Cat, '_id'>): Promise<Cat> {
    const newCat = await this.dbService.create(cat);

    await CacheService.delete('cats:all');

    return newCat;
  }

  async getAll(): Promise<Cat[]> {
    const cached = await CacheService.get<Cat[]>('cats:all');
    if (cached) {
      return cached;
    }

    const result = await this.dbService.getAll();
    await CacheService.set('cats:all', result, CACHE_TTL);

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
    const success = await this.dbService.update(id, update);

    if (success) {
      await CacheService.delete(`cats:${id}`);
      await CacheService.delete('cats:all');
    }

    return success;
  }

  async delete(id: string): Promise<boolean> {
    const success = await this.dbService.delete(id);

    if (success) {
      await CacheService.delete(`cats:${id}`);
      await CacheService.delete('cats:all');
    }

    return success;
  }
}
