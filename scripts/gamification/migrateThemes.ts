#!/usr/bin/env tsx

/**
 * Migration: Initialize Themes for Existing Users
 * 
 * This script ensures all existing users have the correct default themes
 * unlocked and properly configured theme preferences.
 */

import mongoose from "mongoose";
import User from "../../models/User";
import { getDefaultThemes } from "../../lib/gamification/themes";

const DEFAULT_THEME_IDS = ["default", "dark"];

async function migrate() {
  const startTime = Date.now();
  console.log("🎨 Starting theme initialization migration...");

  try {
    // Connect to MongoDB
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI environment variable is required");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Get all users
    const users = await User.find({});
    console.log(`📊 Found ${users.length} users to process`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        const userId = user._id.toString();
        
        // Check if user needs theme initialization
        const needsUpdate = 
          !user.unlockedThemes || 
          user.unlockedThemes.length === 0 ||
          !user.unlockedThemes.includes("default") ||
          !user.unlockedThemes.includes("dark");

        if (needsUpdate) {
          // Initialize theme fields
          const currentUnlocked = user.unlockedThemes || [];
          const mergedUnlocked = [...new Set([...currentUnlocked, ...DEFAULT_THEME_IDS])];
          
          await User.updateOne(
            { _id: userId },
            { 
              $set: { 
                theme: user.theme || "default",
                unlockedThemes: mergedUnlocked
              }
            }
          );

          console.log(`🎯 Updated user ${userId}: theme="${user.theme || 'default'}", unlockedThemes=[${mergedUnlocked.join(", ")}]`);
          updatedCount++;
        } else {
          console.log(`⏭️  Skipped user ${userId}: already has proper theme configuration`);
          skippedCount++;
        }
      } catch (userError) {
        console.error(`❌ Error processing user ${user._id}:`, userError);
        errorCount++;
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log("\n" + "=".repeat(50));
    console.log("📋 MIGRATION SUMMARY");
    console.log("=".repeat(50));
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`👥 Total users: ${users.length}`);
    console.log(`✅ Updated: ${updatedCount}`);
    console.log(`⏭️  Skipped: ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log("=".repeat(50));

    if (errorCount > 0) {
      console.log("⚠️  Migration completed with errors. Check the logs above.");
      process.exit(1);
    } else {
      console.log("🎉 Migration completed successfully!");
    }

  } catch (error) {
    console.error("💥 Migration failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");

if (isDryRun) {
  console.log("🔍 DRY RUN MODE - No changes will be made");
  console.log("Run without --dry-run to apply changes\n");
}

// Run migration
migrate().catch((error) => {
  console.error("💥 Unhandled error:", error);
  process.exit(1);
});