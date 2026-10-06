import { getPersistence } from "@/lib/persistence/factory";
import { settleFootballDecision } from "@/lib/models/football/settlement";

export interface ClosingPriceMap {
  [selectionKey: string]: number | undefined;
}

export const settleFootballEvent = async (input: {
  eventId: string;
  finalScore: { home: number; away: number };
  settledAt: string;
  closingPrices?: ClosingPriceMap;
}) => {
  const persistence = getPersistence();
  const decisions = await persistence.findUnsettledDecisions(input.eventId);

  const settled: Array<{
    decisionId: string;
    marketKey: string;
    selectionKey: string;
    result: string;
    closingOdds?: number;
  }> = [];

  const skipped: Array<{
    decisionId: string;
    reason: string;
  }> = [];

  for (const decision of decisions) {
    if (decision.sport !== "football") {
      skipped.push({
        decisionId: decision.decisionId,
        reason: `Unsupported sport: ${decision.sport}`,
      });
      continue;
    }

    const result = settleFootballDecision({
      marketId: decision.marketKey,
      selectionId: decision.selectionKey,
      selectionLine: decision.selectionLine,
      selectionSide: decision.selectionSide,
      finalScore: input.finalScore,
    });

    const closingOdds = input.closingPrices?.[decision.selectionKey];

    await persistence.appendDecisionOutcome({
      decisionId: decision.decisionId,
      result,
      closingOdds,
      settledAt: input.settledAt,
      rawOutcome: {
        finalScore: input.finalScore,
        marketKey: decision.marketKey,
        selectionKey: decision.selectionKey,
        selectionLine: decision.selectionLine,
        selectionSide: decision.selectionSide,
      },
    });

    settled.push({
      decisionId: decision.decisionId,
      marketKey: decision.marketKey,
      selectionKey: decision.selectionKey,
      result,
      closingOdds,
    });
  }

  return {
    eventId: input.eventId,
    finalScore: input.finalScore,
    decisionsFound: decisions.length,
    settled: settled.length,
    voids: settled.filter((row) => row.result === "void").length,
    skipped,
    rows: settled,
  };
};
