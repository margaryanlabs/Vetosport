import type {
  DecisionHistoryRecord,
  PersistedEvent,
  PersistedEventStateRecord,
  PersistedMarketQuoteRecord,
} from "@/lib/persistence/contracts";
import type {
  LiveDecisionReadiness,
  LiveDecisionRequirement,
} from "@/lib/live/types";

const modelForSport = (sport: PersistedEvent["event"]["sport"]) =>
  sport === "football"
    ? { id: "football.goal-state", version: "football.goal-state.v1" }
    : sport === "basketball"
      ? { id: "basketball.possession-state", version: "basketball.possession-state.v1" }
      : sport === "tennis"
        ? { id: "tennis.point-state", version: "tennis.point-state.v1" }
        : sport === "hockey"
          ? { id: "hockey.shift-goalie", version: "hockey.shift-goalie.v1" }
          : sport === "baseball"
            ? { id: "baseball.inning-state", version: "baseball.inning-state.v1" }
            : undefined;

const objectValue = (value: unknown) =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

const finite = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value)
    ? value
    : typeof value === "string" &&
        value.trim() !== "" &&
        Number.isFinite(Number(value))
      ? Number(value)
      : undefined;

const positive = (value: unknown) => {
  const number = finite(value);
  return number != null && number > 0 ? number : undefined;
};

const firstFinite = (...values: unknown[]) => {
  for (const value of values) {
    const number = finite(value);
    if (number != null) return number;
  }
  return undefined;
};

const firstPositive = (...values: unknown[]) => {
  for (const value of values) {
    const number = positive(value);
    if (number != null) return number;
  }
  return undefined;
};

