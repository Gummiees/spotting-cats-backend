import { CreateLike } from '@/models/like';
import { ILikeService } from '@/services/interfaces/likeServiceInterface';
import { connectToMongo } from '@/utils/mongo';
import { DatabaseService } from '@/services/databaseService';
import { CatDatabaseService } from '@/services/implementations/cat/catDatabaseService';

const COLLECTION = 'likes';

export class LikeDatabaseService implements ILikeService {
  private catService: CatDatabaseService;

  constructor() {
    this.catService = new CatDatabaseService();
  }

  async toggleLike(
    userId: string,
    catId: string
  ): Promise<{ liked: boolean; totalLikes: number }> {
    try {
      DatabaseService.requireDatabase();
      const collection = await this.getCollection();

      // Check if like already exists
      const existingLike = await collection.findOne({
        userId,
        catId,
      });

      let liked: boolean;

      if (existingLike) {
        // Remove like
        await collection.deleteOne({
          userId,
          catId,
        });
        liked = false;
      } else {
        // Add like
        const newLike: CreateLike = {
          userId,
          catId,
        };

        await collection.insertOne({
          ...newLike,
          createdAt: new Date(),
        });
        liked = true;
      }

      // Update cat's totalLikes
      const currentCat = await this.catService.getById(catId);
      if (!currentCat) {
        throw new Error('Cat not found');
      }

      const newTotalLikes = Math.max(
        0,
        currentCat.totalLikes + (liked ? 1 : -1)
      );

      await this.catService.update(catId, { totalLikes: newTotalLikes });

      return { liked, totalLikes: newTotalLikes };
    } catch (error) {
      console.error('Error toggling like:', error);
      throw error;
    }
  }

  async isLikedByUser(userId: string, catId: string): Promise<boolean> {
    try {
      DatabaseService.requireDatabase();
      const collection = await this.getCollection();

      const like = await collection.findOne({
        userId,
        catId,
      });

      return !!like;
    } catch (error) {
      console.error('Error checking if user liked cat:', error);
      return false;
    }
  }

  async getLikesCount(catId: string): Promise<number> {
    try {
      DatabaseService.requireDatabase();
      const collection = await this.getCollection();

      const count = await collection.countDocuments({ catId });
      return count;
    } catch (error) {
      console.error('Error getting likes count:', error);
      return 0;
    }
  }

  private async getCollection() {
    const db = await connectToMongo();
    return db.collection(COLLECTION);
  }
}
