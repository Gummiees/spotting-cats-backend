import { getRedisClient } from '@/utils/redis';
import { Note, NoteFilters } from '@/models/note';
import { INoteService } from '@/services/interfaces/noteServiceInterface';
import { NoteDatabaseService } from './noteDatabaseService';

export class NoteCacheService extends NoteDatabaseService {
  private redis = getRedisClient();
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly CACHE_PREFIX = 'note:';
  private readonly LIST_CACHE_PREFIX = 'notes:list:';
  private readonly USER_CACHE_PREFIX = 'notes:user:';

  private getCacheKey(id: string): string {
    return `${this.CACHE_PREFIX}${id}`;
  }

  private getListCacheKey(filters?: NoteFilters): string {
    const filterStr = filters ? JSON.stringify(filters) : 'all';
    return `${this.LIST_CACHE_PREFIX}${filterStr}`;
  }

  private getUserCacheKey(
    userId: string,
    type: 'for' | 'from',
    filters?: NoteFilters
  ): string {
    const filterStr = filters ? JSON.stringify(filters) : 'all';
    return `${this.USER_CACHE_PREFIX}${type}:${userId}:${filterStr}`;
  }

  private getBetweenUsersCacheKey(
    userId1: string,
    userId2: string,
    filters?: NoteFilters
  ): string {
    const filterStr = filters ? JSON.stringify(filters) : 'all';
    const sortedIds = [userId1, userId2].sort();
    return `${this.USER_CACHE_PREFIX}between:${sortedIds[0]}:${sortedIds[1]}:${filterStr}`;
  }

  async create(note: Omit<Note, 'id'>): Promise<Note> {
    const createdNote = await super.create(note);

    // Invalidate related caches
    await this.invalidateUserCaches(note.forUserId, note.fromUserId);
    await this.invalidateListCaches();

    return createdNote;
  }

  async getAll(filters?: NoteFilters): Promise<Note[]> {
    const cacheKey = this.getListCacheKey(filters);

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error('Error reading from cache:', error);
    }

    const notes = await super.getAll(filters);

    try {
      await this.redis.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(notes));
    } catch (error) {
      console.error('Error writing to cache:', error);
    }

    return notes;
  }

  async getById(id: string): Promise<Note | null> {
    const cacheKey = this.getCacheKey(id);

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error('Error reading from cache:', error);
    }

    const note = await super.getById(id);

    if (note) {
      try {
        await this.redis.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(note));
      } catch (error) {
        console.error('Error writing to cache:', error);
      }
    }

    return note;
  }

  async getByForUserId(
    forUserId: string,
    filters?: NoteFilters
  ): Promise<Note[]> {
    const cacheKey = this.getUserCacheKey(forUserId, 'for', filters);

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error('Error reading from cache:', error);
    }

    const notes = await super.getByForUserId(forUserId, filters);

    try {
      await this.redis.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(notes));
    } catch (error) {
      console.error('Error writing to cache:', error);
    }

    return notes;
  }

  async getByFromUserId(
    fromUserId: string,
    filters?: NoteFilters
  ): Promise<Note[]> {
    const cacheKey = this.getUserCacheKey(fromUserId, 'from', filters);

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error('Error reading from cache:', error);
    }

    const notes = await super.getByFromUserId(fromUserId, filters);

    try {
      await this.redis.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(notes));
    } catch (error) {
      console.error('Error writing to cache:', error);
    }

    return notes;
  }

  async update(id: string, update: Partial<Note>): Promise<boolean> {
    const success = await super.update(id, update);

    if (success) {
      // Invalidate caches
      await this.invalidateNoteCache(id);
      await this.invalidateListCaches();

      // If the note exists, get it to invalidate user caches
      const note = await super.getById(id);
      if (note) {
        await this.invalidateUserCaches(note.forUserId, note.fromUserId);
      }
    }

    return success;
  }

  async delete(id: string): Promise<boolean> {
    // Get the note before deleting to invalidate user caches
    const note = await super.getById(id);
    const success = await super.delete(id);

    if (success && note) {
      // Invalidate caches
      await this.invalidateNoteCache(id);
      await this.invalidateListCaches();
      await this.invalidateUserCaches(note.forUserId, note.fromUserId);
    }

    return success;
  }

  async getNotesForUser(
    userId: string,
    filters?: NoteFilters
  ): Promise<Note[]> {
    return this.getByForUserId(userId, filters);
  }

  async getNotesFromUser(
    userId: string,
    filters?: NoteFilters
  ): Promise<Note[]> {
    return this.getByFromUserId(userId, filters);
  }

  async getNotesBetweenUsers(
    userId1: string,
    userId2: string,
    filters?: NoteFilters
  ): Promise<Note[]> {
    const cacheKey = this.getBetweenUsersCacheKey(userId1, userId2, filters);

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error('Error reading from cache:', error);
    }

    const notes = await super.getNotesBetweenUsers(userId1, userId2, filters);

    try {
      await this.redis.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(notes));
    } catch (error) {
      console.error('Error writing to cache:', error);
    }

    return notes;
  }

  private async invalidateNoteCache(id: string): Promise<void> {
    try {
      await this.redis.del(this.getCacheKey(id));
    } catch (error) {
      console.error('Error invalidating note cache:', error);
    }
  }

  private async invalidateListCaches(): Promise<void> {
    try {
      const keys = await this.redis.keys(`${this.LIST_CACHE_PREFIX}*`);
      if (keys.length > 0) {
        await this.redis.del(keys);
      }
    } catch (error) {
      console.error('Error invalidating list caches:', error);
    }
  }

  private async invalidateUserCaches(
    forUserId: string,
    fromUserId: string
  ): Promise<void> {
    try {
      // Invalidate caches for both users
      const forUserKeys = await this.redis.keys(
        `${this.USER_CACHE_PREFIX}for:${forUserId}:*`
      );
      const fromUserKeys = await this.redis.keys(
        `${this.USER_CACHE_PREFIX}from:${fromUserId}:*`
      );
      const betweenUserKeys = await this.redis.keys(
        `${this.USER_CACHE_PREFIX}between:*${forUserId}*`
      );
      const betweenUserKeys2 = await this.redis.keys(
        `${this.USER_CACHE_PREFIX}between:*${fromUserId}*`
      );

      const allKeys = [
        ...forUserKeys,
        ...fromUserKeys,
        ...betweenUserKeys,
        ...betweenUserKeys2,
      ];

      if (allKeys.length > 0) {
        await this.redis.del(allKeys);
      }
    } catch (error) {
      console.error('Error invalidating user caches:', error);
    }
  }
}
