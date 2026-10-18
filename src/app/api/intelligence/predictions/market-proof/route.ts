import {NextResponse} from "next/server";
import {getPersistence,persistenceConfiguration} from "@/lib/persistence/factory";
import {buildProspectiveMarketProof} from "@/lib/research/prospective-market-proof";
import type {PersistedEventStateRecord} from "@/lib/persistence/contracts";
export const dynamic="force-dynamic";
export const maxDuration=60;
const headers={"Cache-Control":"no-store","X-Robots-Tag":"noindex"};
/** Outcome accountability for LOCKED prematch bookmaker market controls.
 * Reads existing storage only. No calls to bookmaker or results API. */
export async function GET(){
 const asOf=new Date().toISOString();
 if(!persistenceConfiguration().supabaseConfigured)
  return NextResponse.json({ok:false,source:"NO_REAL_STORAGE",
   reason:"SPORT_PERSISTENCE_DISABLED",rows:[],
   externalProviderCalls:0,realMoneyBets:0},{headers,status:503});
 try{
  const store=getPersistence();
  const [picks,settlements]=await Promise.all([
   store.listPaperDailyPicks(900),store.listPaperDailySettlements(900)]);
  const targets=picks.filter(p=>p.lane==="PREMATCH_ODDS_CONTROL"&&
   p.modelVersion==="ODDS_PREMATCH_DEVIG_CONTROL_V1")
   .sort((a,b)=>Date.parse(a.pickedAt)-Date.parse(b.pickedAt)||
    a.id.localeCompare(b.id));
  const uniqueIds=[...new Set(targets.map(p=>p.eventId))];
  const limited=uniqueIds.slice(0,70);
  const states:PersistedEventStateRecord[]=[];
  const events:NonNullable<Awaited<ReturnType<typeof store.getEventById>>>[]=[];
  let stateReadsMayBeCapped=false;
  for(let i=0;i<limited.length;i+=8){
   const batch=limited.slice(i,i+8);
   const [these,history]=await Promise.all([
    Promise.all(batch.map(id=>store.getEventById(id))),
    store.listRecentEventStates({eventIds:batch,limit:550}),
   ]);
   events.push(...these.filter((x):x is NonNullable<typeof x>=>x!==null));
   states.push(...history);
   if(history.length>=550)stateReadsMayBeCapped=true;
  }
  const report=buildProspectiveMarketProof({picks,settlements,events,states,asOf,
   picksMayBeCapped:picks.length>=900||settlements.length>=900,
   eventReadsMayBeCapped:uniqueIds.length>70,
   stateReadsMayBeCapped});
  return NextResponse.json({...report,readOnly:true,automaticBettingEnabled:false,
   proofBasis:"LOCKED_PREKICKOFF_PAPER_JOURNAL_PLUS_INDEPENDENT_EXACT_PROVIDER_ID_FT",
   note:"Every scored control had a committed pre-kickoff journal entry and matching independently certified FT. Binary Brier/log-loss and virtual paper PnL do NOT prove VETO model predictive advantage, bookmaker execution, or real-money profitability."},
   {headers});
 }catch{
  return NextResponse.json({ok:false,source:"READ_ERROR",rows:[],
   reason:"MARKET_PROOF_HISTORY_UNAVAILABLE",externalProviderCalls:0,
   realMoneyBets:0},{headers,status:503});
 }
}
