import { Cat } from '@/models/cat';
import { connectToMongo } from '@/utils/mongo';
import { DatabaseService } from '@/services/databaseService';
import { ICatService } from '@/services/interfaces/catServiceInterface';
import { ObjectId } from 'mongodb';

// Helper function to safely convert to ObjectId with validation
function toObjectId(id: string | ObjectId): ObjectId {
  if (id instanceof ObjectId) {
    return id;
  }

  // Validate that the string is a valid ObjectId format
  if (!ObjectId.isValid(id)) {
    throw new Error(`Invalid ObjectId format: ${id}`);
  }

  return new ObjectId(id);
}

// Sanitize input data to prevent NoSQL injection
function sanitizeCatData(data: any): {
  name?: string;
  age?: number;
  breed?: string;
} {
  const sanitized: { name?: string; age?: number; breed?: string } = {};

  if (data.name && typeof data.name === 'string') {
    sanitized.name = data.name.trim().substring(0, 100);
  }

  if (data.age !== undefined) {
    const age = parseInt(data.age);
    if (!isNaN(age) && age >= 0 && age <= 30) {
      sanitized.age = age;
    }
  }

  if (data.breed && typeof data.breed === 'string') {
    sanitized.breed = data.breed.trim().substring(0, 100);
  }

  return sanitized;
}

const COLLECTION = 'cats';

export class CatDatabaseService implements ICatService {
  async create(cat: Omit<Cat, '_id'>): Promise<Cat> {
    DatabaseService.requireDatabase();

    // Sanitize input data
    const sanitizedCat = sanitizeCatData(cat);

    // Validate required fields
    if (!sanitizedCat.name || sanitizedCat.age === undefined) {
      throw new Error('Name and age are required');
    }

    const db = await connectToMongo();
    const result = await db.collection(COLLECTION).insertOne({
      name: sanitizedCat.name,
      age: sanitizedCat.age,
      breed: sanitizedCat.breed,
    });

    return {
      _id: result.insertedId.toString(),
      name: sanitizedCat.name,
      age: sanitizedCat.age,
      breed: sanitizedCat.breed,
    };
  }

  async getAll(): Promise<Cat[]> {
    DatabaseService.requireDatabase();
    const db = await connectToMongo();

    // Use projection to only return necessary fields
    const cats = await db
      .collection(COLLECTION)
      .find({}, { projection: { _id: 1, name: 1, age: 1, breed: 1 } })
      .toArray();

    return cats.map((cat) => ({
      _id: cat._id.toString(),
      name: cat.name,
      age: cat.age,
      breed: cat.breed,
    }));
  }

  async getById(id: string): Promise<Cat | null> {
    DatabaseService.requireDatabase();
    const db = await connectToMongo();

    try {
      const cat = await db
        .collection(COLLECTION)
        .findOne(
          { _id: toObjectId(id) },
          { projection: { _id: 1, name: 1, age: 1, breed: 1 } }
        );

      if (!cat) return null;

      return {
        _id: cat._id.toString(),
        name: cat.name,
        age: cat.age,
        breed: cat.breed,
      };
    } catch (error) {
      // Log the error but don't expose internal details
      console.error('Database error in getById:', error);
      throw new Error('Invalid request');
    }
  }

  async update(id: string, update: Partial<Cat>): Promise<boolean> {
    DatabaseService.requireDatabase();
    const db = await connectToMongo();

    // Sanitize update data
    const sanitizedUpdate = sanitizeCatData(update);

    // Don't allow empty updates
    if (Object.keys(sanitizedUpdate).length === 0) {
      throw new Error('No valid fields to update');
    }

    try {
      const result = await db
        .collection(COLLECTION)
        .updateOne({ _id: toObjectId(id) }, { $set: sanitizedUpdate });

      return result.modifiedCount > 0;
    } catch (error) {
      console.error('Database error in update:', error);
      throw new Error('Invalid request');
    }
  }

  async delete(id: string): Promise<boolean> {
    DatabaseService.requireDatabase();
    const db = await connectToMongo();

    try {
      const result = await db
        .collection(COLLECTION)
        .deleteOne({ _id: toObjectId(id) });

      return result.deletedCount > 0;
    } catch (error) {
      console.error('Database error in delete:', error);
      throw new Error('Invalid request');
    }
  }
}
