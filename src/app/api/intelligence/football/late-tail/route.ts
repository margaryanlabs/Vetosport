import { NextResponse } from "next/server";
import { evaluateLateTail, type LateTailInput } from "@/lib/research/late-tail/engine";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Expected JSON object" }, { status: 400 });
    }
    const result = evaluateLateTail(body as LateTailInput);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Evaluation error",
    }, { status: 422 });
  }
}
