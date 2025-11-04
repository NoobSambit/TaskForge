#!/usr/bin/env tsx
/**
 * Backfill Task Fields Script
 * 
 * This script backfills the newly added fields (difficulty, tags, completedAt) 
 * for existing task documents in the database.
 * 
 * Default values:
 * - difficulty: "medium"
 * - tags: []
 * - completedAt: inferred from updatedAt when status === 'done', null otherwise
 * 
 * Usage:
 *   # Dry run (default - shows what would be updated without making changes)
 *   npm run backfill-tasks
 *   or
 *   tsx scripts/gamification/backfill-task-fields.ts
 * 
 *   # Execute the backfill
 *   npm run backfill-tasks -- --execute
 *   or
 *   tsx scripts/gamification/backfill-task-fields.ts --execute
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), ".env.local") });

interface BackfillSummary {
  totalTasks: number;
  tasksNeedingBackfill: number;
  tasksUpdated: number;
  errors: Array<{ taskId: string; error: string }>;
}

async function backfillTaskFields(execute: boolean = false): Promise<BackfillSummary> {
  const summary: BackfillSummary = {
    totalTasks: 0,
    tasksNeedingBackfill: 0,
    tasksUpdated: 0,
    errors: [],
  };

  try {
    // Import dependencies after env vars are loaded
    const { dbConnect } = await import("../../lib/db");
    const TaskModule = await import("../../models/Task");
    const Task = TaskModule.default;

    // Connect to database
    await dbConnect();
    console.log("✓ Connected to database");

    // Find all tasks
    const tasks = await Task.find({}).lean();
    summary.totalTasks = tasks.length;
    console.log(`\nFound ${summary.totalTasks} tasks`);

    // Identify tasks that need backfilling
    const tasksToBackfill = tasks.filter((task: any) => {
      return (
        task.difficulty === undefined ||
        task.tags === undefined ||
        (task.status === "done" && task.completedAt === undefined)
      );
    });

    summary.tasksNeedingBackfill = tasksToBackfill.length;
    console.log(`\n${summary.tasksNeedingBackfill} tasks need backfilling`);

    if (tasksToBackfill.length === 0) {
      console.log("\n✓ All tasks already have the new fields");
      return summary;
    }

    // Process each task
    for (const task of tasksToBackfill) {
      try {
        const updates: any = {};

        // Set difficulty if missing
        if (task.difficulty === undefined) {
          updates.difficulty = "medium";
        }

        // Set tags if missing
        if (task.tags === undefined) {
          updates.tags = [];
        }

        // Infer completedAt if task is done but completedAt is missing
        if (task.status === "done" && task.completedAt === undefined) {
          // Use updatedAt as a best guess for when the task was completed
          updates.completedAt = task.updatedAt || new Date();
        } else if (task.status !== "done" && task.completedAt === undefined) {
          updates.completedAt = null;
        }

        if (Object.keys(updates).length > 0) {
          if (execute) {
            // Actually update the task
            await Task.updateOne({ _id: task._id }, { $set: updates });
            summary.tasksUpdated++;
            console.log(`✓ Updated task ${task._id} with:`, updates);
          } else {
            // Dry run - just log what would be updated
            console.log(`[DRY RUN] Would update task ${task._id} with:`, updates);
            summary.tasksUpdated++;
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        summary.errors.push({
          taskId: String(task._id),
          error: errorMessage,
        });
        console.error(`✗ Failed to update task ${task._id}:`, errorMessage);
      }
    }

    // Print summary
    console.log("\n" + "=".repeat(60));
    console.log("BACKFILL SUMMARY");
    console.log("=".repeat(60));
    console.log(`Mode: ${execute ? "EXECUTE" : "DRY RUN"}`);
    console.log(`Total tasks: ${summary.totalTasks}`);
    console.log(`Tasks needing backfill: ${summary.tasksNeedingBackfill}`);
    console.log(`Tasks ${execute ? "updated" : "would be updated"}: ${summary.tasksUpdated}`);
    console.log(`Errors: ${summary.errors.length}`);
    
    if (summary.errors.length > 0) {
      console.log("\nErrors:");
      summary.errors.forEach(({ taskId, error }) => {
        console.log(`  - Task ${taskId}: ${error}`);
      });
    }

    if (!execute && summary.tasksUpdated > 0) {
      console.log("\n⚠ This was a DRY RUN. No changes were made to the database.");
      console.log("Run with --execute flag to apply changes.");
    } else if (execute && summary.tasksUpdated > 0) {
      console.log("\n✓ Backfill completed successfully!");
    }

    console.log("=".repeat(60) + "\n");

    return summary;
  } catch (error) {
    console.error("\n✗ Fatal error during backfill:", error);
    throw error;
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const execute = args.includes("--execute");

// Run the backfill
backfillTaskFields(execute)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Backfill failed:", error);
    process.exit(1);
  });
