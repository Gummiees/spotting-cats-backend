import { isMongoConfigured } from '@/utils/mongo';

export class DatabaseService {
  static isAvailable(): boolean {
    return isMongoConfigured();
  }

  static requireDatabase(): void {
    if (!this.isAvailable()) {
      throw new Error(
        'Database is not configured. Please set MONGO_URL or MONGODB_URL environment variable.'
      );
    }
  }

  static getStatus(): { available: boolean; configured: boolean } {
    return {
      available: this.isAvailable(),
      configured: this.isAvailable(),
    };
  }
}
