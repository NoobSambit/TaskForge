/**
 * Tests for feature flags module
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getFeatureFlags,
  isFeatureEnabled,
  canUserAccessFeature,
  getFeatureInfo,
} from "../featureFlags";

describe("Feature Flags", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("getFeatureFlags", () => {
    it("should return feature flags from environment variables", () => {
      process.env.FEATURE_LEADERBOARD = "true";

      // Re-import to pick up new env vars
      vi.resetModules();
      const module = require("../featureFlags");
      const flags = module.getFeatureFlags();

      expect(flags.leaderboard).toBe(true);
    });

    it("should default to false when env var is not set", () => {
      delete process.env.FEATURE_LEADERBOARD;

      vi.resetModules();
      const module = require("../featureFlags");
      const flags = module.getFeatureFlags();

      expect(flags.leaderboard).toBe(false);
    });

    it("should handle different truthy values", () => {
      const truthyValues = ["true", "1", "yes", "TRUE"];

      truthyValues.forEach((value) => {
        process.env.FEATURE_LEADERBOARD = value;
        vi.resetModules();
        const module = require("../featureFlags");
        const flags = module.getFeatureFlags();

        // Only "true" string should be truthy
        if (value === "true") {
          expect(flags.leaderboard).toBe(true);
        } else {
          expect(flags.leaderboard).toBe(false);
        }
      });
    });
  });

  describe("isFeatureEnabled", () => {
    it("should return true when feature is enabled", () => {
      process.env.FEATURE_LEADERBOARD = "true";
      const result = isFeatureEnabled("leaderboard");
      expect(result).toBe(true);
    });

    it("should return false when feature is disabled", () => {
      process.env.FEATURE_LEADERBOARD = "false";
      const result = isFeatureEnabled("leaderboard");
      expect(result).toBe(false);
    });

    it("should return false when env var is not set", () => {
      delete process.env.FEATURE_LEADERBOARD;
      const result = isFeatureEnabled("leaderboard");
      expect(result).toBe(false);
    });
  });

  describe("canUserAccessFeature", () => {
    it("should return false when feature flag is disabled", () => {
      process.env.FEATURE_LEADERBOARD = "false";
      const result = canUserAccessFeature("leaderboard", {
        leaderboardOptIn: true,
      });
      expect(result).toBe(false);
    });

    it("should return false when user opts out of leaderboard", () => {
      process.env.FEATURE_LEADERBOARD = "true";
      const result = canUserAccessFeature("leaderboard", {
        leaderboardOptIn: false,
      });
      expect(result).toBe(false);
    });

    it("should return true when feature is enabled and user opts in", () => {
      process.env.FEATURE_LEADERBOARD = "true";
      const result = canUserAccessFeature("leaderboard", {
        leaderboardOptIn: true,
      });
      expect(result).toBe(true);
    });

    it("should return true when user preferences are not provided and feature is enabled", () => {
      process.env.FEATURE_LEADERBOARD = "true";
      const result = canUserAccessFeature("leaderboard");
      expect(result).toBe(true);
    });

    it("should handle undefined leaderboardOptIn as true by default", () => {
      process.env.FEATURE_LEADERBOARD = "true";
      const result = canUserAccessFeature("leaderboard", {
        anonymousMode: false,
      });
      expect(result).toBe(true);
    });

    it("should not be affected by anonymousMode setting", () => {
      process.env.FEATURE_LEADERBOARD = "true";
      const result1 = canUserAccessFeature("leaderboard", {
        leaderboardOptIn: true,
        anonymousMode: true,
      });
      const result2 = canUserAccessFeature("leaderboard", {
        leaderboardOptIn: true,
        anonymousMode: false,
      });
      expect(result1).toBe(true);
      expect(result2).toBe(true);
    });
  });

  describe("getFeatureInfo", () => {
    it("should return feature information", () => {
      process.env.FEATURE_LEADERBOARD = "true";
      const info = getFeatureInfo("leaderboard");

      expect(info).toEqual({
        name: "Leaderboard",
        enabled: true,
        description: "Global rankings of users by weekly and monthly XP",
      });
    });

    it("should show disabled status when feature is off", () => {
      process.env.FEATURE_LEADERBOARD = "false";
      const info = getFeatureInfo("leaderboard");

      expect(info).toEqual({
        name: "Leaderboard",
        enabled: false,
        description: "Global rankings of users by weekly and monthly XP",
      });
    });

    it("should include consistent descriptions", () => {
      process.env.FEATURE_LEADERBOARD = "true";
      const info1 = getFeatureInfo("leaderboard");

      process.env.FEATURE_LEADERBOARD = "false";
      vi.resetModules();
      const module = require("../featureFlags");
      const info2 = module.getFeatureInfo("leaderboard");

      expect(info1.description).toBe(info2.description);
    });
  });
});
