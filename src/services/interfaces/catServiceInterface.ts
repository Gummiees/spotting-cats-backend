import { Cat } from '@/models/cat';

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
}

export interface ICatService {
  create(cat: Omit<Cat, 'id'>): Promise<Cat>;
  getAll(filters?: CatFilters): Promise<Cat[]>;
  getById(id: string): Promise<Cat | null>;
  getByUserId(userId: string): Promise<Cat[]>;
  update(id: string, update: Partial<Cat>): Promise<boolean>;
  delete(id: string): Promise<boolean>;
  purge(): Promise<number>;
}
