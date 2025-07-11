/**
 * Avatar utility functions for generating random avatars using DiceBear API
 */

export interface AvatarOptions {
  style?: string;
  seed?: string;
  backgroundColor?: string;
  radius?: number;
  size?: number;
}

/**
 * Generate an avatar URL based on a username (deterministic)
 * @param username - The username to generate avatar for
 * @param options - Avatar generation options
 * @returns string - The avatar URL
 */
export function generateAvatarForUsername(
  username: string,
  options: AvatarOptions = {}
): string {
  const {
    style = 'bottts',
    backgroundColor = 'b6e3f4',
    radius = 50,
    size = 200,
  } = options;

  const baseUrl = 'https://api.dicebear.com/9.x';
  const url = `${baseUrl}/${style}/svg?seed=${username}&backgroundColor=${backgroundColor}&radius=${radius}&size=${size}`;

  return url;
}

/**
 * Validate if a URL is a valid DiceBear avatar URL
 * @param url - The URL to validate
 * @returns boolean - True if valid DiceBear URL
 */
export function isValidDiceBearUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return (
      urlObj.hostname === 'api.dicebear.com' &&
      urlObj.pathname.startsWith('/7.x/') &&
      urlObj.searchParams.has('seed')
    );
  } catch {
    return false;
  }
}
