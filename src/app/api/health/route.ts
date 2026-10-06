import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    service: "veto-sport",
    status: "ok",
    mode: "research",
    liveProviders: false,
    timestamp: new Date().toISOString(),
  });
}
