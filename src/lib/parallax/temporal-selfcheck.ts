import { analyzeTemporalMarketResponse } from "@/lib/parallax/temporal";
import {
  sandboxBookmakerSeries,
  sandboxTemporalAnalysis,
  sandboxTemporalShock,
} from "@/lib/parallax/temporal-sandbox";

export const runTemporalSelfCheck = () => {
  const leader = sandboxTemporalAnalysis.fingerprints.find(
    (item) => item.bookId === "mm-a",
  );
  const follower = sandboxTemporalAnalysis.fingerprints.find(
    (item) => item.bookId === "book-c",
  );
  const stale = sandboxTemporalAnalysis.fingerprints.find(
    (item) => item.bookId === "book-d",
  );

  const flat = analyzeTemporalMarketResponse(
    sandboxTemporalShock,
    [
      {
        bookId: "flat",
        label: "FLAT",
        marketFamily: "TOTAL / U3.5",
        quotes: [
          { tMs: 0, probability: 0.699, executable: true },
          { tMs: 2000, probability: 0.699, executable: true },
          { tMs: 5000, probability: 0.7, executable: true },
          { tMs: 9000, probability: 0.701, executable: true },
        ],
      },
    ],
  ).fingerprints[0];

  const checks = [
    {
      name: "fastest responder becomes leader",
      passed:
        sandboxTemporalAnalysis.leaderBookId === "mm-a" &&
        leader?.classification === "LEADER",
    },
    {
      name: "leader reacts before slower follower",
      passed:
        leader?.reactionDelayMs != null &&
        follower?.reactionDelayMs != null &&
        leader.reactionDelayMs < follower.reactionDelayMs,
    },
    {
      name: "leader reaches half response before stale book",
      passed:
        leader?.halfLifeMs != null &&
        stale?.halfLifeMs != null &&
        (leader.reactionDelayMs ?? 0) + leader.halfLifeMs <
          (stale.reactionDelayMs ?? 0) + stale.halfLifeMs,
    },
    {
      name: "stale area is larger for slow follower",
      passed:
        leader != null &&
        stale != null &&
        stale.staleAreaPpSeconds > leader.staleAreaPpSeconds,
    },
    {
      name: "confidence remains bounded",
      passed: sandboxTemporalAnalysis.fingerprints.every(
        (item) => item.confidence >= 0 && item.confidence <= 1,
      ),
    },
    {
      name: "non-responsive series is not classified leader",
      passed:
        flat.classification === "NO-SIGNAL" &&
        flat.leaderScore <= 0.1,
    },
    {
      name: "consensus half-life exists",
      passed:
        sandboxTemporalAnalysis.consensusHalfLifeMs != null &&
        sandboxTemporalAnalysis.consensusHalfLifeMs > 0,
    },
    {
      name: "leader graph points from fastest responder",
      passed:
        sandboxTemporalAnalysis.leaderGraph.length >= 2 &&
        sandboxTemporalAnalysis.leaderGraph.every(
          (edge) => edge.from === "mm-a",
        ),
    },
  ];

  return {
    passed: checks.every((check) => check.passed),
    checks,
    sample: sandboxTemporalAnalysis,
  };
};
