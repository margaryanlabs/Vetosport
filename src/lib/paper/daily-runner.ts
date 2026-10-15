/** Invoked by an EXISTING authorized Vercel cron, never by the public UI.
 * Sampling is observational and forward-only; no new odds-provider fetches.
 */
import {getPersistence,persistenceConfiguration} from "@/lib/persistence/factory";
import type {PersistedEvent} from "@/lib/persistence/contracts";
import {INITIAL_PAPER_BANK,DAILY_PAPER_STAKE,DAILY_PROTOCOL,MAX_PAPER_PICKS_PER_DAY,
 accountFromPaper,confirmForwardPaper,paperDay,proposeForwardPaper,
 type DailyPaperPick} from "@/lib/paper/daily-research";

export type DailyPaperTick={
 ok:boolean;asOf:string;mode:"PAPER_ONLY";simulatedBank:200;
 source:"PERSISTED_ONLY";externalProviderCalls:0;realBetsPlaced:0;
 scanned:number;eligible:number;recorded:number;settled:number;
 limitHit:boolean;skipped?:string;errors:number;
};
export async function runDailyPaperTick(input:{
 observedEvents:PersistedEvent[];asOf:string;capture:boolean;
}):Promise<DailyPaperTick>{
 const report:DailyPaperTick={ok:true,asOf:input.asOf,mode:"PAPER_ONLY",
  simulatedBank:INITIAL_PAPER_BANK,source:"PERSISTED_ONLY",externalProviderCalls:0,
  realBetsPlaced:0,scanned:0,eligible:0,recorded:0,settled:0,limitHit:false,errors:0};
 if(!persistenceConfiguration().supabaseConfigured)return {...report,ok:false,skipped:"STORAGE_DISABLED"};
 const store=getPersistence();
 const day=paperDay(input.asOf);
 // Fail closed on missing schema or storage. No in-memory success fakes.
 let existing:DailyPaperPick[];
 let settled;
 try{
  [existing,settled]=await Promise.all([
   store.listPaperDailyPicks(900),store.listPaperDailySettlements(900)]);
 }catch{return {...report,ok:false,skipped:"PAPER_STORAGE_NOT_READY"};}
 // Refuse to trade or publish precise wealth maths once the bounded history
 // risks dropping old losses, wins or open exposures.
 if(existing.length>=900||settled.length>=900)
  return {...report,ok:false,skipped:"LEDGER_HISTORY_WINDOW_EXHAUSTED"};
 const settledIds=new Set(settled.map(x=>x.pickId));
 const open=existing.filter(x=>x.protocol===DAILY_PROTOCOL&&!settledIds.has(x.id));
 // Reconcile at most 8 unresolved fixtures per five-minute tick, oldest first;
 // over successive existing cron runs every pending fixture gets considered.
 const sortedOpen=open.sort((a,b)=>Date.parse(a.pickedAt)-Date.parse(b.pickedAt));
 const scanOffset=sortedOpen.length?Math.floor(Date.parse(input.asOf)/(5*60_000))%sortedOpen.length:0;
 const outstanding=Array.from({length:Math.min(2,sortedOpen.length)},
  (_,i)=>sortedOpen[(scanOffset+i)%sortedOpen.length]);
 for(const pick of outstanding){
  try{
   const event=await store.getEventById(pick.eventId);
   if(!event||event.event.status!=="finished")continue;
   const states=await store.listRecentEventStates({eventIds:[pick.eventId],limit:800});
   if(states.length>=800)continue; // uncertain history, no invented outcome
   const final=confirmForwardPaper(pick,event,states,input.asOf);
   if(final&&await store.insertPaperDailySettlement(final)){
    settled.push(final);settledIds.add(pick.id);report.settled++;
   }
  }catch{report.errors++;}
 }
 if(!input.capture)return {...report,ok:report.errors===0,skipped:"SETTLEMENT_ONLY"};
 const bank=accountFromPaper(existing,settled);
 if(bank.available<DAILY_PAPER_STAKE)return {...report,skipped:"INSUFFICIENT_VIRTUAL_BANK"};
 const today=existing.filter(x=>x.protocol===DAILY_PROTOCOL&&x.dayUTC===day);
 const remaining=MAX_PAPER_PICKS_PER_DAY-today.length;
 if(remaining<=0)return {...report,limitHit:true,skipped:"THREE_DAILY_PAPER_PICKS_ALREADY_RECORDED"};
 const already=new Set(existing.map(x=>x.eventId));
 const candidates=input.observedEvents.filter(e=>e.event.sport==="football"&&
   e.event.status==="live"&&!already.has(e.id));
 // Round robin to cover eligible events across repeated 5-minute cron runs.
 const offset=candidates.length?Math.floor(Date.parse(input.asOf)/(5*60_000))%candidates.length:0;
 const events=Array.from({length:Math.min(3,candidates.length)},
  (_,i)=>candidates[(offset+i)%candidates.length]);
 report.scanned=events.length;
 if(!events.length)return {...report,skipped:"NO_NEW_LIVE_FIXTURE"};
 // Missing/partial source rows must not be counted as filled matches. Read
 // independently per fixture to prevent one busy match from crowding the rest.
 const proposals=[];
 for(const event of events){
  try{
   const [[state,quote,prediction]]=await Promise.all([
    Promise.all([
     store.listRecentEventStates({eventIds:[event.id],limit:120}),
     store.listRecentQuotesForEvents({eventIds:[event.id],limit:300}),
     store.listRecentPredictionsForEvents({eventIds:[event.id],limit:120}),
    ]),
   ]);
   if(state.length>=120||quote.length>=300||prediction.length>=120)continue;
   const proposal=proposeForwardPaper({event,states:state,quotes:quote,predictions:prediction,
    asOf:input.asOf});
   if(proposal)proposals.push(proposal);
  }catch{report.errors++;}
 }
 report.eligible=proposals.length;
 // Deterministic prospective selection: rank current candidate model EV,
 // then event ID; keep one per fixture, max 3 daily. This is NOT calibrated EV.
 proposals.sort((a,b)=>(b.modelProbability*b.odds-a.modelProbability*a.odds)||
  a.eventId.localeCompare(b.eventId));
 const occupied=new Set(today.map(x=>x.dailySlot));
 let funds=bank.available;
 for(const candidate of proposals.slice(0,remaining)){
  if(funds<DAILY_PAPER_STAKE)break;
  const slot=[1,2,3].find(x=>!occupied.has(x));
  if(!slot)break;
  // One row is an actual server-time selection, NOT a backfilled calculation.
  try{
   const inserted=await store.insertPaperDailyPick({...candidate,dailySlot:slot});
   if(inserted){report.recorded++;occupied.add(slot);funds-=DAILY_PAPER_STAKE;}
  }catch{report.errors++;break;}
 }
 return {...report,ok:report.errors===0};
}
