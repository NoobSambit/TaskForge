/**
 * Feature flag management
 * 
 * Reads environment variables and user privacy preferences to toggle
 * optional gamification features like the leaderboard.
 */

export interface FeatureFlags {
  leaderboard: boolean;
}

/**
 * Get all feature flags status
 * Reads from environment variables
 */
export function getFeatureFlags(): FeatureFlags {
  return {
    leaderboard: process.env.FEATURE_LEADERBOARD === 'true',
  };
}

/**
 * Check if a specific feature is enabled
 * @param feature - The feature name
 * @returns true if the feature is enabled, false otherwise
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  const flags = getFeatureFlags();
  return flags[feature] ?? false;
}

/**
 * Check if user can access a feature
 * Considers both feature flag and user privacy preferences
 */
export function canUserAccessFeature(
  feature: keyof FeatureFlags,
  userPreferences?: {
    leaderboardOptIn?: boolean;
    anonymousMode?: boolean;
  }
): boolean {
  // Feature must be enabled globally
  if (!isFeatureEnabled(feature)) {
    return false;
  }

  // For leaderboard, user must opt in
  if (feature === 'leaderboard' && userPreferences?.leaderboardOptIn === false) {
    return false;
  }

  return true;
}

/**
 * Get feature information including status and description
 */
export function getFeatureInfo(feature: keyof FeatureFlags): {
  name: string;
  enabled: boolean;
  description: string;
} {
  const enabled = isFeatureEnabled(feature);
  
  const info: Record<keyof FeatureFlags, any> = {
    leaderboard: {
      name: 'Leaderboard',
      enabled,
      description: 'Global rankings of users by weekly and monthly XP',
    },
  };

  return info[feature];
}
