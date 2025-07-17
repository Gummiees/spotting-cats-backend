import { Db, MongoClient } from 'mongodb';

const uri = process.env.MONGO_URL || process.env.MONGODB_URL || '';
const dbName = process.env.MONGO_DB_NAME || process.env.MONGODB_DB_NAME || '';

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

  // Use custom database name if provided, otherwise use default from URI
  if (dbName) {
    db = client.db(dbName);
  } else {
    db = client.db(); // Use default DB from URI
  }

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

export function getDatabaseName(): string {
  return dbName || 'default';
}

export async function disconnectMongo(): Promise<void> {
  if (client) {
    await client.close();
    client = undefined as any;
    db = undefined as any;
  }
}
