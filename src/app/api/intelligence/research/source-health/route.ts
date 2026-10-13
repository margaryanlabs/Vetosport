import {NextResponse} from "next/server";
import {getPersistence,persistenceConfiguration} from "@/lib/persistence/factory";
import {sourceDescriptors,toSourceHealthView} from "@/lib/research/source-health";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store","X-Robots-Tag":"noindex"};

/** Safe public operational summary: excludes raw provider metadata, tokens,
 * user identifiers, quota and internal error messages. No external API call. */
export async function GET(){
 const at=new Date().toISOString();
 if(!persistenceConfiguration().supabaseConfigured)
  return NextResponse.json({source:"NO_REAL_STORAGE",generatedAt:at,
   providers:[],error:"Storage unavailable."},{headers});
 try{
  const store=getPersistence();
  const rows=await Promise.all(sourceDescriptors.map(async descriptor=>{
   const health=await store.listRecentProviderHealth({providerId:descriptor.id,limit:1});
   return toSourceHealthView({descriptor,latest:health[0]??null,now:at});
  }));
  return NextResponse.json({model:"veto.source-health.public-v1",generatedAt:at,
   source:"PERSISTED_ONLY",automaticBettingEnabled:false,externalProviderCalls:0,providers:rows},
   {headers});
 }catch{
  return NextResponse.json({model:"veto.source-health.public-v1",generatedAt:at,
   source:"READ_ERROR",automaticBettingEnabled:false,providers:[],
   error:"Provider history not available; no status invented."},{status:503,headers});
 }
}
