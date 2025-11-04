import { describe, it, expect } from "vitest";
import { calculateXp } from "../../gamification/xpEngine";
import type { TaskData, UserContext } from "../../gamification/types";
import {
  BASE_XP,
  PRIORITY_MULTIPLIERS,
  TAG_BONUSES,
  TIME_BONUSES,
  XP_CAPS,
} from "../../gamification/config";

/**
 * Test suite for the XP Engine
 * 
 * These tests cover all major scenarios and edge cases for XP calculation,
 * ensuring the engine produces expected results and handles invalid inputs gracefully.
 */

// Common test reference date (all tests use this as "now")
const NOW = new Date("2024-01-15T12:00:00Z");

describe("XP Engine - Basic Calculations", () => {
  const baseUser: UserContext = {
    userId: "test-user",
    xpMultiplier: 1.0,
    currentStreak: 0,
  };

  it("should calculate base XP for easy task", () => {
    const task: TaskData = {
      priority: 3,
      difficulty: "easy",
      tags: [],
      completedAt: new Date("2024-01-15T10:00:00Z"),
      createdAt: new Date("2024-01-15T09:00:00Z"),
    };

    const result = calculateXp(task, baseUser, { now: NOW });

    expect(result.delta).toBe(BASE_XP.easy);
    expect(result.appliedRules).toHaveLength(1);
    expect(result.appliedRules[0].key).toBe("base_xp");
    expect(result.appliedRules[0].value).toBe(BASE_XP.easy);
  });

  it("should calculate base XP for medium task", () => {
    const task: TaskData = {
      priority: 3,
      difficulty: "medium",
      tags: [],
      completedAt: new Date("2024-01-15T10:00:00Z"),
      createdAt: new Date("2024-01-15T09:00:00Z"),
    };

    const result = calculateXp(task, baseUser, { now: NOW });

    expect(result.delta).toBe(BASE_XP.medium);
  });

  it("should calculate base XP for hard task", () => {
    const task: TaskData = {
      priority: 3,
      difficulty: "hard",
      tags: [],
      completedAt: new Date("2024-01-15T10:00:00Z"),
      createdAt: new Date("2024-01-15T09:00:00Z"),
    };

    const result = calculateXp(task, baseUser, { now: NOW });

    expect(result.delta).toBe(BASE_XP.hard);
  });
});

describe("XP Engine - Priority Multipliers", () => {
  const baseUser: UserContext = {
    userId: "test-user",
    xpMultiplier: 1.0,
    currentStreak: 0,
  };

  it("should apply low priority penalty (priority 1)", () => {
    const task: TaskData = {
      priority: 1,
      difficulty: "medium",
      tags: [],
      completedAt: new Date("2024-01-15T10:00:00Z"),
      createdAt: new Date("2024-01-15T09:00:00Z"),
    };

    const result = calculateXp(task, baseUser, { now: NOW });

    expect(result.delta).toBe(
      Math.round(BASE_XP.medium * PRIORITY_MULTIPLIERS[1])
    );
    const priorityRule = result.appliedRules.find(
      (r) => r.key === "priority_multiplier"
    );
    expect(priorityRule).toBeDefined();
    expect(priorityRule?.value).toBe(PRIORITY_MULTIPLIERS[1]);
  });

  it("should apply high priority bonus (priority 5)", () => {
    const task: TaskData = {
      priority: 5,
      difficulty: "medium",
      tags: [],
      completedAt: new Date("2024-01-15T10:00:00Z"),
      createdAt: new Date("2024-01-15T09:00:00Z"),
    };

    const result = calculateXp(task, baseUser, { now: NOW });

    expect(result.delta).toBe(
      Math.round(BASE_XP.medium * PRIORITY_MULTIPLIERS[5])
    );
  });

  it("should not apply multiplier for default priority (priority 3)", () => {
    const task: TaskData = {
      priority: 3,
      difficulty: "medium",
      tags: [],
      completedAt: new Date("2024-01-15T10:00:00Z"),
      createdAt: new Date("2024-01-15T09:00:00Z"),
    };

    const result = calculateXp(task, baseUser, { now: NOW });

    expect(result.delta).toBe(BASE_XP.medium);
    const priorityRule = result.appliedRules.find(
      (r) => r.key === "priority_multiplier"
    );
    expect(priorityRule).toBeUndefined();
  });

  it("should calculate high-priority rush task correctly", () => {
    // High-priority (5) + hard difficulty = significant XP
    const task: TaskData = {
      priority: 5,
      difficulty: "hard",
      tags: [],
      completedAt: new Date("2024-01-15T10:00:00Z"),
      createdAt: new Date("2024-01-15T09:00:00Z"),
    };

    const result = calculateXp(task, baseUser, { now: NOW });

    const expectedXp = Math.round(BASE_XP.hard * PRIORITY_MULTIPLIERS[5]);
    expect(result.delta).toBe(expectedXp);
    expect(result.appliedRules).toHaveLength(2); // base_xp + priority_multiplier
  });
});

