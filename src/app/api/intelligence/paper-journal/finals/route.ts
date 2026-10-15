import {NextResponse} from "next/server";
import {getPersistence,persistenceConfiguration} from "@/lib/persistence/factory";
import {certifyStoredPaperFinal} from "@/lib/paper/paper-verification";

export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store","X-Robots-Tag":"noindex"};
const validIds=(ids:unknown):ids is string[]=>Array.isArray(ids)&&ids.length>0&&ids.length<=8&&
 ids.every(id=>typeof id==="string"&&/^[A-Za-z0-9_-]{1,100}$/.test(id))&&new Set(ids).size===ids.length;
/** Read-only, bounded, no paid sports-provider polling, no server-side bets.
 * A missing or ambiguous FT never gets invented or settled.
 */
export async function POST(request:Request){
 if(!persistenceConfiguration().supabaseConfigured)
  return NextResponse.json({ok:false,reason:"STORAGE_UNAVAILABLE",finals:[]},{status:503,headers});
 let json:unknown;
 try{
  if(Number(request.headers.get("content-length")||"0")>3000)throw Error("TOO_LARGE");
  json=await request.json();
 }catch{
  return NextResponse.json({ok:false,reason:"INVALID_BODY",finals:[]},{status:400,headers});
 }
 const ids=(json&&typeof json==="object"&&!Array.isArray(json))?
  (json as {eventIds?:unknown}).eventIds:null;
 if(!validIds(ids))return NextResponse.json({ok:false,reason:"INVALID_EVENT_IDS",finals:[]},{status:400,headers});
 try{
  const store=getPersistence();
  const [events,states]=await Promise.all([
   Promise.all(ids.map(id=>store.getEventById(id))),
   store.listRecentEventStates({eventIds:ids,limit:Math.min(1200,ids.length*150)}),
  ]);
  const now=new Date().toISOString();
  const finals=events.map(event=>certifyStoredPaperFinal(event,
   states.filter(row=>row.eventId===event?.id),now)).filter((value):value is NonNullable<typeof value>=>value!==null);
  return NextResponse.json({ok:true,checked:ids.length,certified:finals.length,finals,
   providerCalls:0,settlement:"BROWSER_LOCAL_ONLY",
   note:"API-Football FT results for exact persisted VETO fixtures; not evidence of executable bookmaker prices or profitable models."},{headers});
 }catch{
  return NextResponse.json({ok:false,reason:"STORAGE_QUERY_FAILED",finals:[]},{status:503,headers});
 }
}
