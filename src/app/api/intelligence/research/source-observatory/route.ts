import { NextResponse } from "next/server";
import { getPersistence, persistenceConfiguration } from "@/lib/persistence/factory";
import { analyzeStoredQuotes, emptySourceReport } from "@/lib/research/mission-control/source-observatory";

export const dynamic = "force-dynamic";

/**
 * No calls to bookmakers, no quotes synthesized and no model/trading promotion.
 * Reads at most 30 recent events / 600 persisted quote snapshots.
 * Price-level redistribution is opt-in ONLY after the operator verifies license rights.
 */
export async function GET() {
  const generatedAt = new Date().toISOString();
  const headers = { "Cache-Control": "no-store" };
  if (!persistenceConfiguration().supabaseConfigured) {
    return NextResponse.json(emptySourceReport(generatedAt, "NOT_CONFIGURED"), { headers });
  }
  try {
    const db = getPersistence();
    const nowMs = Date.parse(generatedAt);
    const events = await db.listRecentEvents({
      from: new Date(nowMs - 24 * 60 * 60 * 1000).toISOString(),
      to: new Date(nowMs + 24 * 60 * 60 * 1000).toISOString(),
      limit: 30,
    });
    const quotes = events.length
      ? await db.listRecentQuotesForEvents({ eventIds: events.map(e => e.id), limit: 600 })
      : [];
    const report = analyzeStoredQuotes({
      events,
      quotes,
      now: generatedAt,
      allowPublicPriceDisplay: process.env.VETO_SPORT_RESEARCH_QUOTES_PUBLIC === "true",
    });
    return NextResponse.json(report, { headers });
  } catch {
    // Never expose upstream credentials, internal database errors or assumed quotes.
    return NextResponse.json(emptySourceReport(generatedAt, "READ_UNAVAILABLE"), {
      status: 503,
      headers,
    });
  }
}