describe("XP Engine - Tag Bonuses", () => {
  const baseUser: UserContext = {
    userId: "test-user",
    xpMultiplier: 1.0,
    currentStreak: 0,
  };

  it("should add tag bonus for single tag", () => {
    const task: TaskData = {
      priority: 3,
      difficulty: "medium",
      tags: ["urgent"],
      completedAt: new Date("2024-01-15T10:00:00Z"),
      createdAt: new Date("2024-01-15T09:00:00Z"),
    };

    const result = calculateXp(task, baseUser, { now: NOW });

    expect(result.delta).toBe(BASE_XP.medium + TAG_BONUSES.urgent);
    const tagRule = result.appliedRules.find((r) => r.key === "tag_bonus");
    expect(tagRule).toBeDefined();
    expect(tagRule?.value).toBe(TAG_BONUSES.urgent);
  });

  it("should stack multiple tag bonuses", () => {
    const task: TaskData = {
      priority: 3,
      difficulty: "medium",
      tags: ["urgent", "bug-fix", "testing"],
      completedAt: new Date("2024-01-15T10:00:00Z"),
      createdAt: new Date("2024-01-15T09:00:00Z"),
    };

    const result = calculateXp(task, baseUser, { now: NOW });

    const totalTagBonus =
      TAG_BONUSES.urgent + TAG_BONUSES["bug-fix"] + TAG_BONUSES.testing;
    expect(result.delta).toBe(BASE_XP.medium + totalTagBonus);
    const tagRule = result.appliedRules.find((r) => r.key === "tag_bonus");
    expect(tagRule?.value).toBe(totalTagBonus);
  });

  it("should ignore unknown tags", () => {
    const task: TaskData = {
      priority: 3,
      difficulty: "medium",
      tags: ["unknown-tag", "another-unknown"],
      completedAt: new Date("2024-01-15T10:00:00Z"),
      createdAt: new Date("2024-01-15T09:00:00Z"),
    };

    const result = calculateXp(task, baseUser, { now: NOW });

    expect(result.delta).toBe(BASE_XP.medium);
    const tagRule = result.appliedRules.find((r) => r.key === "tag_bonus");
    expect(tagRule).toBeUndefined();
  });

  it("should handle tag case insensitively", () => {
    const task: TaskData = {
      priority: 3,
      difficulty: "medium",
      tags: ["URGENT", "Bug-Fix"],
      completedAt: new Date("2024-01-15T10:00:00Z"),
      createdAt: new Date("2024-01-15T09:00:00Z"),
    };

    const result = calculateXp(task, baseUser, { now: NOW });

    const totalTagBonus = TAG_BONUSES.urgent + TAG_BONUSES["bug-fix"];
    expect(result.delta).toBe(BASE_XP.medium + totalTagBonus);
  });
});