const productionAllowlist = () =>
  new Set(
    (process.env.VETO_PRODUCTION_MODEL_ALLOWLIST ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );

const isProductionAuthorized = (version: string | undefined) => {
  if (!version) return false;
  const allowlist = productionAllowlist();
  return allowlist.has("*") || allowlist.has(version);
};

const footballMarketMappable = (marketKey: string) =>
  [
    "football.1x2",
    "football.total_goals",
    "football.btts",
    "football.team_total",
    "football.handicap",
  ].includes(marketKey) ||
  /(?:^|\.)(h2h|totals|spreads)$/.test(marketKey);

const requirement = (
  id: string,
  label: string,
  passed: boolean,
  detail: string,
): LiveDecisionRequirement => ({ id, label, passed, detail });

export const evaluateLiveDecisionReadiness = (input: {
  event: PersistedEvent;
  state?: PersistedEventStateRecord;
  quotes: PersistedMarketQuoteRecord[];
  decision?: DecisionHistoryRecord;
}): LiveDecisionReadiness => {
  const model = modelForSport(input.event.event.sport);
  const authorized = isProductionAuthorized(model?.version);
  const eventQuotes = input.quotes.filter(
    (quote) =>
      quote.eventId === input.event.id &&
      !quote.suspended &&
      Number.isFinite(quote.decimalOdds) &&
      quote.decimalOdds > 1,
  );

  if (input.decision) {
    return {
      status: "DECISION_PRESENT",
      modelId: model?.id,
      modelVersion: model?.version,
      productionAuthorized: authorized,
      autoDecisionEligible: false,
      blockers: [],
      requirements: [
        requirement(
          "decision-ledger",
          "Immutable decision",
          true,
          "A persisted decision already exists for this event.",
        ),
      ],
    };
  }

  const baseRequirements: LiveDecisionRequirement[] = [
    requirement(
      "state-snapshot",
      "Persisted state",
      Boolean(input.state),
      input.state
        ? "Latest normalized state snapshot is available."
        : "No persisted state snapshot is available yet.",
    ),
    requirement(
      "market-quotes",
      "Market quotes",
      eventQuotes.length > 0,
      eventQuotes.length > 0
        ? `${eventQuotes.length} usable quote rows are available.`
        : "No active decimal-odds rows are available yet.",
    ),
  ];

  if (!model) {
    return {
      status: "MODEL_ADAPTER_MISSING",
      productionAuthorized: false,
      autoDecisionEligible: false,
      blockers: [
        `No persisted-state decision adapter exists for ${input.event.event.sport}.`,
      ],
      requirements: baseRequirements,
    };
  }

  if (input.event.event.sport !== "football") {
    return {
      status: "MODEL_ADAPTER_MISSING",
      modelId: model.id,
      modelVersion: model.version,
      productionAuthorized: authorized,
      autoDecisionEligible: false,
      blockers: [
        `${model.id} exists as a research engine, but persisted-state → production decision wiring is not implemented yet.`,
      ],
      requirements: [
        ...baseRequirements,
        requirement(
          "persisted-model-adapter",
          "Persisted model adapter",
          false,
          "A typed adapter is required before automatic prediction/decision writes are allowed.",
        ),
      ],
    };
  }

  const state = input.state?.state ?? {};
  const stateEvent = objectValue(state.event);
  const score =
    objectValue(state.score) ??
    objectValue(stateEvent?.score);
  const clock =
    objectValue(state.clock) ??
    objectValue(stateEvent?.clock);
  const baseline =
    objectValue(state.baseline) ??
    objectValue(state.prematchBaseline) ??
    objectValue(state.vetoBaseline);

  const scoreHome = firstFinite(
    score?.home,
    state.score_home,
    state.home_score,
  );
  const scoreAway = firstFinite(
    score?.away,
    state.score_away,
    state.away_score,
  );
  const elapsedSeconds = firstFinite(
    clock?.elapsedSeconds,
    state.elapsedSeconds,
    state.elapsed_seconds,
  );
  const baselineHome = firstPositive(
    baseline?.prematchExpectedHomeGoals,
    baseline?.homeExpectedGoals,
    state.prematchExpectedHomeGoals,
    state.prematch_expected_home_goals,
    state.baseline_home_xg,
  );
  const baselineAway = firstPositive(
    baseline?.prematchExpectedAwayGoals,
    baseline?.awayExpectedGoals,
    state.prematchExpectedAwayGoals,
    state.prematch_expected_away_goals,
    state.baseline_away_xg,
  );

  const scoreReady = scoreHome != null && scoreAway != null;
  const clockReady = elapsedSeconds != null && elapsedSeconds >= 0;
  const baselineReady = baselineHome != null && baselineAway != null;
  const mappingReady = eventQuotes.some((quote) =>
    footballMarketMappable(quote.marketKey),
  );

  const requirements: LiveDecisionRequirement[] = [
    ...baseRequirements,
    requirement(
      "score",
      "Score state",
      scoreReady,
      scoreReady
        ? `Score is available: ${scoreHome}-${scoreAway}.`
        : "Both home and away scores are required.",
    ),
    requirement(
      "live-clock",
      "Live clock",
      clockReady,
      clockReady
        ? `Elapsed clock is available: ${Math.round(elapsedSeconds!)} seconds.`
        : "elapsedSeconds is required for the live goal-state model.",
    ),
    requirement(
      "prematch-baseline",
      "Prematch goal baseline",
      baselineReady,
      baselineReady
        ? `Prematch expected goals are available: ${baselineHome!.toFixed(2)} / ${baselineAway!.toFixed(2)}.`
        : "Positive prematch expected goals for both teams are required; VETO will not invent them from the live score.",
    ),
    requirement(
      "market-mapping",
      "Market mapping",
      mappingReady,
      mappingReady
        ? "At least one quote maps to a supported football market family."
        : "No quote currently maps to football 1X2 / totals / spreads / team totals / BTTS.",
    ),
    requirement(
      "production-authority",
      "Production model authority",
      authorized,
      authorized
        ? `${model.version} is explicitly authorized for production decisions.`
        : `${model.version} is not in VETO_PRODUCTION_MODEL_ALLOWLIST; research output must not become EDGE.`,
    ),
  ];

  if (!input.state || eventQuotes.length === 0) {
    return {
      status: "DATA_PENDING",
      modelId: model.id,
      modelVersion: model.version,
      productionAuthorized: authorized,
      autoDecisionEligible: false,
      blockers: requirements.filter((item) => !item.passed).map((item) => item.detail),
      requirements,
    };
  }

  if (!scoreReady || !clockReady || !baselineReady) {
    return {
      status: "MODEL_INPUT_INCOMPLETE",
      modelId: model.id,
      modelVersion: model.version,
      productionAuthorized: authorized,
      autoDecisionEligible: false,
      blockers: requirements.filter((item) => !item.passed).map((item) => item.detail),
      requirements,
    };
  }

  if (!mappingReady) {
    return {
      status: "MARKET_MAPPING_INCOMPLETE",
      modelId: model.id,
      modelVersion: model.version,
      productionAuthorized: authorized,
      autoDecisionEligible: false,
      blockers: requirements.filter((item) => !item.passed).map((item) => item.detail),
      requirements,
    };
  }

  if (!authorized) {
    return {
      status: "GOVERNANCE_BLOCKED",
      modelId: model.id,
      modelVersion: model.version,
      productionAuthorized: false,
      autoDecisionEligible: false,
      blockers: requirements.filter((item) => !item.passed).map((item) => item.detail),
      requirements,
    };
  }

  return {
    status: "DECISION_READY",
    modelId: model.id,
    modelVersion: model.version,
    productionAuthorized: true,
    autoDecisionEligible: true,
    blockers: [],
    requirements,
  };
};
