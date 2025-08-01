export interface ILikeService {
  toggleLike(
    userId: string,
    catId: string
  ): Promise<{ liked: boolean; totalLikes: number }>;
}
