import { NextResponse } from "next/server";
import {
  classifyMarketShock,
  evaluateExecutionGate,
} from "@/lib/parallax/shock-execution";
import type {
  ExecutionContext,
  ShockEvidence,
} from "@/lib/parallax/shock-execution-types";

interface Body {
  evidence: ShockEvidence;
  execution?: Omit<ExecutionContext, "shockAssessment">;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;

    if (!body?.evidence) {
      return NextResponse.json(
        { error: "shock evidence is required" },
        { status: 400 },
      );
    }

    const shock = classifyMarketShock(body.evidence);

    if (!body.execution) {
      return NextResponse.json({
        model: "veto.parallax.shock-execution.v1",
        version: "0.1.0",
        generatedAt: new Date().toISOString(),
        shock,
      });
    }

    const gate = evaluateExecutionGate({
      ...body.execution,
      shockAssessment: shock,
    });

    return NextResponse.json({
      model: "veto.parallax.shock-execution.v1",
      version: "0.1.0",
      generatedAt: new Date().toISOString(),
      researchWarning:
        "RESEARCH_EDGE means the research gates survived the supplied execution assumptions. It is not a guarantee of an accepted wager, profit or future price availability.",
      shock,
      gate,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Shock execution analysis failed",
      },
      { status: 422 },
    );
  }
}
