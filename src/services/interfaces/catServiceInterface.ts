import { Cat } from '@/models/cat';

export interface ICatService {
  create(cat: Omit<Cat, '_id'>): Promise<Cat>;
  getAll(): Promise<Cat[]>;
  getById(id: string): Promise<Cat | null>;
  update(id: string, update: Partial<Cat>): Promise<boolean>;
  delete(id: string): Promise<boolean>;
}
