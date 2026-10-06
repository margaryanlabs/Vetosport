export interface ModelValidationSummary {
  modelVersion: string;
  sampleRows: number;
  leakageValid: boolean;
  brier: number;
  logLoss: number;
  expectedCalibrationError: number;
  meanClvOdds?: number;
  maxDrawdown: number;
  walkForwardWindows: number;
  positiveClvWindows: number;
  positiveRoiWindows: number;
}

export interface PromotionPolicy {
  minimumRows: number;
  minimumWalkForwardWindows: number;
  maximumEce: number;
  requiredBrierImprovement: number;
  requiredLogLossImprovement: number;
  minimumPositiveClvWindowRate: number;
  maximumDrawdownIncreaseRatio: number;
}

export const DEFAULT_PROMOTION_POLICY: PromotionPolicy = {
  minimumRows: 1000,
  minimumWalkForwardWindows: 6,
  maximumEce: 0.055,
  requiredBrierImprovement: 0.002,
  requiredLogLossImprovement: 0.002,
  minimumPositiveClvWindowRate: 0.6,
  maximumDrawdownIncreaseRatio: 1.15,
};

export interface PromotionGateResult {
  promoted: boolean;
  decision: "PROMOTE" | "HOLD" | "REJECT";
  score: number;
  reasons: string[];
  checks: Array<{
    id: string;
    passed: boolean;
    detail: string;
  }>;
}

export const evaluateModelPromotion = (
  champion: ModelValidationSummary,
  challenger: ModelValidationSummary,
  policy: PromotionPolicy = DEFAULT_PROMOTION_POLICY,
): PromotionGateResult => {
  const checks: PromotionGateResult["checks"] = [];

  const push = (id: string, passed: boolean, detail: string) =>
    checks.push({ id, passed, detail });

  push(
    "leakage",
    challenger.leakageValid,
    challenger.leakageValid ? "No leakage errors." : "Leakage guard failed.",
  );

  push(
    "sample",
    challenger.sampleRows >= policy.minimumRows,
    \`\${challenger.sampleRows}/\${policy.minimumRows} required rows.\`,
  );

  push(
    "walk-forward",
    challenger.walkForwardWindows >= policy.minimumWalkForwardWindows,
    \`\${challenger.walkForwardWindows}/\${policy.minimumWalkForwardWindows} required windows.\`,
  );

  const brierImprovement = champion.brier - challenger.brier;
  push(
    "brier",
    brierImprovement >= policy.requiredBrierImprovement,
    \`Brier improvement \${brierImprovement.toFixed(4)}; required \${policy.requiredBrierImprovement.toFixed(4)}.\`,
  );

  const logLossImprovement = champion.logLoss - challenger.logLoss;
  push(
    "log-loss",
    logLossImprovement >= policy.requiredLogLossImprovement,
    \`Log-loss improvement \${logLossImprovement.toFixed(4)}; required \${policy.requiredLogLossImprovement.toFixed(4)}.\`,
  );

  push(
    "calibration",
    challenger.expectedCalibrationError <= policy.maximumEce,
    \`ECE \${challenger.expectedCalibrationError.toFixed(4)}; max \${policy.maximumEce.toFixed(4)}.\`,
  );

  const positiveClvRate =
    challenger.walkForwardWindows > 0
      ? challenger.positiveClvWindows / challenger.walkForwardWindows
      : 0;
  push(
    "clv-stability",
    positiveClvRate >= policy.minimumPositiveClvWindowRate,
    \`Positive CLV windows \${(positiveClvRate * 100).toFixed(1)}%; required \${(policy.minimumPositiveClvWindowRate * 100).toFixed(1)}%.\`,
  );

  const clvNotWorse =
    champion.meanClvOdds == null ||
    (challenger.meanClvOdds ?? -Infinity) >= champion.meanClvOdds;
  push(
    "clv-level",
    clvNotWorse,
    \`Champion CLV \${champion.meanClvOdds?.toFixed(4) ?? "n/a"}; challenger \${challenger.meanClvOdds?.toFixed(4) ?? "n/a"}.\`,
  );

  const drawdownLimit =
    Math.max(0.000001, champion.maxDrawdown) *
    policy.maximumDrawdownIncreaseRatio;
  push(
    "drawdown",
    challenger.maxDrawdown <= drawdownLimit,
    \`Drawdown \${challenger.maxDrawdown.toFixed(2)}; limit \${drawdownLimit.toFixed(2)}.\`,
  );

  const passed = checks.filter((check) => check.passed).length;
  const score = Math.round((passed / checks.length) * 100);
  const hardFailure = checks.some(
    (check) =>
      ["leakage", "sample", "walk-forward", "calibration"].includes(check.id) &&
      !check.passed,
  );
  const allPassed = passed === checks.length;

  const decision = allPassed ? "PROMOTE" : hardFailure ? "REJECT" : "HOLD";

  return {
    promoted: decision === "PROMOTE",
    decision,
    score,
    reasons: checks.filter((check) => !check.passed).map((check) => check.detail),
    checks,
  };
};
