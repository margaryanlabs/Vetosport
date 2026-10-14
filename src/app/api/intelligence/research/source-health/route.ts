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
   // Existing server-side health table only; bounded to six past polls per source.
   // Public response strips raw payloads, quota, messages, secrets and IDs.
   const history=await store.listRecentProviderHealth({providerId:descriptor.id,limit:6});
   return toSourceHealthView({descriptor,latest:history[0]??null,history,now:at});
  }));
  return NextResponse.json({model:"veto.source-health.public-v2",generatedAt:at,
   source:"PERSISTED_ONLY",automaticBettingEnabled:false,externalProviderCalls:0,providers:rows},
   {headers});
 }catch{
  return NextResponse.json({model:"veto.source-health.public-v1",generatedAt:at,
   source:"READ_ERROR",automaticBettingEnabled:false,providers:[],
   error:"Provider history not available; no status invented."},{status:503,headers});
 }
}
