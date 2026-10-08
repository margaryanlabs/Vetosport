import type { LiveEventSummary } from "@/lib/live/types";
import { liveWorkspaces } from "@/lib/sandbox/workspaces";

export const sandboxEventSummaries: LiveEventSummary[] = liveWorkspaces.map(
  (workspace) => {
    const primary = workspace.opportunities[0];
    return {
      id: workspace.id,
      source: "sandbox",
      sport: workspace.sport,
      sportLabel: workspace.sportLabel,
      competition: workspace.competition,
      status: "live",
      clock: workspace.clock,
      period: workspace.period,
      homeCode: workspace.homeCode,
      awayCode: workspace.awayCode,
      homeName: workspace.homeName,
      awayName: workspace.awayName,
      homeScore: workspace.homeScore,
      awayScore: workspace.awayScore,
      pulse: workspace.pulse,
      markets: workspace.markets,
      repriced: workspace.repriced,
      intelligenceReady: true,
      primarySignal: {
        selectionId: primary.selection.id,
        label: primary.selection.label,
        marketKey: primary.marketId,
        decision: primary.decision,
        fairProbability: primary.fairProbability,
        marketOdds: primary.marketOdds,
        edge: primary.probabilityEdge,
        score: primary.opportunityScore,
        capturedAt: new Date().toISOString(),
      },
    };
  },
);
