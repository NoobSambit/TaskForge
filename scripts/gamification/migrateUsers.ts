import mongoose from "mongoose";
import User from "../../models/User";
import Achievement from "../../models/Achievement";
import UserAchievement from "../../models/UserAchievement";
import StreakLog from "../../models/StreakLog";
import ActivityLog from "../../models/ActivityLog";

async function migrateUsers() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");

  console.log("=== Gamification Migration Script ===");
  console.log(`Mode: ${isDryRun ? "DRY RUN" : "EXECUTE"}`);
  console.log("");

  // Check for MONGODB_URI
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("Error: MONGODB_URI environment variable is not set");
    process.exit(1);
  }

  try {
    // Connect to MongoDB
    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("✓ Connected to MongoDB");
    console.log("");

    // Step 1: Backfill existing users with gamification fields
    console.log("Step 1: Checking users for gamification field migration...");
    const usersWithoutGamification = await User.find({
      $or: [
        { xp: { $exists: false } },
        { level: { $exists: false } },
        { preferences: { $exists: false } },
      ],
    });

    console.log(`Found ${usersWithoutGamification.length} users needing migration`);

    if (usersWithoutGamification.length > 0) {
      if (isDryRun) {
        console.log("DRY RUN - Would update these users:");
        usersWithoutGamification.forEach((user) => {
          console.log(`  - ${user.name} (${user.email})`);
        });
      } else {
        console.log("Backfilling users with default gamification fields...");
        let updatedCount = 0;

        for (const user of usersWithoutGamification) {
          await User.updateOne(
            { _id: user._id },
            {
              $set: {
                xp: 0,
                level: 1,
                currentStreak: 0,
                longestStreak: 0,
                theme: "default",
                unlockedThemes: ["default"],
                xpMultiplier: 1.0,
                preferences: {
                  leaderboardOptIn: true,
                  anonymousMode: false,
                },
              },
            }
          );
          updatedCount++;
          console.log(`✓ Updated user: ${user.name} (${user.email})`);
        }

        console.log(`✓ Backfilled ${updatedCount} users`);
      }
    } else {
      console.log("✓ All users already have gamification fields");
    }
    console.log("");

    // Step 2: Ensure indexes are created for all collections
    console.log("Step 2: Creating/verifying indexes...");

    if (isDryRun) {
      console.log("DRY RUN - Would create the following indexes:");
      console.log("");
      console.log("User collection:");
      console.log("  - level (single field)");
      console.log("  - preferences.leaderboardOptIn (single field)");
      console.log("");
      console.log("Achievement collection:");
      console.log("  - key (unique)");
      console.log("  - category (single field)");
      console.log("  - rarity (single field)");
      console.log("");
      console.log("UserAchievement collection:");
      console.log("  - userId (single field)");
      console.log("  - achievementKey (single field)");
      console.log("  - {userId, achievementKey} (compound, unique)");
      console.log("  - {userId, unlockedAt} (compound)");
      console.log("");
      console.log("StreakLog collection:");
      console.log("  - userId (single field)");
      console.log("  - {userId, date} (compound, unique)");
      console.log("  - {userId, date} (compound, sorted desc)");
      console.log("");
      console.log("ActivityLog collection:");
      console.log("  - userId (single field)");
      console.log("  - activityType (single field)");
      console.log("  - {userId, date} (compound, sorted desc)");
      console.log("  - {userId, activityType, date} (compound)");
    } else {
      console.log("Creating indexes for User collection...");
      await User.syncIndexes();
      console.log("✓ User indexes created");

      console.log("Creating indexes for Achievement collection...");
      await Achievement.syncIndexes();
      console.log("✓ Achievement indexes created");

      console.log("Creating indexes for UserAchievement collection...");
      await UserAchievement.syncIndexes();
      console.log("✓ UserAchievement indexes created");

      console.log("Creating indexes for StreakLog collection...");
      await StreakLog.syncIndexes();
      console.log("✓ StreakLog indexes created");

      console.log("Creating indexes for ActivityLog collection...");
      await ActivityLog.syncIndexes();
      console.log("✓ ActivityLog indexes created");
    }
    console.log("");

    // Step 3: Verify collections exist
    console.log("Step 3: Verifying collections...");
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map((c: { name: string }) => c.name);

    const requiredCollections = [
      "users",
      "achievements",
      "userachievements",
      "streaklogs",
      "activitylogs",
    ];

    console.log("Existing collections:", collectionNames.join(", "));
    console.log("");

    for (const collectionName of requiredCollections) {
      if (collectionNames.includes(collectionName)) {
        console.log(`✓ Collection '${collectionName}' exists`);
      } else {
        console.log(`⚠ Collection '${collectionName}' does not exist yet (will be created on first insert)`);
      }
    }
    console.log("");

    // Summary
    console.log("=== Migration Summary ===");
    if (isDryRun) {
      console.log("DRY RUN completed - no changes made");
      console.log("Run without --dry-run to execute the migration");
    } else {
      console.log("✓ Migration completed successfully");
      console.log("✓ User gamification fields backfilled");
      console.log("✓ All indexes created");
      console.log("");
      console.log("Next steps:");
      console.log("  1. Run the achievements seeding script:");
      console.log("     npm run seed:achievements");
      console.log("  2. Verify data in MongoDB shell or MongoDB Compass");
    }
  } catch (error) {
    console.error("Error during migration:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

// Run the script
migrateUsers();
