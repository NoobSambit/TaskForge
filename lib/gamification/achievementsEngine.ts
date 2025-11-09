/**
 * Achievements Engine
 * 
 * Evaluates achievements based on user events and context.
 * Provides idempotent achievement unlocking with XP rewards and event emission.
 */

import { gamificationEvents } from "./events";
import { awardXpForTaskCompletion } from "./awardXp";
import { ACHIEVEMENTS_CONFIG, getAchievementConfig } from "./achievementsConfig";
import type {
  Achievement,
  AchievementContext,
  AchievementEvaluationResult,
  AchievementUnlockResult,
} from "./types";
import UserAchievement from "@/models/UserAchievement";
import ActivityLog from "@/models/ActivityLog";

/**
 * Evaluate achievements for a given event and context
 * 
 * @param event - The event type that triggered evaluation
 * @param context - User and task context data
 * @returns Promise<AchievementEvaluationResult> - Results of evaluation
 */
export async function evaluateAchievements(
  event: AchievementContext["eventType"],
  context: Omit<AchievementContext, "eventType">
): Promise<AchievementEvaluationResult> {
  const fullContext: AchievementContext = {
    ...context,
    eventType: event,
  };

  console.log(`🏆 Evaluating achievements for user ${context.userId} on event: ${event}`);

  // Get user's already unlocked achievements
  const unlockedAchievements = await UserAchievement.find({
    userId: context.userId,
  }).lean();

  const unlockedKeys = new Set(unlockedAchievements.map((ua) => ua.achievementKey));

  const results: AchievementEvaluationResult = {
    newlyUnlocked: [],
    alreadyUnlocked: [],
    notUnlocked: [],
    totalXpRewarded: 0,
  };

  // Evaluate all achievement configurations
  for (const config of ACHIEVEMENTS_CONFIG) {
    // Skip if already unlocked
    if (unlockedKeys.has(config.key)) {
      results.alreadyUnlocked.push(config.key);
      continue;
    }

    try {
      // Check if achievement criteria is met
      const isMet = config.predicate(fullContext);

      if (isMet) {
        console.log(`✅ Achievement criteria met: ${config.key} - ${config.title}`);
        
        // Unlock the achievement
        const unlockResult = await unlockAchievement(context.userId, config);
        
        if (unlockResult) {
          results.newlyUnlocked.push(unlockResult);
          results.totalXpRewarded += unlockResult.xpRewardAmount;

          // Emit achievement unlocked event
          gamificationEvents.emitAchievementUnlocked({
            userId: context.userId,
            achievement: unlockResult,
            timestamp: new Date(),
          });

          console.log(`🎉 Achievement unlocked: ${config.key} - ${config.title} (+${unlockResult.xpRewardAmount} XP)`);
        } else {
          console.log(`⚠️ Failed to unlock achievement: ${config.key}`);
          results.notUnlocked.push(config.key);
        }
      } else {
        results.notUnlocked.push(config.key);
      }
    } catch (error) {
      console.error(`❌ Error evaluating achievement ${config.key}:`, error);
      results.notUnlocked.push(config.key);
    }
  }

  console.log(`📊 Achievement evaluation complete: ${results.newlyUnlocked.length} new, ${results.alreadyUnlocked.length} already unlocked, ${results.notUnlocked.length} not met`);

  return results;
}

/**
 * Unlock a specific achievement for a user
 * 
 * @param userId - User ID
 * @param achievement - Achievement configuration
 * @returns Promise<AchievementUnlockResult | null> - Unlock result or null if failed
 */
export async function unlockAchievement(
  userId: string,
  achievement: Achievement
): Promise<AchievementUnlockResult | null> {
  try {
    // Check if already unlocked (idempotency check)
    const existing = await UserAchievement.findOne({
      userId,
      achievementKey: achievement.key,
    });

    if (existing) {
      console.log(`📋 Achievement ${achievement.key} already unlocked for user ${userId}`);
      return null;
    }

    // Create user achievement record
    const userAchievement = new UserAchievement({
      userId,
      achievementKey: achievement.key,
      unlockedAt: new Date(),
    });

    await userAchievement.save();

    // Apply XP reward if configured
    let xpRewardApplied = false;
    let xpRewardAmount = 0;

    if (achievement.xpReward > 0) {
      try {
        // Create a synthetic task for XP awarding
        const syntheticTaskId = `achievement_${achievement.key}_${Date.now()}`;
        
        await awardXpForTaskCompletion(syntheticTaskId, userId, {
          xpOverride: achievement.xpReward,
          reason: `achievement_unlock:${achievement.key}`,
        });

        xpRewardApplied = true;
        xpRewardAmount = achievement.xpReward;

        console.log(`💰 Awarded ${achievement.xpReward} XP for achievement ${achievement.key}`);
      } catch (xpError) {
        console.error(`❌ Failed to award XP for achievement ${achievement.key}:`, xpError);
        // Still count the achievement as unlocked even if XP awarding fails
      }
    }

    // Create activity log entry
    try {
      await ActivityLog.create({
        userId,
        activityType: "achievement_unlock",
        achievementKey: achievement.key,
        xpGained: xpRewardAmount,
        timestamp: new Date(),
      });
    } catch (logError) {
      console.error(`❌ Failed to create activity log for achievement ${achievement.key}:`, logError);
      // Non-critical error, don't fail the achievement unlock
    }

    const result: AchievementUnlockResult = {
      achievement: {
        key: achievement.key,
        title: achievement.title,
        description: achievement.description,
        rarity: achievement.rarity,
        category: achievement.category,
        xpReward: achievement.xpReward,
        themeUnlock: achievement.themeUnlock,
      },
      unlockedAt: new Date(),
      xpRewardApplied,
      xpRewardAmount,
    };

    return result;
  } catch (error) {
    console.error(`❌ Failed to unlock achievement ${achievement.key} for user ${userId}:`, error);
    return null;
  }
}

