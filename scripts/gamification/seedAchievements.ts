import mongoose from "mongoose";
import * as fs from "fs";
import * as path from "path";
import Achievement from "../../models/Achievement";

interface AchievementData {
  key: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  xpReward: number;
  rarity: "common" | "rare" | "epic" | "legendary";
  themeUnlock?: string;
  criteria: {
    type: string;
    target?: number;
    [key: string]: any;
  };
}

async function seedAchievements() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");

  console.log("=== Achievement Seeding Script ===");
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

    // Read achievements from JSON file
    const achievementsPath = path.join(__dirname, "achievements.json");
    if (!fs.existsSync(achievementsPath)) {
      throw new Error(`Achievements file not found at: ${achievementsPath}`);
    }

    const achievementsData: AchievementData[] = JSON.parse(
      fs.readFileSync(achievementsPath, "utf-8")
    );

    console.log(`Found ${achievementsData.length} achievements in JSON file`);
    console.log("");

    if (isDryRun) {
      console.log("DRY RUN - Would seed the following achievements:");
      console.log("");
      achievementsData.forEach((achievement, index) => {
        console.log(
          `${index + 1}. [${achievement.rarity.toUpperCase()}] ${achievement.name} (${achievement.key})`
        );
        console.log(`   Category: ${achievement.category} | XP: ${achievement.xpReward}`);
        if (achievement.themeUnlock) {
          console.log(`   Unlocks theme: ${achievement.themeUnlock}`);
        }
      });
      console.log("");
      console.log("Run without --dry-run to execute the seeding");
    } else {
      console.log("Seeding achievements...");
      let insertedCount = 0;
      let skippedCount = 0;
      let updatedCount = 0;

      for (const achievementData of achievementsData) {
        try {
          // Use upsert to make this idempotent
          const result = await Achievement.findOneAndUpdate(
            { key: achievementData.key },
            achievementData,
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );

          const existing = await Achievement.findOne({ key: achievementData.key });
          if (existing && existing.createdAt.getTime() === existing.updatedAt.getTime()) {
            insertedCount++;
            console.log(`✓ Inserted: ${achievementData.name} (${achievementData.key})`);
          } else {
            updatedCount++;
            console.log(`↻ Updated: ${achievementData.name} (${achievementData.key})`);
          }
        } catch (error: any) {
          if (error.code === 11000) {
            skippedCount++;
            console.log(`- Skipped (exists): ${achievementData.name} (${achievementData.key})`);
          } else {
            throw error;
          }
        }
      }

      console.log("");
      console.log("=== Summary ===");
      console.log(`Total achievements processed: ${achievementsData.length}`);
      console.log(`Inserted: ${insertedCount}`);
      console.log(`Updated: ${updatedCount}`);
      console.log(`Skipped: ${skippedCount}`);
      console.log("");

      // Verify
      const totalCount = await Achievement.countDocuments();
      console.log(`Total achievements in database: ${totalCount}`);
      console.log("✓ Achievement seeding completed successfully");
    }
  } catch (error) {
    console.error("Error seeding achievements:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

// Run the script
seedAchievements();
