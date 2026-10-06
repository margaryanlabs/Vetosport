import { NextResponse } from "next/server";
import { providerConfiguration } from "@/lib/providers/factory";

export function GET() {
  const config = providerConfiguration();

  return NextResponse.json({
    mode: Object.values(config).some((provider) => provider.configured)
      ? "partially-configured"
      : "sandbox",
    providers: {
      sportmonks: {
        role: "football event/live data",
        configured: config.sportmonks.configured,
      },
      theOddsApi: {
        role: "multi-book odds + historical snapshots",
        configured: config.theOddsApi.configured,
      },
    },
  });
}