/**
 * Check if a user has unlocked a specific achievement
 * 
 * @param userId - User ID
 * @param achievementKey - Achievement key to check
 * @returns Promise<boolean> - True if unlocked
 */
export async function hasAchievement(
  userId: string,
  achievementKey: string
): Promise<boolean> {
  const userAchievement = await UserAchievement.findOne({
    userId,
    achievementKey,
  }).lean();

  return !!userAchievement;
}

/**
 * Get all unlocked achievements for a user
 * 
 * @param userId - User ID
 * @returns Promise<Array<achievementKey & unlockedAt>> - Array of unlocked achievements
 */
export async function getUserAchievements(
  userId: string
): Promise<Array<{ achievementKey: string; unlockedAt: Date }>> {
  const achievements = await UserAchievement.find({
    userId,
  })
    .select("achievementKey unlockedAt")
    .sort({ unlockedAt: -1 })
    .lean();

  return achievements;
}

/**
 * Get achievement stats for a user
 * 
 * @param userId - User ID
 * @returns Promise<Object> - Achievement statistics
 */
export async function getUserAchievementStats(userId: string) {
  const [totalUnlocked, recentUnlocks] = await Promise.all([
    UserAchievement.countDocuments({ userId }),
    UserAchievement.find({ userId })
      .sort({ unlockedAt: -1 })
      .limit(5)
      .select("achievementKey unlockedAt")
      .lean(),
  ]);

  const totalAchievements = ACHIEVEMENTS_CONFIG.length;
  const completionPercentage = Math.round((totalUnlocked / totalAchievements) * 100);

  return {
    totalUnlocked,
    totalAchievements,
    completionPercentage,
    recentUnlocks,
  };
}

/**
 * Evaluate achievements for a specific category only
 * 
 * @param event - Event type
 * @param context - Achievement context
 * @param category - Category to evaluate
 * @returns Promise<AchievementEvaluationResult> - Evaluation results
 */
export async function evaluateAchievementsByCategory(
  event: AchievementContext["eventType"],
  context: Omit<AchievementContext, "eventType">,
  category: string
): Promise<AchievementEvaluationResult> {
  const fullContext: AchievementContext = {
    ...context,
    eventType: event,
  };

  // Get user's already unlocked achievements
  const unlockedAchievements = await UserAchievement.find({
    userId: context.userId,
  }).lean();

  const unlockedKeys = new Set(unlockedAchievements.map((ua) => ua.achievementKey));

  const results: AchievementEvaluationResult = {
    newlyUnlocked: [],
    alreadyUnlocked: [],
    notUnlocked: [],
    totalXpRewarded: 0,
  };

  // Filter achievements by category
  const categoryAchievements = ACHIEVEMENTS_CONFIG.filter(
    (config) => config.category === category
  );

  // Evaluate category-specific achievements
  for (const config of categoryAchievements) {
    // Skip if already unlocked
    if (unlockedKeys.has(config.key)) {
      results.alreadyUnlocked.push(config.key);
      continue;
    }

    try {
      const isMet = config.predicate(fullContext);

      if (isMet) {
        console.log(`✅ Category achievement criteria met: ${config.key} - ${config.title}`);
        
        const unlockResult = await unlockAchievement(context.userId, {
          key: config.key,
          title: config.title,
          description: config.description,
          rarity: config.rarity,
          category: config.category,
          xpReward: config.xpReward,
          themeUnlock: config.themeUnlock,
        });
        
        if (unlockResult) {
          results.newlyUnlocked.push(unlockResult);
          results.totalXpRewarded += unlockResult.xpRewardAmount;

          gamificationEvents.emitAchievementUnlocked({
            userId: context.userId,
            achievement: unlockResult,
            timestamp: new Date(),
          });

          console.log(`🎉 Category achievement unlocked: ${config.key} - ${config.title} (+${unlockResult.xpRewardAmount} XP)`);
        } else {
          results.notUnlocked.push(config.key);
        }
      } else {
        results.notUnlocked.push(config.key);
      }
    } catch (error) {
      console.error(`❌ Error evaluating category achievement ${config.key}:`, error);
      results.notUnlocked.push(config.key);
    }
  }

  return results;
}