import { NextResponse } from "next/server";
import { MODEL_CATALOG } from "@/lib/models/catalog";

export function GET() {
  return NextResponse.json({
    count: MODEL_CATALOG.length,
    models: MODEL_CATALOG,
  });
}