describe("XP Engine - Streak Multipliers", () => {
  it("should not apply multiplier for short streak (0-2 days)", () => {
    const task: TaskData = {
      priority: 3,
      difficulty: "medium",
      tags: [],
      completedAt: new Date("2024-01-15T10:00:00Z"),
      createdAt: new Date("2024-01-15T09:00:00Z"),
    };

    const user: UserContext = {
      userId: "test-user",
      xpMultiplier: 1.0,
      currentStreak: 2,
    };

    const result = calculateXp(task, user, { now: NOW });

    expect(result.delta).toBe(BASE_XP.medium);
    const streakRule = result.appliedRules.find(
      (r) => r.key === "streak_multiplier"
    );
    expect(streakRule).toBeUndefined();
  });

  it("should apply 1.1x multiplier for 3-6 day streak", () => {
    const task: TaskData = {
      priority: 3,
      difficulty: "medium",
      tags: [],
      completedAt: new Date("2024-01-15T10:00:00Z"),
      createdAt: new Date("2024-01-15T09:00:00Z"),
    };

    const user: UserContext = {
      userId: "test-user",
      xpMultiplier: 1.0,
      currentStreak: 5,
    };

    const result = calculateXp(task, user, { now: NOW });

    expect(result.delta).toBe(Math.round(BASE_XP.medium * 1.1));
    const streakRule = result.appliedRules.find(
      (r) => r.key === "streak_multiplier"
    );
    expect(streakRule?.value).toBe(1.1);
  });

  it("should apply 1.2x multiplier for 7-13 day streak", () => {
    const task: TaskData = {
      priority: 3,
      difficulty: "medium",
      tags: [],
      completedAt: new Date("2024-01-15T10:00:00Z"),
      createdAt: new Date("2024-01-15T09:00:00Z"),
    };

    const user: UserContext = {
      userId: "test-user",
      xpMultiplier: 1.0,
      currentStreak: 10,
    };

    const result = calculateXp(task, user, { now: NOW });

    expect(result.delta).toBe(Math.round(BASE_XP.medium * 1.2));
  });

  it("should apply 1.3x multiplier for 14-29 day streak", () => {
    const task: TaskData = {
      priority: 3,
      difficulty: "medium",
      tags: [],
      completedAt: new Date("2024-01-15T10:00:00Z"),
      createdAt: new Date("2024-01-15T09:00:00Z"),
    };

    const user: UserContext = {
      userId: "test-user",
      xpMultiplier: 1.0,
      currentStreak: 20,
    };

    const result = calculateXp(task, user, { now: NOW });

    expect(result.delta).toBe(Math.round(BASE_XP.medium * 1.3));
  });

  it("should apply 1.5x multiplier for 30+ day streak", () => {
    const task: TaskData = {
      priority: 3,
      difficulty: "medium",
      tags: [],
      completedAt: new Date("2024-01-15T10:00:00Z"),
      createdAt: new Date("2024-01-15T09:00:00Z"),
    };

    const user: UserContext = {
      userId: "test-user",
      xpMultiplier: 1.0,
      currentStreak: 45,
    };

    const result = calculateXp(task, user, { now: NOW });

    expect(result.delta).toBe(Math.round(BASE_XP.medium * 1.5));
  });
});

