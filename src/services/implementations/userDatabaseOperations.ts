import { Collection, ObjectId } from 'mongodb';
import { connectToMongo } from '@/utils/mongo';

export class UserDatabaseOperations {
  private usersCollection: Collection<any>;
  private authCodesCollection: Collection<any>;
  private bannedIpsCollection: Collection<any>;

  constructor() {
    this.usersCollection = null as any;
    this.authCodesCollection = null as any;
    this.bannedIpsCollection = null as any;
    this.initializeCollections();
  }

  private async initializeCollections(): Promise<void> {
    try {
      const db = await connectToMongo();
      this.usersCollection = db.collection('users');
      this.authCodesCollection = db.collection('auth_codes');
      this.bannedIpsCollection = db.collection('banned_ips');
    } catch (error) {
      console.error('Failed to initialize collections:', error);
    }
  }

  // User operations
  async findUserById(userId: string): Promise<any> {
    return this.usersCollection.findOne({
      _id: this.createObjectId(userId),
    });
  }

  async findUserByEmail(email: string): Promise<any> {
    return this.usersCollection.findOne({
      email: email,
    });
  }

  async findUserByUsername(username: string): Promise<any> {
    return this.usersCollection.findOne({
      username: username,
    });
  }

  async findAllUsers(): Promise<any[]> {
    return this.usersCollection.find({}).toArray();
  }

  async findAllUsersWithPrivileges(): Promise<any[]> {
    return this.usersCollection.find({}).toArray();
  }

  async findUsersByIpAddresses(ipAddresses: string[]): Promise<any[]> {
    return this.usersCollection
      .find({
        ipAddresses: { $in: ipAddresses },
      })
      .toArray();
  }

  async findUsersByIpAddressesAndBanReason(
    ipAddresses: string[]
  ): Promise<any[]> {
    return this.usersCollection
      .find({
        $and: [
          {
            ipAddresses: { $in: ipAddresses },
          },
          {
            banReason: { $regex: /^IP ban:/, $options: 'i' },
          },
        ],
      })
      .toArray();
  }

  /**
   * Finds all IP addresses from a set of users
   * @param userIds - Array of user IDs
   * @returns Array of unique IP addresses
   */
  async findIpAddressesFromUsers(userIds: string[]): Promise<string[]> {
    const objectIds = userIds.map((id) => this.createObjectId(id));
    const users = await this.usersCollection
      .find({ _id: { $in: objectIds } }, { projection: { ipAddresses: 1 } })
      .toArray();

    // Extract and flatten all IP addresses, then remove duplicates
    const allIps = users
      .flatMap((user) => user.ipAddresses || [])
      .filter((ip) => ip); // Remove null/undefined values

    return [...new Set(allIps)]; // Remove duplicates
  }

  async findDeactivatedUsersBefore(cutoffDate: Date): Promise<any[]> {
    return this.usersCollection
      .find({
        isActive: false,
        deactivatedAt: { $lt: cutoffDate },
        isBanned: false,
      })
      .toArray();
  }

  async findUsersWithoutAvatars(): Promise<any[]> {
    return this.usersCollection
      .find({
        $or: [
          { avatarUrl: { $exists: false } },
          { avatarUrl: null },
          { avatarUrl: '' },
        ],
        isBanned: false,
      })
      .toArray();
  }

  async insertUser(userData: any): Promise<any> {
    const result = await this.usersCollection.insertOne(userData);
    return { ...userData, _id: result.insertedId };
  }

  async updateUser(userId: string, updateData: any): Promise<any> {
    const result = await this.usersCollection.updateOne(
      { _id: this.createObjectId(userId) },
      { $set: updateData }
    );
    return result;
  }

  async updateUserWithOperators(userId: string, updateData: any): Promise<any> {
    const { $addToSet, ...regularFields } = updateData;

    // First update regular fields
    await this.usersCollection.updateOne(
      { _id: this.createObjectId(userId) },
      { $set: regularFields }
    );

    // Then update with MongoDB operators if needed
    if ($addToSet) {
      await this.usersCollection.updateOne(
        { _id: this.createObjectId(userId) },
        { $addToSet }
      );
    }

    return this.usersCollection.findOne({ _id: this.createObjectId(userId) });
  }

  async updateManyUsers(userIds: string[], updateData: any): Promise<any> {
    const objectIds = userIds.map((id) => this.createObjectId(id));
    return this.usersCollection.updateMany(
      { _id: { $in: objectIds } },
      { $set: updateData }
    );
  }

  async deleteUser(userId: string): Promise<any> {
    return this.usersCollection.deleteOne({
      _id: this.createObjectId(userId),
    });
  }

  async deleteDeactivatedUsersBefore(cutoffDate: Date): Promise<number> {
    const result = await this.usersCollection.deleteMany({
      isActive: false,
      deactivatedAt: { $lt: cutoffDate },
      isBanned: false,
    });
    return result.deletedCount;
  }

