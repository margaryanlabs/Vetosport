/** VETO High Odds / autonomous PAPER-only forward runner.
 * No provider fetch, no wagers, no manual backfills, distinct virtual $200.
 */
import {getPersistence,persistenceConfiguration} from "@/lib/persistence/factory";
import type {PersistedEvent} from "@/lib/persistence/contracts";
import {certifyPersistedOddsScore} from "@/lib/paper/odds-score-certification";
import {highOddsAccount,highOddsLegFromEvidence,proposeHighOddsSlips,
 HIGH_ODDS_INITIAL_BANK,HIGH_ODDS_STAKE,HIGH_ODDS_MAX_DAILY_TICKETS,
 HIGH_ODDS_PROTOCOL,settleHighOddsSlip,type HighOddsSlip} from "@/lib/paper/high-odds-research";

export type HighOddsTick={
 ok:boolean;protocol:typeof HIGH_ODDS_PROTOCOL;paperOnly:true;realBetsPlaced:0;
 source:"PERSISTED_ONLY";asOf:string;found:number;scanned:number;
 candidates:number;recorded:number;settled:number;errors:number;
 reasons:Record<string,number>;skipped?:string;
};
export async function runHighOddsTick(input:{
 events:PersistedEvent[];asOf:string;capture:boolean;
}):Promise<HighOddsTick>{
 const report:HighOddsTick={ok:true,protocol:HIGH_ODDS_PROTOCOL,paperOnly:true,
  realBetsPlaced:0,source:"PERSISTED_ONLY",asOf:input.asOf,
  found:input.events.length,scanned:0,candidates:0,recorded:0,settled:0,errors:0,reasons:{}};
 if(!persistenceConfiguration().supabaseConfigured)return{...report,ok:false,skipped:"PAPER_STORAGE_DISABLED"};
 const store=getPersistence();
 let tickets:HighOddsSlip[],settlements;
 try{[tickets,settlements]=await Promise.all([
  store.listHighOddsPaperTickets(850),store.listHighOddsPaperSettlements(850),
 ]);}catch{return{...report,ok:false,skipped:"HIGH_ODDS_TABLES_NOT_READY"};}
 if(tickets.length>=850||settlements.length>=850)return{
  ...report,ok:false,skipped:"HISTORY_LIMIT_REQUIRES_PAGINATION"};
 const verified=new Set(settlements.map(x=>x.ticketId));
 // Across consecutive half-hour cron runs, rotate pending slips, not just
 // the first old unresolved one, to prevent starvation.
 const open=tickets.filter(x=>!verified.has(x.id));
 const offset=open.length?Math.floor(Date.parse(input.asOf)/(30*60_000))%open.length:0;
 const check=Array.from({length:Math.min(2,open.length)},(_,i)=>open[(offset+i)%open.length]);
 for(const slip of check){
  const finals=[];
  let complete=true;
  for(const leg of slip.legs){
   try{
    const event=await store.getEventById(leg.eventId);
    if(!event||event.event.status!=="finished"){complete=false;break;}
    const states=await store.listRecentEventStates({eventIds:[leg.eventId],limit:500});
    if(states.length>=500){complete=false;break;}
    const ft=certifyPersistedOddsScore(event,states,input.asOf);
    if(!ft){complete=false;break;}
    finals.push({eventId:leg.eventId,...ft});
   }catch{complete=false;report.errors++;break;}
  }
  if(!complete)continue;
  const proof=settleHighOddsSlip(slip,finals,input.asOf);
  if(!proof)continue;
  try{
   if(await store.insertHighOddsPaperSettlement(proof)){
    settlements.push(proof);verified.add(slip.id);report.settled++;
   }
  }catch{report.errors++;}
 }
 if(!input.capture)return{...report,ok:report.errors===0,skipped:"SETTLEMENT_ONLY"};
 const account=highOddsAccount(tickets,settlements);
 const day=input.asOf.slice(0,10);
 const today=tickets.filter(x=>x.dayUTC===day);
 if(account.available<HIGH_ODDS_STAKE||
    today.length>=HIGH_ODDS_MAX_DAILY_TICKETS)
  return{...report,skipped:"DAILY_TICKET_CAP_OR_NO_VIRTUAL_BANK"};
 const upcoming=input.events.filter(e=>e.event.status==="scheduled"&&
  e.canonicalKey.startsWith("football::epl::")&&
  /^[a-f0-9]{32}$/i.test(e.providerRefs?.["the-odds-api"]??""))
  .sort((a,b)=>Date.parse(a.event.startsAt)-Date.parse(b.event.startsAt)||
   a.id.localeCompare(b.id)).slice(0,12);
 const legs=[];
 for(const event of upcoming){
  report.scanned++;
  try{
   const quotes=await store.listRecentQuotesForEvents({eventIds:[event.id],limit:500,
    provider:"the-odds-api",marketKey:"soccer_epl.h2h",
    capturedSince:new Date(Date.parse(input.asOf)-4*3_600_000).toISOString()});
   if(quotes.length>=500){
    report.reasons.SOURCE_QUOTES_CAPPED=(report.reasons.SOURCE_QUOTES_CAPPED??0)+1;
    continue;
   }
   const leg=highOddsLegFromEvidence({event,quotes,asOf:input.asOf});
   if(leg)legs.push(leg);
   else report.reasons.COMPLETE_NATIVE_1X2_NOT_AVAILABLE=
    (report.reasons.COMPLETE_NATIVE_1X2_NOT_AVAILABLE??0)+1;
  }catch{report.errors++;}
 }
 report.candidates=legs.length;
 const proposed=proposeHighOddsSlips({legs,asOf:input.asOf,already:tickets});
 const usedSlots=new Set(today.map(t=>t.dailySlot));
 let funds=account.available;
 for(const plan of proposed.slice(0,HIGH_ODDS_MAX_DAILY_TICKETS-today.length)){
  const slot=[1,2,3].find(s=>!usedSlots.has(s));
  if(!slot||funds<HIGH_ODDS_STAKE)break;
  try{
   const written=await store.insertHighOddsPaperTicket({...plan,dailySlot:slot});
   if(written){
    tickets.push(written);usedSlots.add(slot);funds-=HIGH_ODDS_STAKE;
    report.recorded++;
   }
  }catch{report.errors++;break;}
 }
 return{...report,ok:report.errors===0,
  skipped:report.recorded===0?"NO_FULL_PROOF_LONGSHOT_BAND_OR_CAP":undefined};
}
