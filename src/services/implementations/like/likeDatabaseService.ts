import { Like, CreateLike } from '@/models/like';
import { ILikeService } from '@/services/interfaces/likeServiceInterface';
import { connectToMongo } from '@/utils/mongo';
import { DatabaseService } from '@/services/databaseService';
import { ObjectId } from 'mongodb';
import { CatService } from '@/services/catService';

const COLLECTION = 'likes';

export class LikeDatabaseService implements ILikeService {
  private catService: CatService;

  constructor() {
    this.catService = new CatService();
  }

  async toggleLike(
    userId: string,
    catId: string
  ): Promise<{ liked: boolean; totalLikes: number }> {
    try {
      DatabaseService.requireDatabase();
      const collection = await this.getCollection();

      console.log(`Checking if like exists for user: ${userId}, cat: ${catId}`);

      // Check if like already exists
      const existingLike = await collection.findOne({
        userId,
        catId,
      });

      let liked: boolean;

      if (existingLike) {
        console.log(`Like exists, removing it`);
        // Remove like
        await collection.deleteOne({
          userId,
          catId,
        });
        liked = false;
      } else {
        console.log(`Like doesn't exist, adding it`);
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
      console.log(`Getting current cat data for: ${catId}`);
      const currentCat = await this.catService.getById(catId);
      if (!currentCat) {
        console.log(`Cat not found in like service: ${catId}`);
        throw new Error('Cat not found');
      }

      console.log(`Current cat totalLikes: ${currentCat.totalLikes}`);
      const newTotalLikes = Math.max(
        0,
        currentCat.totalLikes + (liked ? 1 : -1)
      );
      console.log(`New totalLikes: ${newTotalLikes}`);

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
