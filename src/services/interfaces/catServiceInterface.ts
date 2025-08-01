import { Cat } from '@/models/cat';

export type OrderDirection = 'ASC' | 'DESC';

export interface CatOrderBy {
  field: 'totalLikes' | 'totalComments' | 'age' | 'createdAt';
  direction: OrderDirection;
}

export interface CatFilters {
  userId?: string;
  protectorId?: string;
  colonyId?: string;
  age?: number;
  isDomestic?: boolean;
  isMale?: boolean;
  isSterilized?: boolean;
  isFriendly?: boolean;
  isUserOwner?: boolean;
  limit?: number;
  page?: number;
  orderBy?: CatOrderBy;
}

export type CatResponse = Omit<Cat, 'userId'>;

export interface ICatService {
  create(cat: Omit<Cat, 'id'>): Promise<CatResponse>;
  getAll(filters?: CatFilters): Promise<CatResponse[]>;
  getById(id: string): Promise<CatResponse | null>;
  getByUserId(userId: string): Promise<CatResponse[]>;
  getByIdForAuth(id: string): Promise<Cat | null>;
  update(id: string, update: Partial<Cat>): Promise<boolean>;
  delete(id: string): Promise<boolean>;
  purge(): Promise<number>;
}
