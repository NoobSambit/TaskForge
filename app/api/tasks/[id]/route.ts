import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { auth } = await import("../../../../lib/auth");
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;

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
    const params = await ctx.params;
    console.error(`GET /api/tasks/${params.id} error:`, err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
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
    delete updateData.userId;
    delete updateData._id;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    const { dbConnect } = await import("../../../../lib/db");
    await dbConnect();

    const TaskModule = await import("../../../../models/Task");
    const Task = TaskModule.default;
    
    const params = await ctx.params;
    const updated = await Task.findOneAndUpdate(
      { _id: params.id, userId: session.user.id },
      updateData,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (err: any) {
    const params = await ctx.params;
    console.error(`PUT /api/tasks/${params.id} error:`, err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
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
    
    const params = await ctx.params;
    const deleted = await Task.findOneAndDelete({ _id: params.id, userId: session.user.id });

    if (!deleted) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    const params = await ctx.params;
    console.error(`DELETE /api/tasks/${params.id} error:`, err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
