import type {LiveEventSummary} from "@/lib/live/types";
import type {PersistedMarketQuoteRecord} from "@/lib/persistence/contracts";
import {readFootballMinute} from "@/lib/research/watchlist/engine";

export type RadarStatus="PASS"|"WATCH"|"PAPER";
export interface RadarCase{
 id:string;
 event:Pick<LiveEventSummary,"id"|"source"|"sport"|"competition"|"status"|"homeName"|"awayName"|"homeScore"|"awayScore"|"clock"|"lastUpdatedAt">;
 status:RadarStatus;
 scenario:"UNDER_4_5_LATE_1_1"|"GENERAL_OBSERVATION";
 scoreAgeSeconds:number|null;
 priceAgeSeconds:number|null;
 quote?:{source:string;bookmaker:string;label:string;decimalOdds:number;capturedAt:string;marketKey:string;selectionKey:string};
 reasons:string[];
 evidence:{freshScore:boolean;verifiedQuote:boolean;independentProbability:false;executionVerified:false};
 researchOnly:true;
}
const ageSeconds=(ts:string|undefined,now:number):number|null=>{
 const t=ts?Date.parse(ts):NaN;
 return Number.isFinite(t)&&Number.isFinite(now)&&t<=now?Math.floor((now-t)/1000):null;
};
const eligibleUnder45=(q:PersistedMarketQuoteRecord)=>{
 // Explicit 4.5 total Under selection, not "under" without a specific line.
 const raw=(q.selectionKey+" "+q.selectionLabel).toLowerCase();
 const under=/\bunder\b/.test(raw);
 const line=q.line===4.5||/(?:^|[^0-9])4[.,]5(?:[^0-9]|$)/.test(raw);
 const totals=/total|under|api-football\.live/i.test(q.marketKey);
 return under&&line&&totals;
};
export function analyzeRadarCase(event:LiveEventSummary,quotes:PersistedMarketQuoteRecord[],at:string):RadarCase{
 const now=Date.parse(at);
 const age=ageSeconds(event.lastUpdatedAt,now);
 const fresh=event.source==="persisted"&&event.status==="live"&&age!==null&&age<=120;
 const minute=readFootballMinute(event.clock);
 const condition=event.sport==="football"&&event.homeScore==="1"&&event.awayScore==="1"&&minute!==null&&minute>=80&&minute<=105;
 const candidates=quotes.filter(q=>q.eventId===event.id&&q.provider!=="normalized"&&eligibleUnder45(q)&&
  Number.isFinite(q.decimalOdds)&&q.decimalOdds>1&&q.decimalOdds<=1000&&!q.suspended)
  .sort((a,b)=>Date.parse(b.capturedAt)-Date.parse(a.capturedAt));
 const verifiedQuote=candidates.find(q=>{const seconds=ageSeconds(q.providerLastUpdate??q.capturedAt,now);return seconds!==null&&seconds<=120;});
 const latest=candidates[0];
 const priceAge=ageSeconds(latest?.providerLastUpdate??latest?.capturedAt,now);
 const evidence={freshScore:fresh,verifiedQuote:Boolean(verifiedQuote),independentProbability:false as const,executionVerified:false as const};
 let status:RadarStatus="PASS",reasons:string[]=[];
 if(event.source!=="persisted")reasons=["Учебный источник. Демо не участвует в реальном радаре."];
 else if(!fresh)reasons=[age===null?"Нет проверенного времени снимка матча.":`Снимок матча устарел (${Math.floor(age/60)} мин). Бесплатное обновление не является live-трансляцией.`];
 else if(!condition){status="WATCH";reasons=["Матч подтверждён, но исследовательское условие 1:1 после 80-й минуты не выполнено.","Никакого статистически подтверждённого преимущества нет."];}
 else if(!verifiedQuote){status="WATCH";reasons=["Исследовательское условие 1:1 после 80' присутствует.","Нет свежей подтверждённой цены на конкретный Under 4.5."];}
 else {status="PAPER";reasons=["Есть свежие снимки матча и рынка Under 4.5.","Только виртуальная проверка: независимая вероятность, доступность исполнения и преимущество НЕ доказаны."];}
 return {
  id:event.id,event:{id:event.id,source:event.source,sport:event.sport,competition:event.competition,
   status:event.status,homeName:event.homeName,awayName:event.awayName,
   homeScore:event.homeScore,awayScore:event.awayScore,clock:event.clock,lastUpdatedAt:event.lastUpdatedAt},
  status,scenario:condition?"UNDER_4_5_LATE_1_1":"GENERAL_OBSERVATION",
  scoreAgeSeconds:age,priceAgeSeconds:priceAge,
  ...(status==="PAPER"&&verifiedQuote?{quote:{source:verifiedQuote.provider,bookmaker:verifiedQuote.bookmaker,
   label:verifiedQuote.selectionLabel,decimalOdds:verifiedQuote.decimalOdds,capturedAt:verifiedQuote.capturedAt,
   marketKey:verifiedQuote.marketKey,selectionKey:verifiedQuote.selectionKey}}:{}),
  reasons,evidence,researchOnly:true,
 };
}
export function buildRadar(input:{events:LiveEventSummary[];quotes:PersistedMarketQuoteRecord[];at:string;limit?:number}){
 const order:{[K in RadarStatus]:number}={PAPER:0,WATCH:1,PASS:2};
 const rows=input.events.filter(e=>e.source==="persisted"&&e.sport==="football")
  .map(e=>analyzeRadarCase(e,input.quotes,input.at))
  .sort((a,b)=>order[a.status]-order[b.status]||
   (a.scoreAgeSeconds??Infinity)-(b.scoreAgeSeconds??Infinity))
  .slice(0,Math.min(40,Math.max(1,input.limit??12)));
 return{model:"veto.opportunity-radar.research-v1",generatedAt:input.at,
  source:"PERSISTED_ONLY" as const,automaticBettingEnabled:false,validatedEdgeCount:0,
  counts:{paper:rows.filter(e=>e.status==="PAPER").length,watch:rows.filter(e=>e.status==="WATCH").length,pass:rows.filter(e=>e.status==="PASS").length},
  rows};
}
export function radarSelfcheck(){
 const at="2026-10-12T12:00:00Z";
 const event:LiveEventSummary={id:"test",source:"persisted",sport:"football",sportLabel:"Футбол",competition:"Test",
  status:"live",clock:"83′",period:"2H",homeCode:"A",awayCode:"B",homeName:"A",awayName:"B",
  homeScore:"1",awayScore:"1",pulse:"quiet",markets:0,repriced:0,intelligenceReady:false,lastUpdatedAt:"2026-10-12T11:59:30Z"};
 const quote:PersistedMarketQuoteRecord={eventId:"test",provider:"api-football-live-odds",
  bookmaker:"API-Football · букмекер не указан",marketKey:"api-football.live.36",selectionKey:"under:4.5",selectionLabel:"Under · 4.5",
  line:4.5,decimalOdds:1.25,capturedAt:"2026-10-12T11:59:30Z",suspended:false};
 const run=(e=event,qs:PersistedMarketQuoteRecord[]=[quote])=>analyzeRadarCase(e,qs,at);
 const cases=[
  {name:"Fresh exact source quote = paper only",pass:run().status==="PAPER"&&!run().evidence.executionVerified},
  {name:"No quote = watch",pass:run(event,[]).status==="WATCH"},
  {name:"Stale score = pass",pass:run({...event,lastUpdatedAt:"2026-10-12T11:30:00Z"}).status==="PASS"},
  {name:"Demo = pass",pass:run({...event,source:"sandbox"}).status==="PASS"},
  {name:"Other score = watch",pass:run({...event,homeScore:"2"}).status==="WATCH"},
  {name:"Old quote = watch",pass:run(event,[{...quote,capturedAt:"2026-10-12T11:40:00Z"}]).status==="WATCH"},
  {name:"Suspended quote = watch",pass:run(event,[{...quote,suspended:true}]).status==="WATCH"},
  {name:"Other total line = watch",pass:run(event,[{...quote,line:3.5,selectionLabel:"Under 3.5",selectionKey:"under:3.5"}]).status==="WATCH"},
  {name:"Unrelated event quote = watch",pass:run(event,[{...quote,eventId:"other"}]).status==="WATCH"},
  {name:"Unknown quote source = watch",pass:run(event,[{...quote,provider:"normalized"}]).status==="WATCH"},
  {name:"Future provider time rejected",pass:run(event,[{...quote,capturedAt:"2026-10-12T12:03:00Z"}]).status==="WATCH"},
  {name:"No validated edge ever fabricated",pass:buildRadar({events:[event],quotes:[quote],at}).validatedEdgeCount===0},
 ];
 return{passed:cases.every(x=>x.pass),cases};
}
