import { SupabaseRestPersistence } from "./supabase-rest";

export const persistenceConfiguration = () => ({
  supabaseConfigured: Boolean(
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  ),
  tablePrefix: process.env.SUPABASE_TABLE_PREFIX ?? "",
});

export const getPersistence = () => {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const tablePrefix = process.env.SUPABASE_TABLE_PREFIX ?? "";

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured for persistence.",
    );
  }

  return new SupabaseRestPersistence({ url, serviceRoleKey, tablePrefix });
};
