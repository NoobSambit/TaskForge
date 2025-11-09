import { Schema, Model, models, model } from "mongoose";

export interface IStreakLog {
  userId: string;
  date: Date;
  taskCount: number;
  streakLength: number;
  createdAt: Date;
  updatedAt: Date;
}

const StreakLogSchema = new Schema<IStreakLog>(
  {
    userId: { type: String, required: true, index: true },
    date: { type: Date, required: true },
    taskCount: { type: Number, required: true, min: 0 },
    streakLength: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

// Compound index for querying user streaks by date
StreakLogSchema.index({ userId: 1, date: -1 });
// Ensure one entry per user per day
StreakLogSchema.index({ userId: 1, date: 1 }, { unique: true });

const StreakLog = (models.StreakLog as Model<IStreakLog>) || model<IStreakLog>("StreakLog", StreakLogSchema);

/**
 * Get current streak for a user
 */
export async function getCurrentStreak(userId: string): Promise<number> {
  const latestLog = await StreakLog
    .findOne({ userId })
    .sort({ date: -1 })
    .lean();
  
  return latestLog?.streakLength || 0;
}

/**
 * Update user's streak when they complete tasks
 */
export async function updateUserStreak(
  userId: string,
  taskCount: number = 1
): Promise<{
  currentStreak: number;
  previousStreak: number;
  streakExtended: boolean;
  streakReset: boolean;
}> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Get latest streak log
  const latestLog = await StreakLog
    .findOne({ userId })
    .sort({ date: -1 })
    .lean();
  
  const previousStreak = latestLog?.streakLength || 0;
  let newStreak = previousStreak;
  let streakExtended = false;
  let streakReset = false;
  
  // Check if we have an entry for today
  const todayLog = await StreakLog.findOne({
    userId,
    date: today,
  });
  
  if (todayLog) {
    // Update today's entry
    await StreakLog.updateOne(
      { _id: todayLog._id },
      { 
        $inc: { taskCount },
        streakLength: previousStreak, // Keep current streak
      }
    );
  } else {
    // Check if we had an entry for yesterday to continue streak
    const yesterdayLog = await StreakLog.findOne({
      userId,
      date: yesterday,
    });
    
    if (yesterdayLog) {
      // Continue the streak
      newStreak = previousStreak + 1;
      streakExtended = true;
    } else {
      // Reset streak (but count today as day 1)
      newStreak = 1;
      streakReset = previousStreak > 0;
    }
    
    // Create new entry for today
    await StreakLog.create({
      userId,
      date: today,
      taskCount,
      streakLength: newStreak,
    });
  }
  
  return {
    currentStreak: newStreak,
    previousStreak,
    streakExtended,
    streakReset,
  };
}

export default StreakLog;
