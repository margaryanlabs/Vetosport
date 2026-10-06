import type { Sport } from "@/lib/domain/types";

export interface SportEngineDefinition {
  sport: Sport;
  label: string;
  engine: string;
  families: number;
  status: "active" | "next";
  descriptor: string;
}

export const sportEngineRegistry: SportEngineDefinition[] = [
  {
    sport: "football",
    label: "FOOTBALL",
    engine: "GOAL-STATE",
    families: 11,
    status: "active",
    descriptor: "tempo · xG · scoreline · Asian",
  },
  {
    sport: "basketball",
    label: "BASKETBALL",
    engine: "POSSESSION",
    families: 8,
    status: "active",
    descriptor: "pace · shot quality · rotations",
  },
  {
    sport: "tennis",
    label: "TENNIS",
    engine: "POINT-STATE",
    families: 7,
    status: "active",
    descriptor: "serve · return · hold tree",
  },
  {
    sport: "hockey",
    label: "HOCKEY",
    engine: "SHIFT / GOALIE",
    families: 6,
    status: "next",
    descriptor: "shifts · goalie · manpower",
  },
  {
    sport: "baseball",
    label: "BASEBALL",
    engine: "PITCH / INNING",
    families: 8,
    status: "next",
    descriptor: "pitch · bullpen · inning state",
  },
  {
    sport: "mma",
    label: "MMA",
    engine: "ROUND / FIGHT",
    families: 6,
    status: "next",
    descriptor: "round · pace · damage · control",
  },
  {
    sport: "esports",
    label: "ESPORTS",
    engine: "MAP / ECONOMY",
    families: 7,
    status: "next",
    descriptor: "map · economy · objective state",
  },
];
