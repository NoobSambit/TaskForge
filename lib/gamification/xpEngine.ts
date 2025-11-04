/**
 * XP Engine - Core gamification XP calculation logic
 * 
 * This module provides a pure function for calculating XP rewards based on
 * task completion. All calculations are deterministic and side-effect free.
 */

import {
  BASE_XP,
  PRIORITY_MULTIPLIERS,
  TAG_BONUSES,
  getStreakMultiplier,
  TIME_BONUSES,
  XP_CAPS,
  ROUND_XP,
  MAX_COMPLETION_AGE_DAYS,
} from "./config";
import {
  TaskData,
  UserContext,
  XpCalculationOptions,
  XpComputation,
  XpRule,
} from "./types";

/**
 * Calculate XP reward for completing a task.
 * 
 * This is a pure function with no side effects. It takes task and user data,
 * applies all relevant rules and multipliers, and returns the final XP amount
 * along with a detailed breakdown of applied rules.
 * 
 * @param task - Normalized task data
 * @param userContext - User context (multipliers, streak info)
 * @param options - Optional calculation parameters
 * @returns XP computation result with delta and applied rules
 * 
 * @example
 * ```typescript
 * const result = calculateXp(
 *   {
 *     priority: 5,
 *     difficulty: 'hard',
 *     tags: ['urgent', 'bug-fix'],
 *     completedAt: new Date(),
 *     createdAt: new Date(Date.now() - 86400000),
 *   },
 *   {
 *     xpMultiplier: 1.0,
 *     currentStreak: 7,
 *     userId: 'user123',
 *   }
 * );
 * console.log(result.delta); // e.g., 123
 * console.log(result.appliedRules); // Detailed breakdown
 * ```
 */
