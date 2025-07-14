/* eslint-disable no-console */
import { config } from '@/config';

class Logger {
  private getLogLevel(): number {
    switch (config.nodeEnv) {
      case 'production':
        return 1; // WARN
      case 'development':
        return 2; // INFO
      case 'test':
        return 0; // ERROR
      default:
        return 2; // INFO
    }
  }

  private shouldLog(level: number): boolean {
    return level <= this.getLogLevel();
  }

  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog(0)) {
      // ERROR
      console.error(`[ERROR] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog(1)) {
      // WARN
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog(2)) {
      // INFO
      console.info(`[INFO] ${message}`, ...args);
    }
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog(3)) {
      // DEBUG
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }
}

export const logger = new Logger();
