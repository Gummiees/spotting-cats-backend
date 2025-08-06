import { Collection, ObjectId } from 'mongodb';
import { connectToMongo } from '@/utils/mongo';

export class UserDatabaseOperations {
  private usersCollection: Collection<any>;
  private authCodesCollection: Collection<any>;
  private bannedIpsCollection: Collection<any>;
  private initialized: boolean = false;

  constructor() {
    this.usersCollection = null as any;
    this.authCodesCollection = null as any;
    this.bannedIpsCollection = null as any;
    // Initialize collections immediately
    this.initializeCollections();
  }

  private async initializeCollections(): Promise<void> {
    if (this.initialized) return;

    try {
      const db = await connectToMongo();
      this.usersCollection = db.collection('users');
      this.authCodesCollection = db.collection('auth_codes');
      this.bannedIpsCollection = db.collection('banned_ips');
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize collections:', error);
      throw error;
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initializeCollections();
    }
  }

  // User operations
  async findUserById(userId: string): Promise<any> {
    await this.ensureInitialized();
    return this.usersCollection.findOne({
      _id: this.createObjectId(userId),
    });
  }

  async findUserByUsername(username: string): Promise<any> {
    await this.ensureInitialized();
    return this.usersCollection.findOne({
      username: username,
    });
  }

  async findUserByEmailHash(emailHash: string): Promise<any> {
    await this.ensureInitialized();
    return this.usersCollection.findOne({
      emailHash: emailHash,
    });
  }

  async findAllUsers(): Promise<any[]> {
    await this.ensureInitialized();
    return this.usersCollection.find({}).toArray();
  }

  async findAllUsersWithoutEmailHash(): Promise<any[]> {
    await this.ensureInitialized();
    return this.usersCollection
      .find({ emailHash: { $exists: false } })
      .toArray();
  }

  async findAllUsersWithPrivileges(): Promise<any[]> {
    await this.ensureInitialized();
    return this.usersCollection.find({}).toArray();
  }

  async findUsersByIpAddresses(ipAddresses: string[]): Promise<any[]> {
    await this.ensureInitialized();
    return this.usersCollection
      .find({
        ipAddresses: { $in: ipAddresses },
      })
      .toArray();
  }

