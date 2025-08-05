export interface Cat {
  id?: string;
  userId?: string;
  username?: string;
  protectorId?: string;
  colonyId?: string;
  totalLikes: number;
  name?: string;
  age?: number;
  breed?: string;
  imageUrls: string[];
  xCoordinate: number;
  yCoordinate: number;
  address?: string;
  extraInfo?: string;
  isDomestic?: boolean;
  isMale?: boolean;
  isSterilized?: boolean;
  isFriendly?: boolean;
  isUserOwner: boolean;
  isLiked?: boolean;
  createdAt: Date;
  updatedAt?: Date;
  confirmedOwnerAt?: Date;
}
