import { NextResponse } from "next/server";
import { workspaceById } from "@/lib/sandbox/workspaces";
import { getPersistedObservation } from "@/lib/live/persisted-observation";

export const dynamic = "force-dynamic";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "id query parameter is required" },
      { status: 400 },
    );
  }

  const sandbox = workspaceById[id];
  if (sandbox) {
    return NextResponse.json({
      mode: "sandbox",
      generatedAt: new Date().toISOString(),
      workspace: sandbox,
    });
  }

  if (!uuidPattern.test(id)) {
    return NextResponse.json(
      { error: "workspace not found" },
      { status: 404 },
    );
  }

  try {
    const observation = await getPersistedObservation(id);
    if (!observation) {
      return NextResponse.json(
        { error: "persisted event not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      mode: "persisted-observation",
      generatedAt: new Date().toISOString(),
      observation,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Persisted workspace read failed",
      },
      { status: 503 },
    );
  }
}
