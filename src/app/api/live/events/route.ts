import { NextResponse } from "next/server";
import { liveWorkspaces } from "@/lib/sandbox/workspaces";
import { sportEngineRegistry } from "@/lib/sports/registry";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    mode: "sandbox",
    generatedAt: new Date().toISOString(),
    warning:
      "Synthetic workspaces are explicit placeholders until live provider keys and persistence are connected.",
    engines: sportEngineRegistry,
    events: liveWorkspaces.map((workspace) => ({
      id: workspace.id,
      sport: workspace.sport,
      sportLabel: workspace.sportLabel,
      competition: workspace.competition,
      clock: workspace.clock,
      period: workspace.period,
      home: {
        code: workspace.homeCode,
        name: workspace.homeName,
        score: workspace.homeScore,
      },
      away: {
        code: workspace.awayCode,
        name: workspace.awayName,
        score: workspace.awayScore,
      },
      pulse: workspace.pulse,
      markets: workspace.markets,
      repriced: workspace.repriced,
      stateId: workspace.stateId,
      modelVersion: workspace.modelVersion,
      primarySignal: {
        label: workspace.opportunities[0].selection.label,
        decision: workspace.opportunities[0].decision,
        probability: workspace.opportunities[0].fairProbability,
        marketOdds: workspace.opportunities[0].marketOdds,
        fairOdds: workspace.opportunities[0].fairOdds,
        edge: workspace.opportunities[0].probabilityEdge,
      },
    })),
  });
}
