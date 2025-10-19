import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { auth } = await import("../../../lib/auth");
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { dbConnect } = await import("../../../lib/db");
    await dbConnect();

    const TaskModule = await import("../../../models/Task");
    const Task = TaskModule.default;

    const { searchParams } = new URL(req.url);
    const filter: Record<string, any> = { userId: session.user.id };

    const status = searchParams.get("status");
    if (status) {
      filter.status = status;
    }

    const priorityParam = searchParams.get("priority");
    if (priorityParam !== null) {
      const p = Number(priorityParam);
      if (!Number.isNaN(p)) {
        filter.priority = p;
      }
    }

    const search = searchParams.get("search");
    if (search) {
      filter.title = { $regex: search, $options: "i" };
    }

    const tasks = await Task.find(filter).sort({ priority: -1, createdAt: -1 });
    return NextResponse.json(tasks, { status: 200 });
  } catch (err: any) {
    console.error("GET /api/tasks error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { auth } = await import("../../../lib/auth");
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { taskSchema } = await import("../../../lib/validations");
    const parsed = taskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { dbConnect } = await import("../../../lib/db");
    await dbConnect();

    const TaskModule = await import("../../../models/Task");
    const Task = TaskModule.default;

    const doc = await Task.create({
      ...parsed.data,
      userId: session.user.id,
    });

    return NextResponse.json(doc, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/tasks error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
