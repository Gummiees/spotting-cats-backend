import { LikeDatabaseService } from '@/services/implementations/like/likeDatabaseService';

export class LikeService extends LikeDatabaseService {}

export const likeService = new LikeService();
