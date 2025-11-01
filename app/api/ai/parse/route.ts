import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
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

    const { input } = body;
    if (!input || typeof input !== "string" || input.trim().length === 0) {
      return NextResponse.json(
        { error: "Input text is required" },
        { status: 400 }
      );
    }

    const { parseTaskWithAI, aiParseResultSchema } = await import("../../../../lib/ai");

    let parsedResult;
    try {
      parsedResult = await parseTaskWithAI(input);
    } catch (error: any) {
      console.error("AI parsing error:", error);

      if (error.message === "RATE_LIMIT_EXCEEDED") {
        return NextResponse.json(
          { error: "Rate limit exceeded. Please try again later." },
          { status: 429 }
        );
      }

      if (error.message?.includes("API key")) {
        return NextResponse.json(
          { error: "AI service configuration error" },
          { status: 503 }
        );
      }

      return NextResponse.json(
        { error: "Failed to parse input with AI", details: error.message },
        { status: 500 }
      );
    }

    // Validate the result (should already be validated, but double-check)
    const validated = aiParseResultSchema.safeParse(parsedResult);
    if (!validated.success) {
      console.error("Validation failed for AI result:", validated.error);
      return NextResponse.json(
        { error: "AI returned invalid data", details: validated.error.flatten() },
        { status: 500 }
      );
    }

    // Return the safe, validated payload
    return NextResponse.json(
      {
        success: true,
        data: validated.data,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("POST /api/ai/parse error:", err);
    return NextResponse.json(
      { error: "Internal Server Error", details: err.message },
      { status: 500 }
    );
  }
}
