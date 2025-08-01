import { Like, CreateLike } from '@/models/like';

export interface ILikeService {
  toggleLike(
    userId: string,
    catId: string
  ): Promise<{ liked: boolean; totalLikes: number }>;
  isLikedByUser(userId: string, catId: string): Promise<boolean>;
  getLikesCount(catId: string): Promise<number>;
}
