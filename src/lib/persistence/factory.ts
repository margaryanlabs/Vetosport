import { SupabaseRestPersistence } from "./supabase-rest";

const directConfigured = () =>
  Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

const bridgeConfigured = () =>
  Boolean(process.env.VETO_STORAGE_BRIDGE_URL && process.env.VETO_STORAGE_SECRET);

export const persistenceConfiguration = () => ({
  supabaseConfigured: directConfigured() || bridgeConfigured(),
  storageMode: bridgeConfigured() ? "bridge" : directConfigured() ? "direct" : "offline",
  tablePrefix: process.env.SUPABASE_TABLE_PREFIX ?? "",
});

export const getPersistence = () => {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const tablePrefix = process.env.SUPABASE_TABLE_PREFIX ?? "";
  const bridgeUrl = process.env.VETO_STORAGE_BRIDGE_URL;
  const bridgeSecret = process.env.VETO_STORAGE_SECRET;

  if (!directConfigured() && !bridgeConfigured()) {
    throw new Error(
      "Persistence is not configured. Set VETO_STORAGE_BRIDGE_URL + VETO_STORAGE_SECRET or direct Supabase server credentials.",
    );
  }

  return new SupabaseRestPersistence({
    url,
    serviceRoleKey,
    tablePrefix,
    bridgeUrl,
    bridgeSecret,
  });
};
