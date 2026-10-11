import {NextResponse} from "next/server";
import {providerConfiguration} from "@/lib/providers/factory";
import {persistenceConfiguration} from "@/lib/persistence/factory";
import {BOARD_VERSION,MISSIONS,SOURCES} from "@/lib/research/mission-control/catalog";
import {runQuoteSelfcheck} from "@/lib/research/mission-control/quotes";
export const dynamic="force-dynamic";
export function GET(){
 const providers=providerConfiguration();
 const storage=persistenceConfiguration();
 const odds=providers.theOddsApi;
 const quoteCheck=runQuoteSelfcheck();
 return NextResponse.json({
  model:BOARD_VERSION,
  generatedAt:new Date().toISOString(),
  surface:"RESEARCH_OPERATIONS_NO_BETTING",
  missions:MISSIONS,
  sources:SOURCES,
  prerequisites:{
   quoteAdapterKeyConfigured:odds.configured,
   quoteAllowlistConfigured:odds.sportKeysConfigured,
   quoteSportsAllowlist:odds.sportKeys,
   quoteRegions:odds.regions,
   quoteMarkets:odds.markets,
   persistenceConfigured:storage.supabaseConfigured,
   cronSecretConfigured:Boolean(process.env.CRON_SECRET),
   ingestionSecretConfigured:Boolean(process.env.INGESTION_SECRET),
   blocked:!odds.configured||!odds.sportKeysConfigured||!storage.supabaseConfigured||!process.env.CRON_SECRET,
   authorizedProviderDataRedistribution:false,
   priceCurrent:false,
   actualObservedQuotes:0,
   note:"Configuration flags are NOT evidence of current executable prices. This endpoint makes ZERO requests to external odds providers.",
  },
  quoteCheck,
  caveat:"Tasks are operational plans; user personal completion state is stored only in their browser."
 },{status:quoteCheck.passed?200:500,headers:{"Cache-Control":"no-store"}});
}