describe("XP Engine - Time-Based Bonuses", () => {
  const baseUser: UserContext = {
    userId: "test-user",
    xpMultiplier: 1.0,
    currentStreak: 0,
  };

  it("should award early completion bonus", () => {
    const task: TaskData = {
      priority: 3,
      difficulty: "medium",
      tags: [],
      completedAt: new Date("2024-01-10T10:00:00Z"),
      createdAt: new Date("2024-01-08T09:00:00Z"),
      dueDate: new Date("2024-01-15T10:00:00Z"), // Due 5 days later
    };

    const result = calculateXp(task, baseUser, { now: NOW });

    expect(result.delta).toBe(
      BASE_XP.medium + TIME_BONUSES.EARLY_COMPLETION_BONUS
    );
    const earlyRule = result.appliedRules.find(
      (r) => r.key === "early_completion"
    );
    expect(earlyRule).toBeDefined();
    expect(earlyRule?.value).toBe(TIME_BONUSES.EARLY_COMPLETION_BONUS);
  });

  it("should apply late completion penalty", () => {
    const task: TaskData = {
      priority: 3,
      difficulty: "medium",
      tags: [],
      completedAt: new Date("2024-01-12T10:00:00Z"), // Friday, no weekend bonus
      createdAt: new Date("2024-01-08T09:00:00Z"),
      dueDate: new Date("2024-01-10T10:00:00Z"), // Completed 2 days late
    };

    const result = calculateXp(task, baseUser, { now: NOW });

    expect(result.delta).toBe(
      BASE_XP.medium + TIME_BONUSES.LATE_COMPLETION_PENALTY
    );
    const lateRule = result.appliedRules.find(
      (r) => r.key === "late_completion"
    );
    expect(lateRule).toBeDefined();
    expect(lateRule?.value).toBe(TIME_BONUSES.LATE_COMPLETION_PENALTY);
  });

  it("should award early bird bonus (5 AM - 9 AM)", () => {
    const task: TaskData = {
      priority: 3,
      difficulty: "medium",
      tags: [],
      completedAt: new Date("2024-01-15T07:30:00Z"), // 7:30 AM
      createdAt: new Date("2024-01-15T06:00:00Z"),
    };

    const result = calculateXp(task, baseUser, { now: NOW });

    expect(result.delta).toBe(BASE_XP.medium + TIME_BONUSES.EARLY_BIRD_BONUS);
    const earlyBirdRule = result.appliedRules.find((r) => r.key === "early_bird");
    expect(earlyBirdRule).toBeDefined();
  });

  it("should award night owl bonus (10 PM - 2 AM)", () => {
    const task: TaskData = {
      priority: 3,
      difficulty: "medium",
      tags: [],
      completedAt: new Date("2024-01-15T01:30:00Z"), // 1:30 AM
      createdAt: new Date("2024-01-14T20:00:00Z"),
    };

    const result = calculateXp(task, baseUser, { now: NOW });

    expect(result.delta).toBe(BASE_XP.medium + TIME_BONUSES.NIGHT_OWL_BONUS);
    const nightOwlRule = result.appliedRules.find((r) => r.key === "night_owl");
    expect(nightOwlRule).toBeDefined();
  });

  it("should award weekend bonus (Saturday)", () => {
    const task: TaskData = {
      priority: 3,
      difficulty: "medium",
      tags: [],
      completedAt: new Date("2024-01-13T10:00:00Z"), // Saturday
      createdAt: new Date("2024-01-13T09:00:00Z"),
    };

    const result = calculateXp(task, baseUser, { now: NOW });

    expect(result.delta).toBe(BASE_XP.medium + TIME_BONUSES.WEEKEND_BONUS);
    const weekendRule = result.appliedRules.find((r) => r.key === "weekend_bonus");
    expect(weekendRule).toBeDefined();
  });

  it("should award weekend bonus (Sunday)", () => {
    const task: TaskData = {
      priority: 3,
      difficulty: "medium",
      tags: [],
      completedAt: new Date("2024-01-14T10:00:00Z"), // Sunday
      createdAt: new Date("2024-01-14T09:00:00Z"),
    };

    const result = calculateXp(task, baseUser, { now: NOW });

    expect(result.delta).toBe(BASE_XP.medium + TIME_BONUSES.WEEKEND_BONUS);
  });
});

describe("XP Engine - User Multipliers", () => {
  it("should apply user XP multiplier", () => {
    const task: TaskData = {
      priority: 3,
      difficulty: "medium",
      tags: [],
      completedAt: new Date("2024-01-15T10:00:00Z"),
      createdAt: new Date("2024-01-15T09:00:00Z"),
    };

    const user: UserContext = {
      userId: "test-user",
      xpMultiplier: 1.5,
      currentStreak: 0,
    };

    const result = calculateXp(task, user, { now: NOW });

    expect(result.delta).toBe(Math.round(BASE_XP.medium * 1.5));
    const userRule = result.appliedRules.find((r) => r.key === "user_multiplier");
    expect(userRule).toBeDefined();
    expect(userRule?.value).toBe(1.5);
  });

  it("should combine user multiplier with other bonuses", () => {
    const task: TaskData = {
      priority: 5,
      difficulty: "hard",
      tags: ["urgent"],
      completedAt: new Date("2024-01-15T10:00:00Z"),
      createdAt: new Date("2024-01-15T09:00:00Z"),
    };

    const user: UserContext = {
      userId: "test-user",
      xpMultiplier: 2.0,
      currentStreak: 7,
    };

    const result = calculateXp(task, user, { now: NOW });

    // Base: 50 (hard)
    // Priority: 50 * 1.5 = 75
    // Tag: 75 + 15 = 90
    // Streak: 90 * 1.2 = 108
    // User: 108 * 2.0 = 216
    // But capped at MAX_XP_PER_TASK = 200
    expect(result.delta).toBe(200);
    expect(result.delta).toBeLessThanOrEqual(XP_CAPS.MAX_XP_PER_TASK);
  });
});

