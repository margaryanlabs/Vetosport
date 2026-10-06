import { NextResponse } from "next/server";
import {
  repriceSport,
  type SportRepriceRequest,
} from "@/lib/intelligence/sport-router";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SportRepriceRequest;

    if (!body || !["football", "basketball", "tennis"].includes(body.sport)) {
      return NextResponse.json(
        { error: "sport must be football, basketball, or tennis" },
        { status: 400 },
      );
    }

    return NextResponse.json(repriceSport(body));
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Multi-sport repricing failed",
      },
      { status: 422 },
    );
  }
}
