import { NextResponse } from "next/server";
import { persistenceConfiguration } from "@/lib/persistence/factory";
import { listPersistedLiveEvents } from "@/lib/live/persisted-events";
import { sportEngineRegistry } from "@/lib/sports/registry";

export const dynamic = "force-dynamic";
const headers={"Cache-Control":"no-store","X-Robots-Tag":"noindex"};

/**
 * Public live-data endpoint never returns simulated fixtures on outage.
 * The frontend owns a separate, opt-in, explicitly labeled local demo mode.
 * Returning a synthetic success from a real-data API obscures outages.
 */
export async function GET() {
 const generatedAt=new Date().toISOString();
 if(!persistenceConfiguration().supabaseConfigured){
  return NextResponse.json({
   mode:"storage-unavailable",generatedAt,engines:sportEngineRegistry,
   events:[],source:"PERSISTED_ONLY",liveDataAvailable:false,
   warning:"Sports storage is not configured. No fallback match data was generated.",
  },{status:503,headers});
 }
 try{
  const events=await listPersistedLiveEvents();
  return NextResponse.json({
   mode:events.length?"persisted":"persisted-empty",
   generatedAt,engines:sportEngineRegistry,events,
   source:"PERSISTED_ONLY",liveDataAvailable:events.length>0,
   ...(events.length?{}:{warning:"No observed real matches are available in the active window. No simulated fixtures returned."}),
  },{headers});
 }catch{
  return NextResponse.json({
   mode:"storage-unavailable",generatedAt,engines:sportEngineRegistry,
   events:[],source:"PERSISTED_ONLY",liveDataAvailable:false,
   warning:"Real sports history is temporarily unavailable. No simulated fixtures returned.",
  },{status:503,headers});
 }
}
