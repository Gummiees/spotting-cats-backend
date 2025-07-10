/**
 * Avatar utility functions for generating random avatars using DiceBear API
 */

export interface AvatarOptions {
  style?: 'bottts';
  seed?: string;
  backgroundColor?: string;
  radius?: number;
  size?: number;
}

/**
 * Generate a random seed for avatar generation
 * @returns string - A random seed string
 */
function generateRandomSeed(): string {
  const adjectives = [
    'happy',
    'brave',
    'clever',
    'swift',
    'bright',
    'calm',
    'eager',
    'gentle',
    'kind',
    'lively',
    'mighty',
    'noble',
    'quick',
    'radiant',
    'strong',
    'wise',
    'adventurous',
    'creative',
    'energetic',
    'friendly',
    'graceful',
    'honest',
    'imaginative',
    'joyful',
    'peaceful',
    'reliable',
    'sincere',
    'thoughtful',
  ];

  const nouns = [
    'dragon',
    'phoenix',
    'wolf',
    'eagle',
    'lion',
    'tiger',
    'bear',
    'fox',
    'owl',
    'hawk',
    'dolphin',
    'whale',
    'shark',
    'turtle',
    'butterfly',
    'bee',
    'star',
    'moon',
    'sun',
    'cloud',
    'rainbow',
    'ocean',
    'mountain',
    'forest',
    'river',
    'crystal',
    'gem',
    'diamond',
    'emerald',
    'ruby',
    'sapphire',
  ];

  const randomAdjective =
    adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  const randomNumber = Math.floor(Math.random() * 1000);

  return `${randomAdjective}-${randomNoun}-${randomNumber}`;
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
    style = 'adventurer',
    backgroundColor = 'b6e3f4',
    radius = 50,
    size = 200,
  } = options;

  const baseUrl = 'https://api.dicebear.com/7.x';
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
