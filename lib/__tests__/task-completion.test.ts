import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import Task from "../../models/Task";

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  // Start in-memory MongoDB server
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  // Clean up
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clear all collections before each test
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe("Task Completion Logic", () => {
  it("should set completedAt when creating a task with status 'done'", async () => {
    const task = await Task.create({
      userId: "user123",
      title: "Test Task",
      description: "Test description",
      status: "done",
      priority: 3,
      difficulty: "medium",
      tags: ["test"],
    });

    expect(task.completedAt).toBeDefined();
    expect(task.completedAt).toBeInstanceOf(Date);
  });

  it("should not set completedAt when creating a task with status 'todo'", async () => {
    const task = await Task.create({
      userId: "user123",
      title: "Test Task",
      description: "Test description",
      status: "todo",
      priority: 3,
      difficulty: "medium",
      tags: ["test"],
    });

    expect(task.completedAt).toBeNull();
  });

  it("should set completedAt when updating status from 'todo' to 'done'", async () => {
    const task = await Task.create({
      userId: "user123",
      title: "Test Task",
      status: "todo",
      priority: 3,
      difficulty: "medium",
      tags: [],
    });

    expect(task.completedAt).toBeNull();

    task.status = "done";
    await task.save();

    expect(task.completedAt).toBeDefined();
    expect(task.completedAt).toBeInstanceOf(Date);
  });

  it("should clear completedAt when updating status from 'done' to 'todo'", async () => {
    const task = await Task.create({
      userId: "user123",
      title: "Test Task",
      status: "done",
      priority: 3,
      difficulty: "medium",
      tags: [],
    });

    expect(task.completedAt).toBeDefined();

    task.status = "todo";
    await task.save();

    expect(task.completedAt).toBeNull();
  });

  it("should set completedAt when updating via findOneAndUpdate", async () => {
    const task = await Task.create({
      userId: "user123",
      title: "Test Task",
      status: "todo",
      priority: 3,
      difficulty: "medium",
      tags: [],
    });

    const updated = await Task.findOneAndUpdate(
      { _id: task._id },
      { status: "done" },
      { new: true }
    );

    expect(updated?.completedAt).toBeDefined();
    expect(updated?.completedAt).toBeInstanceOf(Date);
  });

  it("should clear completedAt when reopening via findOneAndUpdate", async () => {
    const task = await Task.create({
      userId: "user123",
      title: "Test Task",
      status: "done",
      priority: 3,
      difficulty: "medium",
      tags: [],
    });

    expect(task.completedAt).toBeDefined();

    const updated = await Task.findOneAndUpdate(
      { _id: task._id },
      { status: "todo" },
      { new: true }
    );

    expect(updated?.completedAt).toBeNull();
  });

  it("should preserve difficulty and tags through status updates", async () => {
    const task = await Task.create({
      userId: "user123",
      title: "Test Task",
      status: "todo",
      priority: 5,
      difficulty: "hard",
      tags: ["urgent", "bug-fix"],
    });

    task.status = "done";
    await task.save();

    expect(task.difficulty).toBe("hard");
    expect(task.tags).toEqual(["urgent", "bug-fix"]);
    expect(task.priority).toBe(5);
  });

  it("should use default values for new fields", async () => {
    const task = await Task.create({
      userId: "user123",
      title: "Test Task",
      status: "todo",
      priority: 3,
    });

    expect(task.difficulty).toBe("medium");
    expect(task.tags).toEqual([]);
    expect(task.completedAt).toBeNull();
  });

  it("should enforce max 20 tags validation", async () => {
    const tooManyTags = Array.from({ length: 21 }, (_, i) => `tag${i}`);

    await expect(
      Task.create({
        userId: "user123",
        title: "Test Task",
        status: "todo",
        priority: 3,
        difficulty: "medium",
        tags: tooManyTags,
      })
    ).rejects.toThrow();
  });

  it("should allow exactly 20 tags", async () => {
    const twentyTags = Array.from({ length: 20 }, (_, i) => `tag${i}`);

    const task = await Task.create({
      userId: "user123",
      title: "Test Task",
      status: "todo",
      priority: 3,
      difficulty: "medium",
      tags: twentyTags,
    });

    expect(task.tags).toHaveLength(20);
  });

  it("should validate difficulty enum values", async () => {
    await expect(
      Task.create({
        userId: "user123",
        title: "Test Task",
        status: "todo",
        priority: 3,
        difficulty: "invalid" as any,
        tags: [],
      })
    ).rejects.toThrow();
  });

  it("should accept valid difficulty values", async () => {
    const difficulties = ["easy", "medium", "hard"] as const;

    for (const difficulty of difficulties) {
      const task = await Task.create({
        userId: "user123",
        title: `Test Task ${difficulty}`,
        status: "todo",
        priority: 3,
        difficulty,
        tags: [],
      });

      expect(task.difficulty).toBe(difficulty);
    }
  });

  it("should not change completedAt when updating other fields", async () => {
    const task = await Task.create({
      userId: "user123",
      title: "Test Task",
      status: "done",
      priority: 3,
      difficulty: "medium",
      tags: [],
    });

    const originalCompletedAt = task.completedAt;
    expect(originalCompletedAt).toBeDefined();

    // Wait a bit to ensure timestamps would differ if changed
    await new Promise((resolve) => setTimeout(resolve, 10));

    task.title = "Updated Title";
    task.difficulty = "hard";
    task.tags = ["updated"];
    await task.save();

    expect(task.completedAt?.getTime()).toBe(originalCompletedAt?.getTime());
  });
});

describe("Task Tags Persistence", () => {
  it("should persist tags across multiple updates", async () => {
    const task = await Task.create({
      userId: "user123",
      title: "Test Task",
      status: "todo",
      priority: 3,
      difficulty: "medium",
      tags: ["initial", "tags"],
    });

    // First update
    task.tags = ["updated", "tags", "list"];
    await task.save();

    let fetched = await Task.findById(task._id);
    expect(fetched?.tags).toEqual(["updated", "tags", "list"]);

    // Second update
    if (fetched) {
      fetched.tags = ["final", "tags"];
      await fetched.save();
    }

    fetched = await Task.findById(task._id);
    expect(fetched?.tags).toEqual(["final", "tags"]);
  });

  it("should handle empty tags array", async () => {
    const task = await Task.create({
      userId: "user123",
      title: "Test Task",
      status: "todo",
      priority: 3,
      difficulty: "medium",
      tags: ["initial"],
    });

    task.tags = [];
    await task.save();

    const fetched = await Task.findById(task._id);
    expect(fetched?.tags).toEqual([]);
  });

  it("should preserve tags when updating via findOneAndUpdate", async () => {
    const task = await Task.create({
      userId: "user123",
      title: "Test Task",
      status: "todo",
      priority: 3,
      difficulty: "medium",
      tags: ["keep", "these"],
    });

    const updated = await Task.findOneAndUpdate(
      { _id: task._id },
      { title: "Updated Title" },
      { new: true }
    );

    expect(updated?.tags).toEqual(["keep", "these"]);
  });
});
