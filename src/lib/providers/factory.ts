import { SportmonksFootballClient } from "./sportmonks";
import { TheOddsApiClient } from "./the-odds-api";

export const providerConfiguration = () => ({
  sportmonks: {
    configured: Boolean(process.env.SPORTMONKS_API_TOKEN),
  },
  theOddsApi: {
    configured: Boolean(process.env.THE_ODDS_API_KEY),
  },
});

export const getSportmonksClient = () => {
  const apiToken = process.env.SPORTMONKS_API_TOKEN;
  if (!apiToken) throw new Error("SPORTMONKS_API_TOKEN is not configured.");
  return new SportmonksFootballClient({ apiToken });
};

export const getTheOddsApiClient = () => {
  const apiKey = process.env.THE_ODDS_API_KEY;
  if (!apiKey) throw new Error("THE_ODDS_API_KEY is not configured.");

  const regions = (process.env.THE_ODDS_API_REGIONS ?? "eu")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return new TheOddsApiClient({ apiKey, regions });
};
