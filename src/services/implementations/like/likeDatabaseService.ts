import { CreateLike } from '@/models/like';
import { ILikeService } from '@/services/interfaces/likeServiceInterface';
import { connectToMongo } from '@/utils/mongo';
import { DatabaseService } from '@/services/databaseService';
import { catService } from '@/services/catService';
import { ICatService } from '@/services/interfaces/catServiceInterface';
import { ObjectId } from 'mongodb';

const COLLECTION = 'likes';

export class LikeDatabaseService implements ILikeService {
  private catService: ICatService;

  constructor() {
    this.catService = catService;
  }

  async toggleLike(
    userId: string,
    catId: string
  ): Promise<{ liked: boolean; totalLikes: number }> {
    try {
      DatabaseService.requireDatabase();
      const collection = await this.getCollection();
      const catObjectId = this.toObjectId(catId);

      const existingLike = await collection.findOne({
        userId,
        catId: catObjectId,
      });

      let liked: boolean;

      if (existingLike) {
        await collection.deleteOne({
          userId,
          catId: catObjectId,
        });
        liked = false;
      } else {
        const newLike: CreateLike = {
          userId,
          catId,
        };
        await collection.insertOne({
          ...newLike,
          catId: catObjectId,
          createdAt: new Date(),
        });
        liked = true;
      }

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

  private async getCollection() {
    const db = await connectToMongo();
    return db.collection(COLLECTION);
  }

  private toObjectId(id: string | ObjectId): ObjectId {
    if (id instanceof ObjectId) {
      return id;
    }

    if (!ObjectId.isValid(id)) {
      throw new Error(`Invalid ObjectId format: ${id}`);
    }

    return new ObjectId(id);
  }
}
