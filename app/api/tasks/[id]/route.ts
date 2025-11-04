import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const { auth } = await import("../../../../lib/auth");
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = ctx.params;

    const { dbConnect } = await import("../../../../lib/db");
    await dbConnect();

    const TaskModule = await import("../../../../models/Task");
    const Task = TaskModule.default;

    const task = await Task.findOne({ _id: id, userId: session.user.id });
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json(task, { status: 200 });
  } catch (err: any) {
    console.error(`GET /api/tasks/${ctx.params.id} error:`, err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const { auth } = await import("../../../../lib/auth");
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { taskSchema } = await import("../../../../lib/validations");
    const partialSchema = taskSchema.partial();
    const parsed = partialSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updateData = { ...parsed.data } as Record<string, any>;
    
    // Prevent clients from forging these fields
    delete updateData.userId;
    delete updateData._id;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    
    // Remove completedAt from updateData - it will be handled by the pre-update hook
    // based on status changes
    delete updateData.completedAt;

    const { dbConnect } = await import("../../../../lib/db");
    await dbConnect();

    const TaskModule = await import("../../../../models/Task");
    const Task = TaskModule.default;

    // Get the current task state before update to detect status changes
    const currentTask = await Task.findOne({ _id: ctx.params.id, userId: session.user.id });
    if (!currentTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const updated = await Task.findOneAndUpdate(
      { _id: ctx.params.id, userId: session.user.id },
      updateData,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Handle XP awarding for task completion
    // Do this asynchronously to not block the response
    if (updateData.status !== undefined) {
      const wasNotDone = currentTask.status !== "done";
      const isNowDone = updated.status === "done";
      const wasDone = currentTask.status === "done";
      const isNowNotDone = updated.status !== "done";

      if (wasNotDone && isNowDone) {
        // Task just completed - award XP
        const { awardXpForTaskCompletion } = await import("../../../../lib/gamification");
        awardXpForTaskCompletion(updated._id.toString(), session.user.id).catch((error) => {
          console.error("Error awarding XP for task completion:", error);
        });
      } else if (wasDone && isNowNotDone) {
        // Task re-opened - adjust XP
        const { adjustXpForTaskReopen } = await import("../../../../lib/gamification");
        adjustXpForTaskReopen(updated._id.toString(), session.user.id).catch((error) => {
          console.error("Error adjusting XP for task reopen:", error);
        });
      }
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (err: any) {
    console.error(`PUT /api/tasks/${ctx.params.id} error:`, err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const { auth } = await import("../../../../lib/auth");
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { dbConnect } = await import("../../../../lib/db");
    await dbConnect();

    const TaskModule = await import("../../../../models/Task");
    const Task = TaskModule.default;

    const deleted = await Task.findOneAndDelete({ _id: ctx.params.id, userId: session.user.id });

    if (!deleted) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error(`DELETE /api/tasks/${ctx.params.id} error:`, err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
