import type {
  OddsProvider,
  RealtimeSportsProvider,
  SportsDataProvider,
} from "./contracts";

export interface ProviderRegistry {
  sports?: SportsDataProvider;
  odds?: OddsProvider;
  realtime?: RealtimeSportsProvider;
}

let registry: ProviderRegistry = {};

export const configureProviders = (next: ProviderRegistry) => {
  registry = { ...registry, ...next };
};

export const getProviders = () => registry;

export const providerHealth = () => ({
  sports: Boolean(registry.sports),
  odds: Boolean(registry.odds),
  realtime: Boolean(registry.realtime),
});