describe("XP Engine - XP Caps", () => {
  const baseUser: UserContext = {
    userId: "test-user",
    xpMultiplier: 1.0,
    currentStreak: 0,
  };

  it("should apply minimum XP cap", () => {
    // Create scenario where XP would drop below minimum
    // Easy (10) * priority 1 (0.8) = 8, late penalty (-5) = 3
    // This should trigger min cap of 5
    const task: TaskData = {
      priority: 1,
      difficulty: "easy",
      tags: [],
      completedAt: new Date("2024-01-12T10:00:00Z"), // Friday, no weekend bonus
      createdAt: new Date("2024-01-08T09:00:00Z"),
      dueDate: new Date("2024-01-10T10:00:00Z"), // Late completion
    };

    const result = calculateXp(task, baseUser, { now: NOW });

    // Should be capped at minimum
    expect(result.delta).toBe(XP_CAPS.MIN_XP_PER_TASK);
    const minCapRule = result.appliedRules.find((r) => r.key === "min_cap");
    expect(minCapRule).toBeDefined();
    expect(minCapRule?.value).toBe(XP_CAPS.MIN_XP_PER_TASK);
  });

  it("should apply maximum XP cap", () => {
    const task: TaskData = {
      priority: 5,
      difficulty: "hard",
      tags: ["urgent", "bug-fix", "deployment"],
      completedAt: new Date("2024-01-15T10:00:00Z"),
      createdAt: new Date("2024-01-15T09:00:00Z"),
    };

    const user: UserContext = {
      userId: "test-user",
      xpMultiplier: 5.0, // Very high multiplier
      currentStreak: 50,
    };

    const result = calculateXp(task, user, { now: NOW });

    expect(result.delta).toBeLessThanOrEqual(XP_CAPS.MAX_XP_PER_TASK);
    const maxCapRule = result.appliedRules.find((r) => r.key === "max_cap");
    expect(maxCapRule).toBeDefined();
  });

  it("should apply daily XP cap when enabled", () => {
    const task: TaskData = {
      priority: 3,
      difficulty: "medium",
      tags: [],
      completedAt: new Date("2024-01-15T10:00:00Z"),
      createdAt: new Date("2024-01-15T09:00:00Z"),
    };

    const result = calculateXp(task, baseUser, {
      now: NOW,
      applyDailyCap: true,
      dailyXpEarned: 990, // Almost at daily cap
    });

    expect(result.delta).toBeLessThanOrEqual(10); // Only 10 XP left
  });

  it("should return 0 XP when daily cap is reached", () => {
    const task: TaskData = {
      priority: 3,
      difficulty: "medium",
      tags: [],
      completedAt: new Date("2024-01-15T10:00:00Z"),
      createdAt: new Date("2024-01-15T09:00:00Z"),
    };

    const result = calculateXp(task, baseUser, {
      now: NOW,
      applyDailyCap: true,
      dailyXpEarned: 1000, // At daily cap
    });

    expect(result.delta).toBe(0);
  });
});

