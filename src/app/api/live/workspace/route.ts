import { NextResponse } from "next/server";
import { workspaceById } from "@/lib/sandbox/workspaces";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "id query parameter is required" },
      { status: 400 },
    );
  }

  const workspace = workspaceById[id];
  if (!workspace) {
    return NextResponse.json(
      { error: "workspace not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    mode: "sandbox",
    generatedAt: new Date().toISOString(),
    warning:
      "Synthetic event workspace. Replace the source service when provider keys and persistence are connected.",
    workspace,
  });
}
