/**
 * Environment constants to avoid hardcoded strings throughout the codebase
 */
export const NODE_ENV = {
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production',
} as const;

export type NodeEnv = (typeof NODE_ENV)[keyof typeof NODE_ENV];

/**
 * Helper function to check if current environment matches a specific environment
 */
export const isEnvironment = (
  currentEnv: string,
  targetEnv: NodeEnv
): boolean => {
  return currentEnv === targetEnv;
};

/**
 * Helper functions for common environment checks
 */
export const isDevelopment = (env: string): boolean =>
  isEnvironment(env, NODE_ENV.DEVELOPMENT);
export const isStaging = (env: string): boolean =>
  isEnvironment(env, NODE_ENV.STAGING);
export const isProduction = (env: string): boolean =>
  isEnvironment(env, NODE_ENV.PRODUCTION);
