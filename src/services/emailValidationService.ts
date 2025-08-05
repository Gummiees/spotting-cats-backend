import MailChecker from 'mailchecker';

export class EmailValidationService {
  /**
   * Validates email format and checks if it's not a disposable/temporary email
   * @param email - The email address to validate
   * @returns Object with validation result and message
   */
  static validateEmail(email: string): {
    valid: boolean;
    message: string;
    errorCode?: string;
  } {
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        valid: false,
        message: 'Invalid email format',
        errorCode: 'INVALID_EMAIL_FORMAT',
      };
    }

    try {
      // Check if email is a disposable/temporary email
      if (!MailChecker.isValid(email)) {
        return {
          valid: false,
          message:
            'Disposable/temporary email addresses are not allowed. Please use a valid email address.',
          errorCode: 'DISPOSABLE_EMAIL',
        };
      }

      return {
        valid: true,
        message: 'Email validation passed',
      };
    } catch (error) {
      console.error('Error validating email with mailchecker:', error);
      // If mailchecker fails, we'll still allow the email but log the error
      return {
        valid: true,
        message: 'Email validation passed',
      };
    }
  }

  /**
   * Validates email format and checks if it's not disposable, returns normalized email
   * @param email - The email address to validate
   * @returns Object with validation result and normalized email
   */
  static validateEmailFormat(email: string): {
    valid: boolean;
    message: string;
    normalizedEmail?: string;
    errorCode?: string;
  } {
    // Use the consolidated validateEmail method
    const validation = this.validateEmail(email);
    if (!validation.valid) {
      return {
        valid: false,
        message: validation.message,
        errorCode: validation.errorCode,
      };
    }

    // Normalize email (lowercase and trim)
    const normalizedEmail = email.toLowerCase().trim();

    return {
      valid: true,
      message: 'Email validation passed',
      normalizedEmail,
    };
  }

  /**
   * Validates if an email is suitable for updates (not undefined, null, or empty)
   * @param email - The email address to validate
   * @returns Type guard indicating if email is valid for updates
   */
  static isValidEmailForUpdate(email: string | undefined): email is string {
    return email !== undefined && email !== null && email.trim() !== '';
  }

  /**
   * Normalizes an email address (lowercase and trim)
   * @param email - The email address to normalize
   * @returns Normalized email address
   */
  static normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }
}
