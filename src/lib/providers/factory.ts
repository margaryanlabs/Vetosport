import { SportmonksFootballClient } from "./sportmonks";
import { TheOddsApiClient } from "./the-odds-api";

const csv = (value: string | undefined, fallback = "") =>
  (value ?? fallback)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export const providerConfiguration = () => {
  const sportKeys = csv(process.env.VETO_ODDS_SPORT_KEYS);
  const markets = csv(
    process.env.VETO_ODDS_MARKETS,
    "h2h,spreads,totals",
  );
  const regions = csv(process.env.THE_ODDS_API_REGIONS, "eu");

  return {
    sportmonks: {
      configured: Boolean(process.env.SPORTMONKS_API_TOKEN),
      role: "football event/live-state feed",
    },
    theOddsApi: {
      configured: Boolean(process.env.THE_ODDS_API_KEY),
      role: "multi-book market odds + historical snapshots",
      sportKeys,
      sportKeysConfigured: sportKeys.length > 0,
      markets,
      regions,
    },
  };
};

export const getSportmonksClient = () => {
  const apiToken = process.env.SPORTMONKS_API_TOKEN;
  if (!apiToken) throw new Error("SPORTMONKS_API_TOKEN is not configured.");
  return new SportmonksFootballClient({ apiToken });
};

export const getTheOddsApiClient = () => {
  const apiKey = process.env.THE_ODDS_API_KEY;
  if (!apiKey) throw new Error("THE_ODDS_API_KEY is not configured.");

  const regions = csv(process.env.THE_ODDS_API_REGIONS, "eu");
  return new TheOddsApiClient({ apiKey, regions });
};
