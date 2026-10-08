import { NextResponse } from "next/server";
import { providerConfiguration } from "@/lib/providers/factory";
import { persistenceConfiguration } from "@/lib/persistence/factory";

export function GET() {
  const config = providerConfiguration();
  const persistence = persistenceConfiguration();
  const directCount = Object.values(config).filter(
    (provider) => provider.configured,
  ).length;
  const canonicalGatewayConfigured = Boolean(
    process.env.INGESTION_SECRET && persistence.supabaseConfigured,
  );

  const mode =
    directCount === 2
      ? "live-ready"
      : directCount > 0
        ? "partially-configured"
        : canonicalGatewayConfigured
          ? "gateway-ready"
          : "sandbox";

  return NextResponse.json({
    mode,
    providers: {
      canonicalGateway: {
        role: "provider-neutral normalized live push",
        configured: canonicalGatewayConfigured,
        endpoint: "/api/ingest/live/canonical",
      },
      sportmonks: {
        role: "football event/live data",
        configured: config.sportmonks.configured,
        keyRequired: true,
      },
      theOddsApi: {
        role: "multi-book odds + historical snapshots",
        configured: config.theOddsApi.configured,
        keyRequired: true,
      },
    },
    persistence: {
      configured: persistence.supabaseConfigured,
      mode: persistence.storageMode,
      namespace: persistence.tablePrefix || "public",
    },
  });
}
