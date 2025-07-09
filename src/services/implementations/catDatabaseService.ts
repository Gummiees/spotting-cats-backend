import { Cat } from '@/models/cat';
import { connectToMongo } from '@/utils/mongo';
import { DatabaseService } from '@/services/databaseService';
import { ICatService } from '@/services/interfaces/catServiceInterface';
import { ObjectId } from 'mongodb';

const COLLECTION = 'cats';

export class CatDatabaseService implements ICatService {
  async create(cat: Omit<Cat, '_id'>): Promise<Cat> {
    try {
      const sanitizedCat = this.sanitizeCatData(cat);
      const validation = this.validateRequiredFields(sanitizedCat);

      if (!validation.valid) {
        throw new Error(validation.message);
      }

      const insertedId = await this.insertCat(sanitizedCat);

      return {
        _id: insertedId.toString(),
        name: sanitizedCat.name!,
        age: sanitizedCat.age!,
        breed: sanitizedCat.breed,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      this.handleDatabaseError(error, 'create');
    }
  }

  async getAll(): Promise<Cat[]> {
    try {
      const collection = await this.getCollection();
      const cats = await collection.find({}, this.createProjection()).toArray();
      return cats.map((cat) => this.mapCatToResponse(cat));
    } catch (error) {
      this.handleDatabaseError(error, 'getAll');
    }
  }

  async getById(id: string): Promise<Cat | null> {
    try {
      const cat = await this.findCatById(id);
      if (!cat) return null;
      return this.mapCatToResponse(cat);
    } catch (error) {
      this.handleDatabaseError(error, 'getById');
    }
  }

  async update(id: string, update: Partial<Cat>): Promise<boolean> {
    try {
      const sanitizedUpdate = this.sanitizeCatData(update);
      const validation = this.validateUpdateData(sanitizedUpdate);

      if (!validation.valid) {
        throw new Error(validation.message);
      }

      return await this.updateCatById(id, sanitizedUpdate);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      this.handleDatabaseError(error, 'update');
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      return await this.deleteCatById(id);
    } catch (error) {
      this.handleDatabaseError(error, 'delete');
    }
  }

  private async insertCat(catData: any): Promise<ObjectId> {
    const collection = await this.getCollection();
    const result = await collection.insertOne(catData);
    return result.insertedId;
  }

  private async findCatById(id: string): Promise<any> {
    const collection = await this.getCollection();
    return await collection.findOne(
      { _id: this.toObjectId(id) },
      this.createProjection()
    );
  }

  private async updateCatById(id: string, updateData: any): Promise<boolean> {
    const collection = await this.getCollection();
    const result = await collection.updateOne(
      { _id: this.toObjectId(id) },
      { $set: updateData }
    );
    return result.modifiedCount > 0;
  }

  private async deleteCatById(id: string): Promise<boolean> {
    const collection = await this.getCollection();
    const result = await collection.deleteOne({ _id: this.toObjectId(id) });
    return result.deletedCount > 0;
  }

  private async getCollection() {
    DatabaseService.requireDatabase();
    const db = await connectToMongo();
    return db.collection(COLLECTION);
  }

  private createProjection() {
    return { projection: { _id: 1, name: 1, age: 1, breed: 1 } };
  }

  private mapCatToResponse(cat: any): Cat {
    return {
      _id: cat._id.toString(),
      name: cat.name,
      age: cat.age,
      breed: cat.breed,
    };
  }

  private sanitizeCatData(data: any): {
    name?: string;
    age?: number;
    breed?: string;
  } {
    return {
      name: this.sanitizeString(data.name),
      age: this.sanitizeNumber(data.age, 0, 30),
      breed: this.sanitizeString(data.breed),
    };
  }

  private validateRequiredFields(sanitizedCat: any): {
    valid: boolean;
    message?: string;
  } {
    if (!sanitizedCat.name) {
      return { valid: false, message: 'Name is required' };
    }
    if (sanitizedCat.age === undefined) {
      return { valid: false, message: 'Age is required' };
    }
    return { valid: true };
  }

  private validateUpdateData(sanitizedUpdate: any): {
    valid: boolean;
    message?: string;
  } {
    if (Object.keys(sanitizedUpdate).length === 0) {
      return { valid: false, message: 'No valid fields to update' };
    }
    return { valid: true };
  }

  private toObjectId(id: string | ObjectId): ObjectId {
    if (id instanceof ObjectId) {
      return id;
    }

    if (!this.isValidObjectId(id)) {
      throw new Error(`Invalid ObjectId format: ${id}`);
    }

    return new ObjectId(id);
  }

  private sanitizeString(
    value: any,
    maxLength: number = 100
  ): string | undefined {
    if (value && typeof value === 'string') {
      return value.trim().substring(0, maxLength);
    }
    return undefined;
  }

  private sanitizeNumber(
    value: any,
    min: number,
    max: number
  ): number | undefined {
    if (value !== undefined) {
      const num = parseInt(value);
      if (!isNaN(num) && num >= min && num <= max) {
        return num;
      }
    }
    return undefined;
  }

  private isValidObjectId(id: string | ObjectId): boolean {
    if (id instanceof ObjectId) {
      return true;
    }
    return ObjectId.isValid(id);
  }

  private handleDatabaseError(error: any, operation: string): never {
    console.error(`Database error in ${operation}:`, error);
    throw new Error('Invalid request');
  }
}
