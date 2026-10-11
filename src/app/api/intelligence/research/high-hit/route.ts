import { NextResponse } from "next/server";
import { HIGH_HIT_CATALOG } from "@/lib/research/high-hit/catalog";
import { analyzeHighHitEvidence, type HitRateInput } from "@/lib/research/high-hit/engine";
import { runHighHitSelfcheck } from "@/lib/research/high-hit/selfcheck";

export function GET(){
 const selfcheck=runHighHitSelfcheck();
 return NextResponse.json({
  model:"veto.zero-s.high-hit-research.v0.1",
  status:"RESEARCH_ONLY",
  candidateSports:new Set(HIGH_HIT_CATALOG.map(c=>c.sport)).size,
  catalog:HIGH_HIT_CATALOG,
  selfcheck,
  caveat:"Only historic football counts and a sourced MLB illustrative aggregate are known. Other sports hypotheses have NO verified 90% hit rates."
 },{status:selfcheck.passed?200:500,headers:{"Cache-Control":"no-store"}});
}

export async function POST(request:Request){
 try{
  const body:unknown=await request.json();
  if(!body||typeof body!=="object"||Array.isArray(body))return NextResponse.json({error:"JSON object required"},{status:400});
  const result=analyzeHighHitEvidence(body as HitRateInput);
  return NextResponse.json(result,{headers:{"Cache-Control":"no-store"}});
 }catch(e){
  return NextResponse.json({error:e instanceof Error?e.message:"Evaluation failed"},{status:422});
 }
}