describe("XP Engine - Edge Cases", () => {
  const baseUser: UserContext = {
    userId: "test-user",
    xpMultiplier: 1.0,
    currentStreak: 0,
  };

  it("should return 0 XP for task without completion date", () => {
    const task: TaskData = {
      priority: 3,
      difficulty: "medium",
      tags: [],
      completedAt: null as any,
      createdAt: new Date("2024-01-15T09:00:00Z"),
    };

    const result = calculateXp(task, baseUser, { now: NOW });

    expect(result.delta).toBe(0);
    expect(result.appliedRules[0].description).toContain("not completed");
  });

  it("should return 0 XP for future completion date", () => {
    const now = new Date("2024-01-15T10:00:00Z");
    const task: TaskData = {
      priority: 3,
      difficulty: "medium",
      tags: [],
      completedAt: new Date("2024-01-20T10:00:00Z"), // Future
      createdAt: new Date("2024-01-15T09:00:00Z"),
    };

    const result = calculateXp(task, baseUser, { now });

    expect(result.delta).toBe(0);
    expect(result.appliedRules[0].description).toContain("future");
  });

  it("should return 0 XP for very old completion (> 7 days)", () => {
    const now = new Date("2024-01-20T10:00:00Z");
    const task: TaskData = {
      priority: 3,
      difficulty: "medium",
      tags: [],
      completedAt: new Date("2024-01-10T10:00:00Z"), // 10 days ago
      createdAt: new Date("2024-01-09T09:00:00Z"),
    };

    const result = calculateXp(task, baseUser, { now, validateAge: true });

    expect(result.delta).toBe(0);
    expect(result.appliedRules[0].description).toContain("too old");
  });

  it("should allow old completion when validation is disabled", () => {
    const now = new Date("2024-01-20T10:00:00Z");
    const task: TaskData = {
      priority: 3,
      difficulty: "medium",
      tags: [],
      completedAt: new Date("2024-01-10T10:00:00Z"), // 10 days ago
      createdAt: new Date("2024-01-09T09:00:00Z"),
    };

    const result = calculateXp(task, baseUser, { now, validateAge: false });

    expect(result.delta).toBe(BASE_XP.medium);
  });

  it("should handle empty tags array", () => {
    const task: TaskData = {
      priority: 3,
      difficulty: "medium",
      tags: [],
      completedAt: new Date("2024-01-15T10:00:00Z"),
      createdAt: new Date("2024-01-15T09:00:00Z"),
    };

    const result = calculateXp(task, baseUser, { now: NOW });

    expect(result.delta).toBe(BASE_XP.medium);
  });

  it("should handle task without due date", () => {
    const task: TaskData = {
      priority: 3,
      difficulty: "medium",
      tags: [],
      completedAt: new Date("2024-01-15T10:00:00Z"),
      createdAt: new Date("2024-01-15T09:00:00Z"),
      dueDate: null,
    };

    const result = calculateXp(task, baseUser, { now: NOW });

    expect(result.delta).toBe(BASE_XP.medium);
    // No early/late completion rules should be applied
    const earlyRule = result.appliedRules.find((r) => r.key === "early_completion");
    const lateRule = result.appliedRules.find((r) => r.key === "late_completion");
    expect(earlyRule).toBeUndefined();
    expect(lateRule).toBeUndefined();
  });
});

