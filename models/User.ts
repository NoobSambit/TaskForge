import { Schema, Model, models, model } from "mongoose";

export interface IUser {
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true, unique: true },
  },
  { timestamps: true }
);

const User = (models.User as Model<IUser>) || model<IUser>("User", UserSchema);

export default User;