export function calculateXp(
  task: TaskData,
  userContext: UserContext,
  options: XpCalculationOptions = {}
): XpComputation {
  const {
    now = new Date(),
    applyDailyCap = false,
    dailyXpEarned = 0,
    validateAge = true,
  } = options;

  const appliedRules: XpRule[] = [];

  // Edge case: Missing completion date
  if (!task.completedAt) {
    return {
      delta: 0,
      appliedRules: [
        {
          key: "base_xp",
          value: 0,
          description: "No XP awarded - task not completed",
        },
      ],
    };
  }

  // Edge case: Completion in the future (invalid timestamp)
  if (task.completedAt > now) {
    return {
      delta: 0,
      appliedRules: [
        {
          key: "base_xp",
          value: 0,
          description: "No XP awarded - invalid future completion date",
        },
      ],
    };
  }

  // Edge case: Completion too old (prevents backdating)
  if (validateAge) {
    const ageInDays =
      (now.getTime() - task.completedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (ageInDays > MAX_COMPLETION_AGE_DAYS) {
      return {
        delta: 0,
        appliedRules: [
          {
            key: "base_xp",
            value: 0,
            description: `No XP awarded - completion too old (${Math.floor(ageInDays)} days)`,
          },
        ],
      };
    }
  }

  // Step 1: Start with base XP from difficulty
  let xp = BASE_XP[task.difficulty] || BASE_XP.medium;
  appliedRules.push({
    key: "base_xp",
    value: xp,
    description: `Base XP for ${task.difficulty} difficulty`,
  });

  // Step 2: Apply priority multiplier
  const priorityMultiplier =
    PRIORITY_MULTIPLIERS[task.priority] || PRIORITY_MULTIPLIERS[3];
  if (priorityMultiplier !== 1.0) {
    const beforePriority = xp;
    xp *= priorityMultiplier;
    appliedRules.push({
      key: "priority_multiplier",
      value: priorityMultiplier,
      description: `Priority ${task.priority} multiplier (${beforePriority} × ${priorityMultiplier} = ${xp.toFixed(1)})`,
    });
  }

  // Step 3: Add tag bonuses
  let totalTagBonus = 0;
  const matchedTags: string[] = [];
  for (const tag of task.tags) {
    const tagLower = tag.toLowerCase();
    if (TAG_BONUSES[tagLower]) {
      totalTagBonus += TAG_BONUSES[tagLower];
      matchedTags.push(tagLower);
    }
  }
  if (totalTagBonus > 0) {
    xp += totalTagBonus;
    appliedRules.push({
      key: "tag_bonus",
      value: totalTagBonus,
      description: `Tag bonuses: ${matchedTags.join(", ")} (+${totalTagBonus} XP)`,
    });
  }

  // Step 4: Apply streak multiplier
  const streakMultiplier = getStreakMultiplier(userContext.currentStreak);
  if (streakMultiplier !== 1.0) {
    const beforeStreak = xp;
    xp *= streakMultiplier;
    appliedRules.push({
      key: "streak_multiplier",
      value: streakMultiplier,
      description: `${userContext.currentStreak}-day streak multiplier (${beforeStreak.toFixed(1)} × ${streakMultiplier} = ${xp.toFixed(1)})`,
    });
  }

  // Step 5: Apply time-based adjustments
  applyTimeBasedBonuses(task, now, appliedRules, (bonus) => {
    xp += bonus;
  });

  // Step 6: Apply user multiplier
  if (userContext.xpMultiplier !== 1.0) {
    const beforeUser = xp;
    xp *= userContext.xpMultiplier;
    appliedRules.push({
      key: "user_multiplier",
      value: userContext.xpMultiplier,
      description: `User multiplier (${beforeUser.toFixed(1)} × ${userContext.xpMultiplier} = ${xp.toFixed(1)})`,
    });
  }

  // Step 7: Apply caps
  if (xp < XP_CAPS.MIN_XP_PER_TASK) {
    appliedRules.push({
      key: "min_cap",
      value: XP_CAPS.MIN_XP_PER_TASK,
      description: `Minimum XP cap applied (${xp.toFixed(1)} → ${XP_CAPS.MIN_XP_PER_TASK})`,
    });
    xp = XP_CAPS.MIN_XP_PER_TASK;
  }

  if (xp > XP_CAPS.MAX_XP_PER_TASK) {
    appliedRules.push({
      key: "max_cap",
      value: XP_CAPS.MAX_XP_PER_TASK,
      description: `Maximum XP cap applied (${xp.toFixed(1)} → ${XP_CAPS.MAX_XP_PER_TASK})`,
    });
    xp = XP_CAPS.MAX_XP_PER_TASK;
  }

  // Apply daily cap if requested
  if (applyDailyCap) {
    const availableDailyXp = XP_CAPS.MAX_DAILY_XP - dailyXpEarned;
    if (availableDailyXp <= 0) {
      return {
        delta: 0,
        appliedRules: [
          ...appliedRules,
          {
            key: "max_cap",
            value: 0,
            description: "Daily XP cap reached - no XP awarded",
          },
        ],
      };
    }
    if (xp > availableDailyXp) {
      appliedRules.push({
        key: "max_cap",
        value: availableDailyXp,
        description: `Daily XP cap applied (${xp.toFixed(1)} → ${availableDailyXp})`,
      });
      xp = availableDailyXp;
    }
  }

  // Step 8: Apply rounding
  if (ROUND_XP) {
    const beforeRound = xp;
    xp = Math.round(xp);
    if (beforeRound !== xp) {
      appliedRules.push({
        key: "rounding",
        value: xp,
        description: `Rounded (${beforeRound.toFixed(2)} → ${xp})`,
      });
    }
  }

  return {
    delta: xp,
    appliedRules,
  };
}

/**
 * Apply time-based bonuses and penalties.
 * This includes early/late completion, time-of-day bonuses, and weekend bonuses.
 */
function applyTimeBasedBonuses(
  task: TaskData,
  now: Date,
  appliedRules: XpRule[],
  addXp: (bonus: number) => void
): void {
  // Early/late completion relative to due date
  if (task.dueDate) {
    const completedAt = task.completedAt;
    if (completedAt < task.dueDate) {
      // Completed early
      addXp(TIME_BONUSES.EARLY_COMPLETION_BONUS);
      appliedRules.push({
        key: "early_completion",
        value: TIME_BONUSES.EARLY_COMPLETION_BONUS,
        description: `Early completion bonus (+${TIME_BONUSES.EARLY_COMPLETION_BONUS} XP)`,
      });
    } else if (completedAt > task.dueDate) {
      // Completed late
      addXp(TIME_BONUSES.LATE_COMPLETION_PENALTY);
      appliedRules.push({
        key: "late_completion",
        value: TIME_BONUSES.LATE_COMPLETION_PENALTY,
        description: `Late completion penalty (${TIME_BONUSES.LATE_COMPLETION_PENALTY} XP)`,
      });
    }
  }

  // Time of day bonuses
  const hour = task.completedAt.getHours();
  if (hour >= 5 && hour < 9) {
    // Early bird (5 AM - 9 AM)
    addXp(TIME_BONUSES.EARLY_BIRD_BONUS);
    appliedRules.push({
      key: "early_bird",
      value: TIME_BONUSES.EARLY_BIRD_BONUS,
      description: `Early bird bonus (+${TIME_BONUSES.EARLY_BIRD_BONUS} XP)`,
    });
  } else if (hour >= 22 || hour < 2) {
    // Night owl (10 PM - 2 AM)
    addXp(TIME_BONUSES.NIGHT_OWL_BONUS);
    appliedRules.push({
      key: "night_owl",
      value: TIME_BONUSES.NIGHT_OWL_BONUS,
      description: `Night owl bonus (+${TIME_BONUSES.NIGHT_OWL_BONUS} XP)`,
    });
  }

  // Weekend bonus
  const dayOfWeek = task.completedAt.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    // Sunday or Saturday
    addXp(TIME_BONUSES.WEEKEND_BONUS);
    appliedRules.push({
      key: "weekend_bonus",
      value: TIME_BONUSES.WEEKEND_BONUS,
      description: `Weekend bonus (+${TIME_BONUSES.WEEKEND_BONUS} XP)`,
    });
  }
}

/**
 * Helper function to create TaskData from various input formats.
 * Useful for adapting database models to the engine's expected format.
 */
export function normalizeTaskData(task: {
  priority: number;
  difficulty: string;
  tags: string[];
  completedAt?: Date | null;
  createdAt: Date;
  dueDate?: Date | null;
}): TaskData {
  return {
    priority: task.priority,
    difficulty: task.difficulty as any,
    tags: task.tags || [],
    completedAt: task.completedAt || new Date(),
    createdAt: task.createdAt,
    dueDate: task.dueDate,
  };
}
