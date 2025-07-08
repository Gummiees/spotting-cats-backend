import { Cat } from '@/models/cat';
import { connectToMongo } from '@/utils/mongo';
import { DatabaseService } from '@/services/databaseService';
import { ICatService } from '@/services/interfaces/catServiceInterface';
import { ObjectId } from 'mongodb';

// Helper function to safely convert to ObjectId
function toObjectId(id: string | ObjectId): ObjectId {
  return id instanceof ObjectId ? id : new ObjectId(id);
}

const COLLECTION = 'cats';

export class CatDatabaseService implements ICatService {
  async create(cat: Omit<Cat, '_id'>): Promise<Cat> {
    DatabaseService.requireDatabase();
    const db = await connectToMongo();
    const result = await db.collection(COLLECTION).insertOne(cat);
    return { ...cat, _id: result.insertedId.toString() };
  }

  async getAll(): Promise<Cat[]> {
    DatabaseService.requireDatabase();
    const db = await connectToMongo();
    const cats = await db.collection(COLLECTION).find().toArray();
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
    const cat = await db
      .collection(COLLECTION)
      .findOne({ _id: toObjectId(id) });

    if (!cat) return null;

    return {
      _id: cat._id.toString(),
      name: cat.name,
      age: cat.age,
      breed: cat.breed,
    };
  }

  async update(id: string, update: Partial<Cat>): Promise<boolean> {
    DatabaseService.requireDatabase();
    const db = await connectToMongo();

    // Remove _id from update payload to prevent BSONError
    const { _id, ...updateData } = update;

    const result = await db
      .collection(COLLECTION)
      .updateOne({ _id: toObjectId(id) }, { $set: updateData });

    return result.modifiedCount > 0;
  }

  async delete(id: string): Promise<boolean> {
    DatabaseService.requireDatabase();
    const db = await connectToMongo();
    const result = await db
      .collection(COLLECTION)
      .deleteOne({ _id: toObjectId(id) });

    return result.deletedCount > 0;
  }
}
