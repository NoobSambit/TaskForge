import { Schema, Model, models, model } from "mongoose";

export interface IAchievement {
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
  createdAt: Date;
  updatedAt: Date;
}

const AchievementSchema = new Schema<IAchievement>(
  {
    key: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    icon: { type: String, required: true },
    category: { type: String, required: true, index: true },
    xpReward: { type: Number, required: true, min: 0 },
    rarity: { 
      type: String, 
      enum: ["common", "rare", "epic", "legendary"], 
      default: "common",
      index: true 
    },
    themeUnlock: { type: String },
    criteria: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  { timestamps: true }
);

const Achievement = (models.Achievement as Model<IAchievement>) || model<IAchievement>("Achievement", AchievementSchema);

export default Achievement;
