import { analyzeCrossMarketPropagation } from "@/lib/parallax/propagation";
import {
  sandboxPropagationAnalysis,
  sandboxPropagationTraces,
} from "@/lib/parallax/propagation-sandbox";

export const runPropagationSelfCheck = () => {
  const leader = sandboxPropagationAnalysis.families.find(
    (item) => item.familyId === "total-u35",
  );
  const slowTeam = sandboxPropagationAnalysis.families.find(
    (item) => item.familyId === "away-tt-u15",
  );
  const nearbyTotal = sandboxPropagationAnalysis.families.find(
    (item) => item.familyId === "total-u45",
  );

  const aligned = analyzeCrossMarketPropagation([
    {
      familyId: "a",
      label: "A",
      baselineProbability: 0.5,
      targetProbability: 0.6,
      quotes: [
        { tMs: 0, probability: 0.5, executable: true },
        { tMs: 1000, probability: 0.52, executable: true },
        { tMs: 2000, probability: 0.55, executable: true },
        { tMs: 4000, probability: 0.59, executable: true },
        { tMs: 7000, probability: 0.6, executable: true },
      ],
    },
    {
      familyId: "b",
      label: "B",
      baselineProbability: 0.4,
      targetProbability: 0.48,
      quotes: [
        { tMs: 0, probability: 0.4, executable: true },
        { tMs: 1200, probability: 0.416, executable: true },
        { tMs: 2200, probability: 0.44, executable: true },
        { tMs: 4200, probability: 0.472, executable: true },
        { tMs: 7200, probability: 0.48, executable: true },
      ],
    },
  ]);

  const checks = [
    {
      name: "primary total becomes propagation leader",
      passed:
        sandboxPropagationAnalysis.leaderFamilyId === "total-u35" &&
        leader?.classification === "LEADER",
    },
    {
      name: "nearby total is not falsely flagged stale",
      passed:
        nearbyTotal != null &&
        nearbyTotal.classification !== "STALE-CANDIDATE",
    },
    {
      name: "slow team total is detected as stale candidate",
      passed:
        slowTeam?.classification === "STALE-CANDIDATE" &&
        sandboxPropagationAnalysis.staleCandidates.some(
          (item) => item.familyId === "away-tt-u15",
        ),
    },
    {
      name: "slow family has larger follower lag",
      passed:
        slowTeam?.followerLagMs != null &&
        nearbyTotal?.followerLagMs != null &&
        slowTeam.followerLagMs > nearbyTotal.followerLagMs,
    },
    {
      name: "stale scores are bounded",
      passed: sandboxPropagationAnalysis.families.every(
        (item) => item.staleScore >= 0 && item.staleScore <= 1,
      ),
    },
    {
      name: "aligned linked markets produce no stale candidates",
      passed: aligned.staleCandidates.length === 0,
    },
    {
      name: "propagation graph originates from leader family",
      passed:
        sandboxPropagationAnalysis.graph.length >= 3 &&
        sandboxPropagationAnalysis.graph.every(
          (edge) => edge.from === "total-u35",
        ),
    },
  ];

  return {
    passed: checks.every((check) => check.passed),
    checks,
    sample: sandboxPropagationAnalysis,
  };
};
