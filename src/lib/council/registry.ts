import type { ModelView } from "@/lib/sandbox/live";
import type { Sport } from "@/lib/domain/types";
import type { CouncilModelInput } from "@/lib/council/types";

type Meta = {
  competence: number;
  calibration: number;
  dataLineage: string[];
  featureLineage: string[];
};

const defaults: Meta = {
  competence: 0.72,
  calibration: 0.72,
  dataLineage: ["event-feed"],
  featureLineage: ["generic-state"],
};

const registry: Partial<
  Record<Sport, Record<string, Meta>>
> = {
  football: {
    state: {
      competence: 0.88,
      calibration: 0.86,
      dataLineage: ["event-feed", "score-clock", "xg-state"],
      featureLineage: ["goal-hazard", "tempo", "score-state"],
    },
    sim: {
      competence: 0.84,
      calibration: 0.83,
      dataLineage: ["event-feed", "score-clock", "xg-state"],
      featureLineage: ["goal-hazard", "trajectory-sim", "score-state"],
    },
    similar: {
      competence: 0.76,
      calibration: 0.78,
      dataLineage: ["historical-states", "event-feed"],
      featureLineage: ["nearest-state", "score-state", "tempo"],
    },
    market: {
      competence: 0.82,
      calibration: 0.9,
      dataLineage: ["market-quotes", "market-contracts"],
      featureLineage: ["market-implied", "de-vig"],
    },
    tactical: {
      competence: 0.72,
      calibration: 0.69,
      dataLineage: ["event-feed", "manual-tactical-prior"],
      featureLineage: ["tempo", "territory", "tactical-state"],
    },
  },
  basketball: {
    pace: {
      competence: 0.86,
      calibration: 0.84,
      dataLineage: ["play-by-play", "score-clock", "lineups"],
      featureLineage: ["pace", "possession-state"],
    },
    shot: {
      competence: 0.82,
      calibration: 0.8,
      dataLineage: ["play-by-play", "shot-feed", "lineups"],
      featureLineage: ["shot-quality", "possession-state"],
    },
    rotation: {
      competence: 0.76,
      calibration: 0.73,
      dataLineage: ["play-by-play", "lineups"],
      featureLineage: ["rotation-state", "minutes"],
    },
    market: {
      competence: 0.82,
      calibration: 0.9,
      dataLineage: ["market-quotes", "market-contracts"],
      featureLineage: ["market-implied", "de-vig"],
    },
    sim: {
      competence: 0.83,
      calibration: 0.82,
      dataLineage: ["play-by-play", "score-clock", "lineups"],
      featureLineage: ["pace", "possession-state", "trajectory-sim"],
    },
  },
  tennis: {
    serve: {
      competence: 0.87,
      calibration: 0.85,
      dataLineage: ["point-feed", "serve-stats"],
      featureLineage: ["serve-state", "score-state"],
    },
    return: {
      competence: 0.83,
      calibration: 0.81,
      dataLineage: ["point-feed", "serve-stats"],
      featureLineage: ["return-pressure", "score-state"],
    },
    tree: {
      competence: 0.85,
      calibration: 0.86,
      dataLineage: ["point-feed", "serve-stats"],
      featureLineage: ["point-tree", "score-state"],
    },
    market: {
      competence: 0.82,
      calibration: 0.9,
      dataLineage: ["market-quotes", "market-contracts"],
      featureLineage: ["market-implied", "de-vig"],
    },
    fatigue: {
      competence: 0.67,
      calibration: 0.65,
      dataLineage: ["match-context", "point-feed"],
      featureLineage: ["fatigue-prior", "rally-state"],
    },
  },
  hockey: {
    hazard: {
      competence: 0.86,
      calibration: 0.84,
      dataLineage: ["event-feed", "shot-feed", "score-clock"],
      featureLineage: ["goal-hazard", "shot-pressure"],
    },
    shift: {
      competence: 0.79,
      calibration: 0.76,
      dataLineage: ["event-feed", "shift-feed"],
      featureLineage: ["shift-state", "fatigue"],
    },
    goalie: {
      competence: 0.75,
      calibration: 0.72,
      dataLineage: ["event-feed", "shot-feed", "goalie-feed"],
      featureLineage: ["goalie-state", "shot-pressure"],
    },
    manpower: {
      competence: 0.9,
      calibration: 0.88,
      dataLineage: ["event-feed", "penalty-feed"],
      featureLineage: ["manpower-state", "goal-hazard"],
    },
    market: {
      competence: 0.82,
      calibration: 0.9,
      dataLineage: ["market-quotes", "market-contracts"],
      featureLineage: ["market-implied", "de-vig"],
    },
  },
};

export const buildCouncilInputs = (
  sport: Sport,
  models: ModelView[],
): CouncilModelInput[] =>
  models.map((model) => {
    const meta = registry[sport]?.[model.id] ?? defaults;
    return {
      id: model.id,
      label: model.label,
      probability: model.probability,
      confidence: model.confidence,
      competence: meta.competence,
      calibration: meta.calibration,
      dataLineage: meta.dataLineage,
      featureLineage: meta.featureLineage,
    };
  });
