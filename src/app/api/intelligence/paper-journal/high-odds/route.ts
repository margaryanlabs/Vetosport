import {NextResponse} from "next/server";
import {getPersistence,persistenceConfiguration} from "@/lib/persistence/factory";
import {highOddsAccount} from "@/lib/paper/high-odds-research";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store, private","X-Robots-Tag":"noindex"};
export async function GET(){
 if(!persistenceConfiguration().supabaseConfigured)return NextResponse.json({
  ok:false,reason:"PAPER_STORAGE_DISABLED",noFabricatedResults:true},
  {status:503,headers});
 try{
  const store=getPersistence();
  const [tickets,settlements,health]=await Promise.all([
   store.listHighOddsPaperTickets(850),store.listHighOddsPaperSettlements(850),
   store.listRecentProviderHealth({providerId:"veto-paper-high-odds",limit:1}),
  ]);
  // A missing prefix of ancient losses can look deceptively profitable.
  if(tickets.length>=850||settlements.length>=850)return NextResponse.json({
   ok:false,reason:"LEDGER_HISTORY_NOT_COMPLETE",noFabricatedResults:true},
   {status:503,headers});
  const now=new Date();
  return NextResponse.json({
   ok:true,generatedAt:now.toISOString(),account:highOddsAccount(tickets,settlements),
   observer:{lastHeartbeat:health[0]?.checkedAt??null,
    recent:health[0]&&now.getTime()-Date.parse(health[0].checkedAt)<90*60_000,
    source:"AUTHORISATION_GATED_CRON",
    coverageNote:"May produce zero new entries when complete, independently timestamped evidence is unavailable.",
   },
   methodology:{
    simulatedOnly:true,executableSportsbookComboPriceVerified:false,
    pricing:"Product of distinct fixture single prices; this is NOT an offered accumulator quote.",
    source:"Persisted native The Odds API single-market quotations",
    dailyTicketCap:3,virtualStakePerTicket:1,fixtureDailyMaxExposure:2,
    sameEventParlayPriced:false,scientificEdgeProven:false,
    unpricedSameGameResearch:"Single-event markets are correlated. A real combined price or calibrated joint distribution is needed.",
   },
   realBetsPlaced:0,providerCallsForThisRead:0,
  },{headers});
 }catch{
  return NextResponse.json({ok:false,reason:"HIGH_ODDS_LEDGER_UNAVAILABLE",
   noFabricatedResults:true},{status:503,headers});
 }
}
