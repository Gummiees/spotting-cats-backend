import { Cat } from '@/models/cat';
import { connectToMongo } from '@/utils/mongo';
import { DatabaseService } from '@/services/databaseService';
import {
  ICatService,
  CatFilters,
} from '@/services/interfaces/catServiceInterface';
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

      // Set defaults for optional fields and ensure required fields are present
      const catWithDefaults = {
        userId: sanitizedCat.userId!,
        name: sanitizedCat.name!,
        age: sanitizedCat.age!,
        xCoordinate: sanitizedCat.xCoordinate!,
        yCoordinate: sanitizedCat.yCoordinate!,
        isDomestic: sanitizedCat.isDomestic!,
        isMale: sanitizedCat.isMale!,
        isSterilized: sanitizedCat.isSterilized!,
        isFriendly: sanitizedCat.isFriendly!,
        totalLikes: sanitizedCat.totalLikes ?? 0,
        imageUrls: sanitizedCat.imageUrls ?? [],
        isUserOwner: sanitizedCat.isUserOwner ?? false,
        createdAt: new Date(),
        // Optional fields
        protectorId: sanitizedCat.protectorId,
        colonyId: sanitizedCat.colonyId,
        breed: sanitizedCat.breed,
        extraInfo: sanitizedCat.extraInfo,
        updatedAt: sanitizedCat.updatedAt,
        confirmedOwnerAt: sanitizedCat.confirmedOwnerAt,
      };

      const insertedId = await this.insertCat(catWithDefaults);

      return {
        _id: insertedId.toString(),
        ...catWithDefaults,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      this.handleDatabaseError(error, 'create');
    }
  }

  async getAll(filters?: CatFilters): Promise<Cat[]> {
    try {
      const collection = await this.getCollection();
      const query = this.buildFilterQuery(filters);
      const options = this.buildQueryOptions(filters);

      const cats = await collection
        .find(query, { projection: this.createProjection().projection })
        .limit(options.limit)
        .skip(options.skip)
        .toArray();

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

  async getByUserId(userId: string): Promise<Cat[]> {
    try {
      const collection = await this.getCollection();
      const cats = await collection
        .find({ userId }, { projection: this.createProjection().projection })
        .toArray();

      return cats.map((cat) => this.mapCatToResponse(cat));
    } catch (error) {
      this.handleDatabaseError(error, 'getByUserId');
    }
  }

  async update(id: string, update: Partial<Cat>): Promise<boolean> {
    try {
      const sanitizedUpdate = this.sanitizeCatData(update);
      const validation = this.validateUpdateData(sanitizedUpdate);

      if (!validation.valid) {
        throw new Error(validation.message);
      }

      // Add updatedAt timestamp
      const updateWithTimestamp = {
        ...sanitizedUpdate,
        updatedAt: new Date(),
      };

      return await this.updateCatById(id, updateWithTimestamp);
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

  private buildFilterQuery(filters?: CatFilters): any {
    if (!filters) return {};

    const query: any = {};

    // String filters
    if (filters.userId) {
      query.userId = filters.userId;
    }
    if (filters.protectorId) {
      query.protectorId = filters.protectorId;
    }
    if (filters.colonyId) {
      query.colonyId = filters.colonyId;
    }

    // Number filters
    if (filters.age !== undefined) {
      query.age = filters.age;
    }

    // Boolean filters
    if (filters.isDomestic !== undefined) {
      query.isDomestic = filters.isDomestic;
    }
    if (filters.isMale !== undefined) {
      query.isMale = filters.isMale;
    }
    if (filters.isSterilized !== undefined) {
      query.isSterilized = filters.isSterilized;
    }
    if (filters.isFriendly !== undefined) {
      query.isFriendly = filters.isFriendly;
    }
    if (filters.isUserOwner !== undefined) {
      query.isUserOwner = filters.isUserOwner;
    }

    return query;
  }

  private buildQueryOptions(filters?: CatFilters): {
    limit: number;
    skip: number;
  } {
    const limit = filters?.limit
      ? Math.min(Math.max(filters.limit, 1), 100)
      : 10; // Default 10, max 100
    const page = filters?.page ? Math.max(filters.page, 1) : 1; // Default page 1
    const skip = (page - 1) * limit;

    return { limit, skip };
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
    return {
      projection: {
        _id: 1,
        userId: 1,
        protectorId: 1,
        colonyId: 1,
        totalLikes: 1,
        name: 1,
        age: 1,
        breed: 1,
        imageUrls: 1,
        xCoordinate: 1,
        yCoordinate: 1,
        extraInfo: 1,
        isDomestic: 1,
        isMale: 1,
        isSterilized: 1,
        isFriendly: 1,
        isUserOwner: 1,
        createdAt: 1,
        updatedAt: 1,
        confirmedOwnerAt: 1,
      },
    };
  }

  private mapCatToResponse(cat: any): Cat {
    return {
      _id: cat._id.toString(),
      userId: cat.userId,
      protectorId: cat.protectorId,
      colonyId: cat.colonyId,
      totalLikes: cat.totalLikes ?? 0,
      name: cat.name,
      age: cat.age,
      breed: cat.breed,
      imageUrls: cat.imageUrls ?? [],
      xCoordinate: cat.xCoordinate,
      yCoordinate: cat.yCoordinate,
      extraInfo: cat.extraInfo,
      isDomestic: cat.isDomestic,
      isMale: cat.isMale,
      isSterilized: cat.isSterilized,
      isFriendly: cat.isFriendly,
      isUserOwner: cat.isUserOwner ?? false,
      createdAt: cat.createdAt,
      updatedAt: cat.updatedAt,
      confirmedOwnerAt: cat.confirmedOwnerAt,
    };
  }

  private sanitizeCatData(data: any): Partial<Cat> {
    return {
      userId: this.sanitizeString(data.userId),
      protectorId: this.sanitizeString(data.protectorId),
      colonyId: this.sanitizeString(data.colonyId),
      totalLikes: this.sanitizeNumber(data.totalLikes, 0, 999999),
      name: this.sanitizeString(data.name),
      age: this.sanitizeNumber(data.age, 0, 30),
      breed: this.sanitizeString(data.breed),
      imageUrls: this.sanitizeStringArray(data.imageUrls),
      xCoordinate: this.sanitizeNumber(data.xCoordinate, -180, 180),
      yCoordinate: this.sanitizeNumber(data.yCoordinate, -90, 90),
      extraInfo: this.sanitizeString(data.extraInfo, 1000),
      isDomestic: this.sanitizeBoolean(data.isDomestic),
      isMale: this.sanitizeBoolean(data.isMale),
      isSterilized: this.sanitizeBoolean(data.isSterilized),
      isFriendly: this.sanitizeBoolean(data.isFriendly),
      isUserOwner: this.sanitizeBoolean(data.isUserOwner),
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : undefined,
      confirmedOwnerAt: data.confirmedOwnerAt
        ? new Date(data.confirmedOwnerAt)
        : undefined,
    };
  }

  private validateRequiredFields(sanitizedCat: any): {
    valid: boolean;
    message?: string;
  } {
    if (!sanitizedCat.userId) {
      return { valid: false, message: 'userId is required' };
    }
    if (!sanitizedCat.name) {
      return { valid: false, message: 'Name is required' };
    }
    if (sanitizedCat.age === undefined) {
      return { valid: false, message: 'Age is required' };
    }
    if (sanitizedCat.xCoordinate === undefined) {
      return { valid: false, message: 'xCoordinate is required' };
    }
    if (sanitizedCat.yCoordinate === undefined) {
      return { valid: false, message: 'yCoordinate is required' };
    }
    if (sanitizedCat.isDomestic === undefined) {
      return { valid: false, message: 'isDomestic is required' };
    }
    if (sanitizedCat.isMale === undefined) {
      return { valid: false, message: 'isMale is required' };
    }
    if (sanitizedCat.isSterilized === undefined) {
      return { valid: false, message: 'isSterilized is required' };
    }
    if (sanitizedCat.isFriendly === undefined) {
      return { valid: false, message: 'isFriendly is required' };
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
      const num = parseFloat(value);
      if (!isNaN(num) && num >= min && num <= max) {
        return num;
      }
    }
    return undefined;
  }

  private sanitizeBoolean(value: any): boolean | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      const lower = value.toLowerCase();
      if (lower === 'true' || lower === '1' || lower === 'yes') {
        return true;
      }
      if (lower === 'false' || lower === '0' || lower === 'no') {
        return false;
      }
    }
    if (typeof value === 'number') {
      return value !== 0;
    }
    return undefined;
  }

  private sanitizeStringArray(value: any): string[] | undefined {
    if (!value) {
      return undefined;
    }
    if (Array.isArray(value)) {
      return value
        .filter((item) => typeof item === 'string')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
    }
    return undefined;
  }

  private isValidObjectId(id: string | ObjectId): boolean {
    if (id instanceof ObjectId) {
      return true;
    }

    if (typeof id !== 'string') {
      return false;
    }

    return ObjectId.isValid(id);
  }

  private handleDatabaseError(error: any, operation: string): never {
    console.error(`Database error in ${operation}:`, error);
    throw new Error(`Database operation failed: ${operation}`);
  }
}
