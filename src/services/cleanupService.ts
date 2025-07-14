import cron from 'node-cron';
import { userService } from './userService';
import { logger } from '@/utils/logger';

export class CleanupService {
  private static instance: CleanupService;
  private isInitialized = false;

  // eslint-disable-next-line @typescript-eslint/no-empty-function
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
      logger.info('CleanupService already initialized');
      return;
    }

    logger.info('Initializing CleanupService...');

    // Schedule cleanup of old deactivated users (runs daily at 2 AM)
    this.scheduleDeactivatedUserCleanup();

    // Schedule cleanup of expired verification codes (runs every hour)
    this.scheduleExpiredCodesCleanup();

    this.isInitialized = true;
    logger.info('CleanupService initialized successfully');
  }

  /**
   * Schedule cleanup of deactivated users older than 30 days
   */
  private scheduleDeactivatedUserCleanup(): void {
    // Run daily at 2:00 AM
    cron.schedule(
      '0 2 * * *',
      async () => {
        logger.info('Starting scheduled cleanup of old deactivated users...');
        try {
          await this.cleanupOldDeactivatedUsers(30); // 30 days retention
        } catch (error) {
          logger.error('Error during deactivated user cleanup:', error);
        }
      },
      {
        timezone: 'UTC',
      }
    );

    logger.info('Scheduled deactivated user cleanup: daily at 2:00 AM UTC');
  }

  /**
   * Schedule cleanup of expired verification codes
   */
  private scheduleExpiredCodesCleanup(): void {
    // Run every hour
    cron.schedule(
      '0 * * * *',
      async () => {
        logger.info(
          'Starting scheduled cleanup of expired verification codes...'
        );
        try {
          await userService.cleanupExpiredCodes();
        } catch (error) {
          logger.error('Error during expired codes cleanup:', error);
        }
      },
      {
        timezone: 'UTC',
      }
    );

    logger.info('Scheduled expired codes cleanup: every hour');
  }

  /**
   * Clean up deactivated users older than the specified number of days
   */
  public async cleanupOldDeactivatedUsers(retentionDays = 30): Promise<{
    success: boolean;
    deletedCount: number;
    message: string;
  }> {
    try {
      logger.info(
        `Cleaning up deactivated users older than ${retentionDays} days...`
      );

      const result = await userService.cleanupOldDeactivatedUsers(
        retentionDays
      );

      if (result.success) {
        logger.info(
          `Successfully deleted ${result.deletedCount} old deactivated users`
        );
      } else {
        logger.error(
          'Failed to cleanup old deactivated users:',
          result.message
        );
      }

      return result;
    } catch (error) {
      logger.error('Error in cleanupOldDeactivatedUsers:', error);
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
  public async manualCleanup(retentionDays = 30): Promise<{
    success: boolean;
    deletedCount: number;
    message: string;
  }> {
    logger.info(
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
      logger.error('Error getting cleanup stats:', error);
      return {
        deactivatedUsersCount: 0,
        oldDeactivatedUsersCount: 0,
        retentionDays: 30,
      };
    }
  }
}

export const cleanupService = CleanupService.getInstance();