  async countDeactivatedUsers(): Promise<number> {
    return this.usersCollection.countDocuments({
      isActive: false,
      isBanned: false,
    });
  }

  async countOldDeactivatedUsers(cutoffDate: Date): Promise<number> {
    return this.usersCollection.countDocuments({
      isActive: false,
      deactivatedAt: { $lt: cutoffDate },
      isBanned: false,
    });
  }

  async checkUsernameExists(
    username: string,
    excludeUserId?: string
  ): Promise<boolean> {
    const query: any = {
      username,
      isBanned: false,
    };

    if (excludeUserId) {
      query._id = { $ne: this.createObjectId(excludeUserId) };
    }

    const existingUser = await this.usersCollection.findOne(query);
    return !!existingUser;
  }

  async checkEmailExists(
    email: string,
    excludeUserId?: string
  ): Promise<boolean> {
    const query: any = {
      email: email,
    };

    if (excludeUserId) {
      query._id = { $ne: this.createObjectId(excludeUserId) };
    }

    const existingUser = await this.usersCollection.findOne(query);
    return !!existingUser;
  }

  // Auth code operations
  async findValidAuthCode(email: string, code: string): Promise<any> {
    const normalizedEmail = email.toLowerCase();
    return this.authCodesCollection.findOne({
      email: normalizedEmail,
      code,
      used: false,
      expiresAt: { $gt: new Date() },
    });
  }

  async findEmailChangeRequest(userId: string, code: string): Promise<any> {
    return this.authCodesCollection.findOne({
      userId: this.createObjectId(userId),
      code,
      newEmail: { $exists: true },
      used: false,
      expiresAt: { $gt: new Date() },
    });
  }

  async findRecentEmailChangeRequest(
    userId: string,
    tenMinutesAgo: Date
  ): Promise<any> {
    return this.authCodesCollection.findOne({
      userId: this.createObjectId(userId),
      newEmail: { $exists: true },
      createdAt: { $gt: tenMinutesAgo },
    });
  }

  async insertAuthCode(authCode: any): Promise<void> {
    await this.authCodesCollection.insertOne(authCode);
  }

  async insertEmailChangeRequest(emailChangeRequest: any): Promise<void> {
    await this.authCodesCollection.insertOne(emailChangeRequest);
  }

  async markCodeAsUsed(authCodeId: ObjectId): Promise<void> {
    await this.authCodesCollection.updateOne(
      { _id: authCodeId },
      { $set: { used: true } }
    );
  }

  async markEmailChangeRequestAsUsed(requestId: ObjectId): Promise<void> {
    await this.authCodesCollection.updateOne(
      { _id: requestId },
      { $set: { used: true } }
    );
  }

  async invalidatePreviousCodes(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase();
    await this.authCodesCollection.updateMany(
      { email: normalizedEmail },
      { $set: { used: true } }
    );
  }

  async invalidatePreviousEmailChangeRequests(userId: string): Promise<void> {
    await this.authCodesCollection.updateMany(
      {
        userId: this.createObjectId(userId),
        newEmail: { $exists: true },
      },
      { $set: { used: true } }
    );
  }

  async cleanupEmailChangeRequest(userId: string): Promise<void> {
    await this.authCodesCollection.deleteMany({
      userId: this.createObjectId(userId),
      newEmail: { $exists: true },
    });
  }

  async cleanupExpiredCodes(): Promise<void> {
    // Clean up expired regular verification codes
    await this.authCodesCollection.deleteMany({
      expiresAt: { $lt: new Date() },
      newEmail: { $exists: false },
    });

    // Clean up expired email change requests
    await this.authCodesCollection.deleteMany({
      expiresAt: { $lt: new Date() },
      newEmail: { $exists: true },
    });
  }

  // Banned IP operations
  async findBannedIp(ipAddress: string): Promise<any> {
    return this.bannedIpsCollection.findOne({
      ipAddress: ipAddress,
    });
  }

  async insertBannedIps(bannedIpDocuments: any[]): Promise<void> {
    await this.bannedIpsCollection.insertMany(bannedIpDocuments);
  }

  async deleteBannedIps(ipAddresses: string[]): Promise<void> {
    await this.bannedIpsCollection.deleteMany({
      ipAddress: { $in: ipAddresses },
    });
  }

  // Cat operations (for orphaning)
  async orphanUserCats(userId: string): Promise<void> {
    const { connectToMongo } = await import('@/utils/mongo');
    const db = await connectToMongo();
    const catsCollection = db.collection('cats');
    await catsCollection.updateMany({ userId }, { $unset: { userId: '' } });
  }

  // Utility methods
  private createObjectId(id: string): ObjectId {
    return new ObjectId(id);
  }
}
