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
    closingSource: "manual" | "terminal-consensus" | "unavailable";
    closingBookmakers?: number;
    closingCapturedAt?: string;
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

    const manualClosingOdds = input.closingPrices?.[decision.selectionKey];
    const consensus =
      manualClosingOdds == null
        ? await persistence.findClosingConsensus({
            eventId: decision.eventId,
            marketKey: decision.marketKey,
            selectionKey: decision.selectionKey,
            afterAt: decision.capturedAt,
            beforeAt: input.settledAt,
          })
        : null;

    const closingOdds = manualClosingOdds ?? consensus?.decimalOdds;
    const closingSource =
      manualClosingOdds != null
        ? "manual"
        : consensus
          ? "terminal-consensus"
          : "unavailable";

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
        closingPrice: {
          source: closingSource,
          decimalOdds: closingOdds,
          bookmakerCount: consensus?.bookmakerCount,
          sampleSize: consensus?.sampleSize,
          latestCapturedAt: consensus?.latestCapturedAt,
        },
      },
    });

    settled.push({
      decisionId: decision.decisionId,
      marketKey: decision.marketKey,
      selectionKey: decision.selectionKey,
      result,
      closingOdds,
      closingSource,
      closingBookmakers: consensus?.bookmakerCount,
      closingCapturedAt: consensus?.latestCapturedAt,
    });
  }

  return {
    eventId: input.eventId,
    finalScore: input.finalScore,
    decisionsFound: decisions.length,
    settled: settled.length,
    voids: settled.filter((row) => row.result === "void").length,
    withClosingConsensus: settled.filter(
      (row) => row.closingSource === "terminal-consensus",
    ).length,
    withoutClosingPrice: settled.filter(
      (row) => row.closingSource === "unavailable",
    ).length,
    skipped,
    rows: settled,
  };
};
