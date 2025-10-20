// Central app types aligned with Mongoose models and API JSON shapes

// Keep in sync with models/Task.ts TaskStatus union and API layer
export type TaskStatus = "todo" | "in_progress" | "done";

// JSON shape returned by our Tasks API (Mongoose document serialized to JSON)
export type Task = {
  _id: string;
  userId: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: number; // 1..5
  createdAt?: string;
  updatedAt?: string;
};

// JSON shape returned by a User document (if/when exposed via API)
export type User = {
  _id: string;
  name: string;
  email: string;
  createdAt?: string;
  updatedAt?: string;
};
