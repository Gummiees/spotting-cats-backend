import { Cat } from '@/models/cat';
import { connectToMongo } from '@/utils/mongo';
import { DatabaseService } from '@/services/databaseService';
import {
  ICatService,
  CatFilters,
  CatResponse,
} from '@/services/interfaces/catServiceInterface';
import { ObjectId } from 'mongodb';
import { userService } from '@/services/userService';
import { likeService } from '@/services/likeService';

const COLLECTION = 'cats';

export class CatDatabaseService implements ICatService {
  async create(cat: Omit<Cat, 'id'>): Promise<CatResponse> {
    try {
      const sanitizedCat = this.sanitizeCatData(cat);
      const validation = this.validateRequiredFields(sanitizedCat);

      if (!validation.valid) {
        throw new Error(validation.message);
      }

      const catWithDefaults = {
        userId: sanitizedCat.userId,
        xCoordinate: sanitizedCat.xCoordinate!,
        yCoordinate: sanitizedCat.yCoordinate!,
        totalLikes: 0,
        imageUrls: sanitizedCat.imageUrls ?? [],
        isUserOwner: false,
        createdAt: new Date(),
        name: sanitizedCat.name,
        age: sanitizedCat.age,
        isDomestic: sanitizedCat.isDomestic,
        isMale: sanitizedCat.isMale,
        isSterilized: sanitizedCat.isSterilized,
        isFriendly: sanitizedCat.isFriendly,
        protectorId: sanitizedCat.protectorId,
        colonyId: sanitizedCat.colonyId,
        breed: sanitizedCat.breed,
        extraInfo: sanitizedCat.extraInfo,
      };

      const insertedId = await this.insertCat(catWithDefaults);

      const createdCat = await this.mapCatToResponse({
        _id: insertedId,
        ...catWithDefaults,
      });
      return this.stripUserIdForFrontend(createdCat);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      this.handleDatabaseError(error, 'create');
    }
  }

  async getAll(filters?: CatFilters, userId?: string): Promise<CatResponse[]> {
    try {
      const collection = await this.getCollection();
      const query = this.buildFilterQuery(filters);
      const options = this.buildQueryOptions(filters);
      const sort = this.buildSortOptions(filters);

      const cats = await collection
        .find(query, { projection: this.createProjection().projection })
        .sort(sort)
        .limit(options.limit)
        .skip(options.skip)
        .toArray();

      const mappedCats = await Promise.all(
        cats.map((cat) => this.mapCatToResponse(cat, userId))
      );

      // Apply special handling for age ordering (cats with no age at the end)
      if (filters?.orderBy?.field === 'age') {
        return this.handleAgeOrdering(mappedCats, filters.orderBy.direction);
      }

      return mappedCats.map((cat) => this.stripUserIdForFrontend(cat));
    } catch (error) {
      this.handleDatabaseError(error, 'getAll');
    }
  }

  async getById(id: string, userId?: string): Promise<CatResponse | null> {
    try {
      const cat = await this.findCatById(id);
      if (!cat) return null;
      const mappedCat = await this.mapCatToResponse(cat, userId);
      return this.stripUserIdForFrontend(mappedCat);
    } catch (error) {
      this.handleDatabaseError(error, 'getById');
    }
  }

  async getByIdForAuth(id: string): Promise<Cat | null> {
    try {
      const cat = await this.findCatById(id);
      if (!cat) return null;
      return await this.mapCatToResponse(cat);
    } catch (error) {
      this.handleDatabaseError(error, 'getByIdForAuth');
    }
  }

