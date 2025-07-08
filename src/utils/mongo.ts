import { Db, MongoClient } from 'mongodb';

const uri = process.env.MONGO_URL || process.env.MONGODB_URL || '';

let client: MongoClient;
let db: Db;

export async function connectToMongo(): Promise<Db> {
  if (!uri) {
    throw new Error(
      'MongoDB connection string is not set in environment variables.'
    );
  }

  if (db) return db;
  client = new MongoClient(uri);
  await client.connect();
  db = client.db(); // Use default DB from URI
  return db;
}

export function getMongoClient(): MongoClient {
  if (!client)
    throw new Error('MongoClient not initialized. Call connectToMongo first.');
  return client;
}

export function isMongoConfigured(): boolean {
  return !!uri;
}
