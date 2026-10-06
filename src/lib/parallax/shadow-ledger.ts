import { createHash } from "node:crypto";
import type { ParallaxAnalysis } from "@/lib/parallax/types";

export interface ParallaxShadowDecision {
  schemaVersion: "parallax.shadow.v1";
  status: "SHADOW";
  eventId: string;
  stateId: string;
  modelVersion: string;
  contractId: string;
  marketSnapshotId: string;
  fairProbability: number;
  marketProbability: number;
  robustFloor: number;
  robustGap: number;
  consistencyScore: number;
  residualRmse: number;
  uncertainty: {
    combined: number;
    model: number;
    data: number;
    execution: number;
    clock: number;
  };
  signalDecay: {
    halfLifeSeconds: number;
    ageSeconds: number;
    currentGap: number;
  };
  previousHash: string | null;
  recordHash: string;
}

const canonicalize = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalize(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(
        ([key, item]) =>
          `${JSON.stringify(key)}:${canonicalize(item)}`,
      );
    return `{${entries.join(",")}}`;
  }

  return JSON.stringify(value);
};

export const buildParallaxShadowDecision = ({
  analysis,
  eventId,
  stateId,
  modelVersion,
  marketSnapshotId,
  previousHash = null,
}: {
  analysis: ParallaxAnalysis;
  eventId: string;
  stateId: string;
  modelVersion: string;
  marketSnapshotId: string;
  previousHash?: string | null;
}): ParallaxShadowDecision => {
  const payload = {
    schemaVersion: "parallax.shadow.v1" as const,
    status: "SHADOW" as const,
    eventId,
    stateId,
    modelVersion,
    contractId: analysis.primary.contractId,
    marketSnapshotId,
    fairProbability: analysis.primary.fairProbability,
    marketProbability: analysis.primary.marketProbability,
    robustFloor: analysis.primary.robustFloor,
    robustGap: analysis.primary.robustGap,
    consistencyScore: analysis.consistencyScore,
    residualRmse: analysis.residualRmse,
    uncertainty: {
      combined: analysis.uncertainty.combined,
      model: analysis.uncertainty.model,
      data: analysis.uncertainty.data,
      execution: analysis.uncertainty.execution,
      clock: analysis.uncertainty.clock,
    },
    signalDecay: {
      halfLifeSeconds: analysis.decay.halfLifeSeconds,
      ageSeconds: analysis.decay.ageSeconds,
      currentGap: analysis.decay.currentGap,
    },
    previousHash,
  };

  const recordHash = createHash("sha256")
    .update(canonicalize(payload))
    .digest("hex");

  return {
    ...payload,
    recordHash,
  };
};
