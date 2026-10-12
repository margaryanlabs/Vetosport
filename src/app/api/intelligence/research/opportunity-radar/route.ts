import {NextResponse} from "next/server";
import {getPersistence,persistenceConfiguration} from "@/lib/persistence/factory";
import {listPersistedLiveEvents} from "@/lib/live/persisted-events";
import {buildRadar} from "@/lib/research/opportunity-radar";
export const dynamic="force-dynamic";
export async function GET(){
 const headers={"Cache-Control":"no-store","X-Robots-Tag":"noindex"};
 const at=new Date().toISOString();
 if(!persistenceConfiguration().supabaseConfigured)
   return NextResponse.json({model:"veto.opportunity-radar.research-v1",generatedAt:at,source:"NO_REAL_STORAGE",
    rows:[],counts:{paper:0,watch:0,pass:0},validatedEdgeCount:0,automaticBettingEnabled:false},
    {headers});
 try{
  const events=(await listPersistedLiveEvents()).filter(e=>e.source==="persisted"&&e.sport==="football");
  const store=getPersistence();
  const quotes=events.length?await store.listRecentQuotesForEvents({eventIds:events.map(e=>e.id),limit:2000}):[];
  return NextResponse.json(buildRadar({events,quotes,at,limit:16}),{headers});
 }catch{
  return NextResponse.json({model:"veto.opportunity-radar.research-v1",generatedAt:at,source:"READ_ERROR",
    rows:[],counts:{paper:0,watch:0,pass:0},validatedEdgeCount:0,automaticBettingEnabled:false,
    error:"Source unavailable; no opportunities generated."},{status:503,headers});
 }
}