  async findUsersByIpAddressesAndBanReason(
    ipAddresses: string[]
  ): Promise<any[]> {
    await this.ensureInitialized();
    return this.usersCollection
      .find({
        $and: [
          {
            ipAddresses: { $in: ipAddresses },
          },
          {
            banType: 'ip',
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
    await this.ensureInitialized();
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
    await this.ensureInitialized();
    return this.usersCollection
      .find({
        isActive: false,
        deactivatedAt: { $lt: cutoffDate },
        isBanned: false,
      })
      .toArray();
  }

  async findUsersWithoutAvatars(): Promise<any[]> {
    await this.ensureInitialized();
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
    await this.ensureInitialized();
    const result = await this.usersCollection.insertOne(userData);
    return { ...userData, _id: result.insertedId };
  }

  async updateUser(userId: string, updateData: any): Promise<any> {
    await this.ensureInitialized();
    const result = await this.usersCollection.updateOne(
      { _id: this.createObjectId(userId) },
      { $set: updateData }
    );
    return result;
  }

  async updateUserWithOperators(userId: string, updateData: any): Promise<any> {
    await this.ensureInitialized();
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
  }

  async updateManyUsers(userIds: string[], updateData: any): Promise<any> {
    await this.ensureInitialized();
    const objectIds = userIds.map((id) => this.createObjectId(id));
    return this.usersCollection.updateMany(
      { _id: { $in: objectIds } },
      { $set: updateData }
    );
  }

  async deleteUser(userId: string): Promise<any> {
    await this.ensureInitialized();
    return this.usersCollection.deleteOne({
      _id: this.createObjectId(userId),
    });
  }

  async deleteDeactivatedUsersBefore(cutoffDate: Date): Promise<number> {
    await this.ensureInitialized();
    const result = await this.usersCollection.deleteMany({
      isActive: false,
      deactivatedAt: { $lt: cutoffDate },
      isBanned: false,
    });
    return result.deletedCount || 0;
  }

  async countDeactivatedUsers(): Promise<number> {
    await this.ensureInitialized();
    return this.usersCollection.countDocuments({
      isActive: false,
      isBanned: false,
    });
  }

  async countOldDeactivatedUsers(cutoffDate: Date): Promise<number> {
    await this.ensureInitialized();
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
    await this.ensureInitialized();
    const query: any = { username: username };
    if (excludeUserId) {
      query._id = { $ne: this.createObjectId(excludeUserId) };
    }
    const user = await this.usersCollection.findOne(query);
    return !!user;
  }

  async checkEmailHashExists(
    emailHash: string,
    excludeUserId?: string
  ): Promise<boolean> {
    await this.ensureInitialized();
    const query: any = { emailHash: emailHash };
    if (excludeUserId) {
      query._id = { $ne: this.createObjectId(excludeUserId) };
    }
    const user = await this.usersCollection.findOne(query);
    return !!user;
  }

  // Auth code operations
  async findValidAuthCode(email: string, code: string): Promise<any> {
    await this.ensureInitialized();
    return this.authCodesCollection.findOne({
      email: email,
      code: String(code), // Ensure code is always a string
      used: false,
      expiresAt: { $gt: new Date() },
    });
  }

  async findEmailChangeRequest(userId: string, code: string): Promise<any> {
    await this.ensureInitialized();
    return this.authCodesCollection.findOne({
      userId: userId,
      code: code,
      type: 'email_change',
      used: false,
      expiresAt: { $gt: new Date() },
    });
  }

  async findRecentEmailChangeRequest(
    userId: string,
    tenMinutesAgo: Date
  ): Promise<any> {
    await this.ensureInitialized();
    return this.authCodesCollection.findOne({
      userId: userId,
      type: 'email_change',
      createdAt: { $gt: tenMinutesAgo },
    });
  }

  async insertAuthCode(authCode: any): Promise<void> {
    await this.ensureInitialized();
    await this.authCodesCollection.insertOne(authCode);
  }

  async insertEmailChangeRequest(emailChangeRequest: any): Promise<void> {
    await this.ensureInitialized();
    await this.authCodesCollection.insertOne(emailChangeRequest);
  }

  async markCodeAsUsed(authCodeId: ObjectId): Promise<void> {
    await this.ensureInitialized();
    await this.authCodesCollection.updateOne(
      { _id: authCodeId },
      { $set: { used: true } }
    );
  }

  async markEmailChangeRequestAsUsed(requestId: ObjectId): Promise<void> {
    await this.ensureInitialized();
    await this.authCodesCollection.updateOne(
      { _id: requestId },
      { $set: { used: true } }
    );
  }

  async invalidatePreviousCodes(email: string): Promise<void> {
    await this.ensureInitialized();
    await this.authCodesCollection.updateMany(
      { email: email, used: false },
      { $set: { used: true } }
    );
  }

  async invalidatePreviousEmailChangeRequests(userId: string): Promise<void> {
    await this.ensureInitialized();
    await this.authCodesCollection.updateMany(
      { userId: userId, type: 'email_change', used: false },
      { $set: { used: true } }
    );
  }

  async cleanupEmailChangeRequest(userId: string): Promise<void> {
    await this.ensureInitialized();
    await this.authCodesCollection.deleteMany({
      userId: userId,
      type: 'email_change',
    });
  }

  async cleanupExpiredCodes(): Promise<void> {
    await this.ensureInitialized();
    await this.authCodesCollection.deleteMany({
      expiresAt: { $lt: new Date() },
    });
  }

  // Banned IP operations
  async findBannedIp(ipAddress: string): Promise<any> {
    await this.ensureInitialized();
    return this.bannedIpsCollection.findOne({
      ipAddress: ipAddress,
    });
  }

  async insertBannedIps(bannedIpDocuments: any[]): Promise<void> {
    await this.ensureInitialized();
    await this.bannedIpsCollection.insertMany(bannedIpDocuments);
  }

  async deleteBannedIps(ipAddresses: string[]): Promise<void> {
    await this.ensureInitialized();
    await this.bannedIpsCollection.deleteMany({
      ipAddress: { $in: ipAddresses },
    });
  }

  // Cleanup operations
  async orphanUserCats(userId: string): Promise<void> {
    await this.ensureInitialized();
    // This would need to be implemented if you have a cats collection
    // For now, it's a placeholder
  }

  async handleUserNotes(userId: string): Promise<void> {
    await this.ensureInitialized();
    // This would need to be implemented if you have a notes collection
    // For now, it's a placeholder
  }

  private async invalidateNoteCaches(userId: string): Promise<void> {
    // This would need to be implemented if you have cache invalidation logic
    // For now, it's a placeholder
  }

  private createObjectId(id: string): ObjectId {
    return new ObjectId(id);
  }
}
