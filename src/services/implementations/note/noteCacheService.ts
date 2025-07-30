import { connectToRedis, isRedisConfigured } from '@/utils/redis';
import { Note, NoteFilters, NoteResponse } from '@/models/note';
import { NoteDatabaseService } from './noteDatabaseService';
import { CacheService } from '@/services/cacheService';

export class NoteCacheService extends NoteDatabaseService {
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
    if (!isRedisConfigured()) {
      return super.getAll(filters);
    }

    const cacheKey = this.getListCacheKey(filters);

    try {
      const redisClient = await connectToRedis();
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error('Error reading from cache:', error);
    }

    const notes = await super.getAll(filters);

    try {
      const redisClient = await connectToRedis();
      await redisClient.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(notes));
    } catch (error) {
      console.error('Error writing to cache:', error);
    }

    return notes;
  }

  async getById(id: string): Promise<Note | null> {
    if (!isRedisConfigured()) {
      return super.getById(id);
    }

    const cacheKey = this.getCacheKey(id);

    try {
      const redisClient = await connectToRedis();
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error('Error reading from cache:', error);
    }

    const note = await super.getById(id);

    if (note) {
      try {
        const redisClient = await connectToRedis();
        await redisClient.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(note));
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
    if (!isRedisConfigured()) {
      return super.getByForUserId(forUserId, filters);
    }

    const cacheKey = this.getUserCacheKey(forUserId, 'for', filters);

    try {
      const redisClient = await connectToRedis();
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error('Error reading from cache:', error);
    }

    const notes = await super.getByForUserId(forUserId, filters);

    try {
      const redisClient = await connectToRedis();
      await redisClient.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(notes));
    } catch (error) {
      console.error('Error writing to cache:', error);
    }

    return notes;
  }

  async getByFromUserId(
    fromUserId: string,
    filters?: NoteFilters
  ): Promise<Note[]> {
    if (!isRedisConfigured()) {
      return super.getByFromUserId(fromUserId, filters);
    }

    const cacheKey = this.getUserCacheKey(fromUserId, 'from', filters);

    try {
      const redisClient = await connectToRedis();
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error('Error reading from cache:', error);
    }

    const notes = await super.getByFromUserId(fromUserId, filters);

    try {
      const redisClient = await connectToRedis();
      await redisClient.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(notes));
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
    if (!isRedisConfigured()) {
      return super.getNotesBetweenUsers(userId1, userId2, filters);
    }

    const cacheKey = this.getBetweenUsersCacheKey(userId1, userId2, filters);

    try {
      const redisClient = await connectToRedis();
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error('Error reading from cache:', error);
    }

    const notes = await super.getNotesBetweenUsers(userId1, userId2, filters);

    try {
      const redisClient = await connectToRedis();
      await redisClient.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(notes));
    } catch (error) {
      console.error('Error writing to cache:', error);
    }

    return notes;
  }

  // Response methods with resolved usernames
  async getAllWithUsernames(filters?: NoteFilters): Promise<NoteResponse[]> {
    return super.getAllWithUsernames(filters);
  }

  async getByIdWithUsernames(id: string): Promise<NoteResponse | null> {
    return super.getByIdWithUsernames(id);
  }

  async getByForUserIdWithUsernames(
    forUserId: string,
    filters?: NoteFilters
  ): Promise<NoteResponse[]> {
    return super.getByForUserIdWithUsernames(forUserId, filters);
  }

  async getByFromUserIdWithUsernames(
    fromUserId: string,
    filters?: NoteFilters
  ): Promise<NoteResponse[]> {
    return super.getByFromUserIdWithUsernames(fromUserId, filters);
  }

  async getNotesForUserWithUsernames(
    userId: string,
    filters?: NoteFilters
  ): Promise<NoteResponse[]> {
    return super.getNotesForUserWithUsernames(userId, filters);
  }

  async getNotesFromUserWithUsernames(
    userId: string,
    filters?: NoteFilters
  ): Promise<NoteResponse[]> {
    return super.getNotesFromUserWithUsernames(userId, filters);
  }

  async getNotesBetweenUsersWithUsernames(
    userId1: string,
    userId2: string,
    filters?: NoteFilters
  ): Promise<NoteResponse[]> {
    return super.getNotesBetweenUsersWithUsernames(userId1, userId2, filters);
  }

  private async invalidateNoteCache(id: string): Promise<void> {
    if (!isRedisConfigured()) {
      return;
    }

    try {
      const redisClient = await connectToRedis();
      await redisClient.del(this.getCacheKey(id));
    } catch (error) {
      console.error('Error invalidating note cache:', error);
    }
  }

  private async invalidateListCaches(): Promise<void> {
    if (!isRedisConfigured()) {
      return;
    }

    try {
      const deletedCount = await CacheService.deletePattern(
        `${this.LIST_CACHE_PREFIX}*`
      );
      if (deletedCount > 0) {
        console.log(`Deleted ${deletedCount} note list cache keys`);
      }
    } catch (error) {
      console.error('Error invalidating list caches:', error);
    }
  }

  private async invalidateUserCaches(
    forUserId: string,
    fromUserId?: string
  ): Promise<void> {
    if (!isRedisConfigured()) {
      return;
    }

    try {
      const patterns = [
        `${this.USER_CACHE_PREFIX}for:${forUserId}:*`,
        `${this.USER_CACHE_PREFIX}between:*${forUserId}*`,
      ];

      if (fromUserId) {
        patterns.push(
          `${this.USER_CACHE_PREFIX}from:${fromUserId}:*`,
          `${this.USER_CACHE_PREFIX}between:*${fromUserId}*`
        );
      }

      let totalDeleted = 0;
      for (const pattern of patterns) {
        const deletedCount = await CacheService.deletePattern(pattern);
        totalDeleted += deletedCount;
      }

      if (totalDeleted > 0) {
        console.log(`Deleted ${totalDeleted} note user cache keys`);
      }
    } catch (error) {
      console.error('Error invalidating user caches:', error);
    }
  }
}