  async getByUserId(userId: string): Promise<CatResponse[]> {
    try {
      const collection = await this.getCollection();
      const cats = await collection
        .find({ userId }, { projection: this.createProjection().projection })
        .toArray();

      const mappedCats = await Promise.all(
        cats.map((cat) => this.mapCatToResponse(cat))
      );
      return mappedCats.map((cat) => this.stripUserIdForFrontend(cat));
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

  async purge(): Promise<number> {
    try {
      const collection = await this.getCollection();
      const result = await collection.deleteMany({});
      return result.deletedCount;
    } catch (error) {
      this.handleDatabaseError(error, 'purge');
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
      ? Math.min(Math.max(filters.limit, 1), 24)
      : 12;
    const page = filters?.page ? Math.max(filters.page, 1) : 1;
    const skip = (page - 1) * limit;

    return { limit, skip };
  }

  private buildSortOptions(filters?: CatFilters): any {
    if (!filters?.orderBy) {
      return { createdAt: -1 }; // Default sort by newest first
    }

    const { field, direction } = filters.orderBy;
    const sortDirection = direction === 'ASC' ? 1 : -1;

    switch (field) {
      case 'totalLikes':
        return { totalLikes: sortDirection, createdAt: -1 };
      case 'age':
        // For age, we'll handle the special case in handleAgeOrdering
        return { age: sortDirection, createdAt: -1 };
      case 'createdAt':
        return { createdAt: sortDirection };
      default:
        return { createdAt: -1 };
    }
  }

  private handleAgeOrdering(
    cats: Cat[],
    direction: 'ASC' | 'DESC'
  ): CatResponse[] {
    // Separate cats with age and without age
    const catsWithAge = cats.filter(
      (cat) => cat.age !== undefined && cat.age !== null
    );
    const catsWithoutAge = cats.filter(
      (cat) => cat.age === undefined || cat.age === null
    );

    // Sort cats with age
    catsWithAge.sort((a, b) => {
      const ageA = a.age || 0;
      const ageB = b.age || 0;
      return direction === 'ASC' ? ageA - ageB : ageB - ageA;
    });

    // Combine: cats with age (sorted) + cats without age (at the end)
    const sortedCats = [...catsWithAge, ...catsWithoutAge];

    return sortedCats.map((cat) => this.stripUserIdForFrontend(cat));
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

  private async mapCatToResponse(cat: any, userId?: string): Promise<Cat> {
    let username: string | undefined;
    let isLiked: boolean | undefined;

    if (cat.userId) {
      try {
        const user = await userService.getBasicUserById(cat.userId);
        username = user?.username;
      } catch (error) {
        console.error(
          `Failed to fetch username for userId ${cat.userId}:`,
          error
        );
      }
    }

    if (userId) {
      try {
        isLiked = await likeService.isLikedByUser(userId, cat._id.toString());
      } catch (error) {
        console.error(
          `Failed to check if user ${userId} liked cat ${cat._id}:`,
          error
        );
      }
    }

    return {
      id: cat._id.toString(),
      userId: cat.userId,
      username,
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
      isLiked: isLiked ?? false,
      createdAt: cat.createdAt,
      updatedAt: cat.updatedAt,
      confirmedOwnerAt: cat.confirmedOwnerAt,
    };
  }

  private stripUserIdForFrontend(cat: Cat): Omit<Cat, 'userId'> {
    const { userId, ...catForFrontend } = cat;
    return catForFrontend;
  }

  private sanitizeCatData(data: any): Partial<Cat> {
    const {
      createdAt,
      updatedAt,
      confirmedOwnerAt,
      isUserOwner,
      totalLikes,
      ...sanitizedData
    } = data;

    return {
      userId: this.sanitizeString(sanitizedData.userId),
      protectorId: this.sanitizeString(sanitizedData.protectorId),
      colonyId: this.sanitizeString(sanitizedData.colonyId),
      name: this.sanitizeString(sanitizedData.name),
      age: this.sanitizeNumber(sanitizedData.age, 0, 30),
      breed: this.sanitizeString(sanitizedData.breed),
      imageUrls: this.sanitizeStringArray(sanitizedData.imageUrls),
      xCoordinate: this.sanitizeNumber(sanitizedData.xCoordinate, -180, 180),
      yCoordinate: this.sanitizeNumber(sanitizedData.yCoordinate, -90, 90),
      extraInfo: this.sanitizeString(sanitizedData.extraInfo, 1000),
      isDomestic: this.sanitizeBoolean(sanitizedData.isDomestic),
      isMale: this.sanitizeBoolean(sanitizedData.isMale),
      isSterilized: this.sanitizeBoolean(sanitizedData.isSterilized),
      isFriendly: this.sanitizeBoolean(sanitizedData.isFriendly),
    };
  }

  private validateRequiredFields(sanitizedCat: any): {
    valid: boolean;
    message?: string;
  } {
    if (sanitizedCat.xCoordinate === undefined) {
      return { valid: false, message: 'xCoordinate is required' };
    }
    if (sanitizedCat.yCoordinate === undefined) {
      return { valid: false, message: 'yCoordinate is required' };
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
