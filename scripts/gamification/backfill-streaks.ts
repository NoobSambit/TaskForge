/**
 * Backfill Streaks Script
 * 
 * This script recomputes streak data from historical ActivityLog/Task completions.
 * It processes users in batches and creates/updates StreakLog entries without duplication.
 * 
 * Usage:
 *   npm run backfill:streaks              # Run for all users
 *   npm run backfill:streaks -- --dry-run # Preview changes without writing
 *   npm run backfill:streaks -- --batch-size=50 # Custom batch size
 *   npm run backfill:streaks -- --user-id=<id> # Process specific user
 */

import mongoose from "mongoose";
import { recomputeStreaksFromHistory } from "../../lib/gamification/streaks";

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const batchSizeArg = args.find((arg) => arg.startsWith("--batch-size="));
const batchSize = batchSizeArg ? parseInt(batchSizeArg.split("=")[1], 10) : 100;
const userIdArg = args.find((arg) => arg.startsWith("--user-id="));
const targetUserId = userIdArg ? userIdArg.split("=")[1] : null;

// Validate MongoDB URI
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("❌ Error: MONGODB_URI environment variable is required");
  process.exit(1);
}
// Type assertion after validation
const mongoUri: string = MONGODB_URI;

/**
 * Main backfill function
 */
async function backfillStreaks() {
  console.log("🔄 Starting streak backfill...");
  console.log(`Mode: ${isDryRun ? "DRY RUN" : "LIVE"}`);
  console.log(`Batch size: ${batchSize}`);
  if (targetUserId) {
    console.log(`Target user: ${targetUserId}`);
  }
  console.log();

  try {
    // Connect to MongoDB
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    // Import models
    const { default: User } = await import("../../models/User");
    
    // Find users to process
    let userQuery: any = {};
    if (targetUserId) {
      userQuery = { _id: targetUserId };
    }
    
    const totalUsers = await User.countDocuments(userQuery);
    console.log(`📊 Found ${totalUsers} user(s) to process\n`);

    if (totalUsers === 0) {
      console.log("ℹ️  No users to process");
      return;
    }

    // Process users in batches
    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;
    let totalDaysActive = 0;
    let totalCompletions = 0;
    let totalStreakLogs = 0;

    const startTime = Date.now();

    // Iterate through users in batches
    let skip = 0;
    while (skip < totalUsers) {
      const users = await User.find(userQuery)
        .select("_id email preferences")
        .skip(skip)
        .limit(batchSize)
        .lean();

      console.log(`\n📦 Processing batch ${Math.floor(skip / batchSize) + 1} (users ${skip + 1}-${Math.min(skip + batchSize, totalUsers)} of ${totalUsers})`);

      for (const user of users) {
        processedCount++;
        const userId = user._id.toString();
        
        try {
          if (isDryRun) {
            console.log(`   [DRY RUN] Would recompute streaks for user ${userId}`);
            successCount++;
          } else {
            // Recompute streaks from history
            const result = await recomputeStreaksFromHistory(userId);
            
            if (result.success) {
              successCount++;
              totalDaysActive += result.totalDaysActive;
              totalCompletions += result.totalCompletions;
              totalStreakLogs += result.streakLogsCreated;
              
              console.log(
                `   ✓ User ${userId}: ` +
                `current=${result.currentStreak}, ` +
                `longest=${result.longestStreak}, ` +
                `days=${result.totalDaysActive}, ` +
                `completions=${result.totalCompletions}, ` +
                `logs=${result.streakLogsCreated}`
              );
            } else {
              errorCount++;
              console.error(`   ✗ User ${userId}: ${result.reason}`);
            }
          }
        } catch (error: any) {
          errorCount++;
          console.error(`   ✗ User ${userId}: ${error.message}`);
        }
      }

      skip += batchSize;

      // Progress update
      const progress = ((processedCount / totalUsers) * 100).toFixed(1);
      console.log(`   Progress: ${processedCount}/${totalUsers} (${progress}%)`);
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("📋 Backfill Summary");
    console.log("=".repeat(60));
    console.log(`Mode: ${isDryRun ? "DRY RUN (no changes made)" : "LIVE"}`);
    console.log(`Total users: ${totalUsers}`);
    console.log(`Processed: ${processedCount}`);
    console.log(`Successful: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
    
    if (!isDryRun) {
      console.log(`\nAggregate Stats:`);
      console.log(`  Total days active: ${totalDaysActive}`);
      console.log(`  Total completions: ${totalCompletions}`);
      console.log(`  Total streak logs created: ${totalStreakLogs}`);
      console.log(`  Average days per user: ${(totalDaysActive / successCount).toFixed(1)}`);
      console.log(`  Average completions per user: ${(totalCompletions / successCount).toFixed(1)}`);
    }
    
    console.log(`\nDuration: ${duration}s`);
    console.log(`Rate: ${(processedCount / parseFloat(duration)).toFixed(1)} users/sec`);
    console.log("=".repeat(60));

    if (isDryRun) {
      console.log("\nℹ️  This was a dry run. No changes were made to the database.");
      console.log("   Run without --dry-run to apply changes.");
    } else if (errorCount > 0) {
      console.log(`\n⚠️  Completed with ${errorCount} error(s). Check logs above for details.`);
    } else {
      console.log("\n✅ Backfill completed successfully!");
    }
  } catch (error: any) {
    console.error("\n❌ Fatal error during backfill:", error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log("👋 Disconnected from MongoDB");
  }
}

// Run the backfill
backfillStreaks().catch((error) => {
  console.error("❌ Unhandled error:", error);
  process.exit(1);
});