describe("XP Engine - Complex Scenarios", () => {
  it("should handle stacked bonuses correctly (high-priority + early + tags + streak)", () => {
    const task: TaskData = {
      priority: 5,
      difficulty: "hard",
      tags: ["urgent", "bug-fix", "deployment"],
      completedAt: new Date("2024-01-13T07:00:00Z"), // Saturday + early bird
      createdAt: new Date("2024-01-08T09:00:00Z"),
      dueDate: new Date("2024-01-15T10:00:00Z"), // Early completion
    };

    const user: UserContext = {
      userId: "test-user",
      xpMultiplier: 1.2,
      currentStreak: 15,
    };

    const result = calculateXp(task, user, { now: NOW });

    // This should be a high XP reward with multiple rules applied
    expect(result.delta).toBeGreaterThan(100);
    expect(result.appliedRules.length).toBeGreaterThan(5);

    // Verify all expected rules are present
    expect(result.appliedRules.some((r) => r.key === "base_xp")).toBe(true);
    expect(result.appliedRules.some((r) => r.key === "priority_multiplier")).toBe(true);
    expect(result.appliedRules.some((r) => r.key === "tag_bonus")).toBe(true);
    expect(result.appliedRules.some((r) => r.key === "streak_multiplier")).toBe(true);
    expect(result.appliedRules.some((r) => r.key === "early_completion")).toBe(true);
    expect(result.appliedRules.some((r) => r.key === "early_bird")).toBe(true);
    expect(result.appliedRules.some((r) => r.key === "weekend_bonus")).toBe(true);
    expect(result.appliedRules.some((r) => r.key === "user_multiplier")).toBe(true);
  });

  it("should handle overdue task scenario", () => {
    const task: TaskData = {
      priority: 2,
      difficulty: "easy",
      tags: [],
      completedAt: new Date("2024-01-14T23:00:00Z"), // Late + night owl
      createdAt: new Date("2024-01-08T09:00:00Z"),
      dueDate: new Date("2024-01-10T10:00:00Z"), // Overdue
    };

    const result = calculateXp(task, {
      userId: "test-user",
      xpMultiplier: 1.0,
      currentStreak: 0,
    }, { now: NOW });

    // Should still get some XP despite being late
    expect(result.delta).toBeGreaterThan(0);
    expect(result.appliedRules.some((r) => r.key === "late_completion")).toBe(true);
    expect(result.appliedRules.some((r) => r.key === "night_owl")).toBe(true);
  });

  it("should produce consistent results for same input", () => {
    const task: TaskData = {
      priority: 4,
      difficulty: "medium",
      tags: ["testing", "review"],
      completedAt: new Date("2024-01-15T14:00:00Z"),
      createdAt: new Date("2024-01-15T10:00:00Z"),
    };

    const user: UserContext = {
      userId: "test-user",
      xpMultiplier: 1.1,
      currentStreak: 5,
    };

    const result1 = calculateXp(task, user, { now: NOW });
    const result2 = calculateXp(task, user, { now: NOW });

    expect(result1.delta).toBe(result2.delta);
    expect(result1.appliedRules).toEqual(result2.appliedRules);
  });
});

describe("XP Engine - Applied Rules Validation", () => {
  it("should provide detailed rule descriptions", () => {
    const task: TaskData = {
      priority: 5,
      difficulty: "hard",
      tags: ["urgent"],
      completedAt: new Date("2024-01-15T10:00:00Z"),
      createdAt: new Date("2024-01-15T09:00:00Z"),
    };

    const user: UserContext = {
      userId: "test-user",
      xpMultiplier: 1.5,
      currentStreak: 10,
    };

    const result = calculateXp(task, user, { now: NOW });

    // All rules should have descriptions
    for (const rule of result.appliedRules) {
      expect(rule.key).toBeTruthy();
      expect(rule.description).toBeTruthy();
      expect(typeof rule.value).toBe("number");
      expect(rule.description.length).toBeGreaterThan(0);
    }
  });

  it("should maintain rule order (base -> priority -> tags -> streak -> time -> user -> caps)", () => {
    const task: TaskData = {
      priority: 5,
      difficulty: "hard",
      tags: ["urgent"],
      completedAt: new Date("2024-01-15T10:00:00Z"),
      createdAt: new Date("2024-01-15T09:00:00Z"),
    };

    const user: UserContext = {
      userId: "test-user",
      xpMultiplier: 1.5,
      currentStreak: 10,
    };

    const result = calculateXp(task, user, { now: NOW });

    const ruleKeys = result.appliedRules.map((r) => r.key);
    
    // Base should be first
    expect(ruleKeys[0]).toBe("base_xp");
    
    // If priority is applied, it should come before tags
    const priorityIndex = ruleKeys.indexOf("priority_multiplier");
    const tagIndex = ruleKeys.indexOf("tag_bonus");
    if (priorityIndex >= 0 && tagIndex >= 0) {
      expect(priorityIndex).toBeLessThan(tagIndex);
    }
    
    // User multiplier should come after streak
    const streakIndex = ruleKeys.indexOf("streak_multiplier");
    const userIndex = ruleKeys.indexOf("user_multiplier");
    if (streakIndex >= 0 && userIndex >= 0) {
      expect(streakIndex).toBeLessThan(userIndex);
    }
  });
});
