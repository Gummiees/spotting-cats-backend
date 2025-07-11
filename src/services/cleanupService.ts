import cron from 'node-cron';
import { userService } from '@/services/userService';
import { config } from '@/config';

export class CleanupService {
  private static instance: CleanupService;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): CleanupService {
    if (!CleanupService.instance) {
      CleanupService.instance = new CleanupService();
    }
    return CleanupService.instance;
  }

  /**
   * Initialize the cleanup service with scheduled tasks
   */
  public initialize(): void {
    if (this.isInitialized) {
      console.log('CleanupService already initialized');
      return;
    }

    console.log('Initializing CleanupService...');

    // Schedule cleanup of old deactivated users (runs daily at 2 AM)
    this.scheduleDeactivatedUserCleanup();

    // Schedule cleanup of expired verification codes (runs every hour)
    this.scheduleExpiredCodesCleanup();

    this.isInitialized = true;
    console.log('CleanupService initialized successfully');
  }

  /**
   * Schedule cleanup of deactivated users older than 30 days
   */
  private scheduleDeactivatedUserCleanup(): void {
    // Run daily at 2:00 AM
    cron.schedule(
      '0 2 * * *',
      async () => {
        console.log('Starting scheduled cleanup of old deactivated users...');
        try {
          await this.cleanupOldDeactivatedUsers(30); // 30 days retention
        } catch (error) {
          console.error('Error during deactivated user cleanup:', error);
        }
      },
      {
        timezone: 'UTC',
      }
    );

    console.log('Scheduled deactivated user cleanup: daily at 2:00 AM UTC');
  }

  /**
   * Schedule cleanup of expired verification codes
   */
  private scheduleExpiredCodesCleanup(): void {
    // Run every hour
    cron.schedule(
      '0 * * * *',
      async () => {
        console.log(
          'Starting scheduled cleanup of expired verification codes...'
        );
        try {
          await userService.cleanupExpiredCodes();
        } catch (error) {
          console.error('Error during expired codes cleanup:', error);
        }
      },
      {
        timezone: 'UTC',
      }
    );

    console.log('Scheduled expired codes cleanup: every hour');
  }

  /**
   * Clean up deactivated users older than the specified number of days
   */
  public async cleanupOldDeactivatedUsers(retentionDays: number = 30): Promise<{
    success: boolean;
    deletedCount: number;
    message: string;
  }> {
    try {
      console.log(
        `Cleaning up deactivated users older than ${retentionDays} days...`
      );

      const result = await userService.cleanupOldDeactivatedUsers(
        retentionDays
      );

      if (result.success) {
        console.log(
          `Successfully deleted ${result.deletedCount} old deactivated users`
        );
      } else {
        console.error(
          'Failed to cleanup old deactivated users:',
          result.message
        );
      }

      return result;
    } catch (error) {
      console.error('Error in cleanupOldDeactivatedUsers:', error);
      return {
        success: false,
        deletedCount: 0,
        message:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Manually trigger cleanup of old deactivated users (for testing/admin use)
   */
  public async manualCleanup(retentionDays: number = 30): Promise<{
    success: boolean;
    deletedCount: number;
    message: string;
  }> {
    console.log(
      `Manual cleanup triggered for users deactivated more than ${retentionDays} days ago`
    );
    return this.cleanupOldDeactivatedUsers(retentionDays);
  }

  /**
   * Get cleanup statistics
   */
  public async getCleanupStats(): Promise<{
    deactivatedUsersCount: number;
    oldDeactivatedUsersCount: number;
    retentionDays: number;
  }> {
    try {
      const stats = await userService.getDeactivatedUserStats(30);
      return {
        deactivatedUsersCount: stats.totalDeactivated,
        oldDeactivatedUsersCount: stats.oldDeactivated,
        retentionDays: 30,
      };
    } catch (error) {
      console.error('Error getting cleanup stats:', error);
      return {
        deactivatedUsersCount: 0,
        oldDeactivatedUsersCount: 0,
        retentionDays: 30,
      };
    }
  }
}

export const cleanupService = CleanupService.getInstance();
