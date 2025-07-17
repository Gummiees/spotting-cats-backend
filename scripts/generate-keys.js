#!/usr/bin/env node

/**
 * Key Generation Script for User Authentication System
 *
 * This script generates the required encryption and hashing keys for:
 * - EMAIL_ENCRYPTION_KEY: 32-byte key for AES-256-GCM email encryption
 * - IP_HASH_KEY: 32-byte key for HMAC-SHA256 IP address hashing
 *
 * Usage: node scripts/generate-keys.js
 */

const crypto = require('crypto');

function generateKey(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

function main() {
  console.log('🔐 Generating Security Keys for User Authentication System\n');

  // Generate email encryption key (32 bytes = 64 hex characters)
  const emailEncryptionKey = generateKey(32);

  // Generate IP hashing key (32 bytes = 64 hex characters)
  const ipHashKey = generateKey(32);

  console.log('✅ Generated Keys Successfully!\n');

  console.log('📧 Email Encryption Key (AES-256-GCM):');
  console.log(`EMAIL_ENCRYPTION_KEY=${emailEncryptionKey}\n`);

  console.log('🌐 IP Hashing Key (HMAC-SHA256):');
  console.log(`IP_HASH_KEY=${ipHashKey}\n`);

  console.log('📝 Add these to your .env file:');
  console.log('=====================================');
  console.log(`EMAIL_ENCRYPTION_KEY=${emailEncryptionKey}`);
  console.log(`IP_HASH_KEY=${ipHashKey}`);
  console.log('=====================================\n');

  console.log('⚠️  Security Notes:');
  console.log(
    '- Keep these keys secure and never commit them to version control'
  );
  console.log(
    '- Use different keys for each environment (dev, staging, production)'
  );
  console.log('- Back up keys securely for disaster recovery');
  console.log('- Rotate keys regularly for enhanced security');
  console.log(
    '- If keys are compromised, regenerate and re-encrypt all data\n'
  );

  console.log('🔒 Key Specifications:');
  console.log('- Email Encryption: AES-256-GCM with 32-byte key');
  console.log('- IP Hashing: HMAC-SHA256 with 32-byte key');
  console.log('- Both keys are cryptographically secure random bytes');
}

if (require.main === module) {
  main();
}

module.exports = { generateKey };
