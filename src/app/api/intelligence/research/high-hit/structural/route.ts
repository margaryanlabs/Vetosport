import { NextResponse } from "next/server";
import { structuralResearchCase,structuralSelfcheck } from "@/lib/research/high-hit/structural";

export function GET(){
 const check=structuralSelfcheck();
 return NextResponse.json({
  model:"veto.zero-s.cross-sport-structural.v0.1",
  status:"STRUCTURAL_RESEARCH_ONLY",
  sports:["tennis","volleyball"],
  assumptions:["iid winning of each point/rally","constant p","standard tennis advantage scoring","volleyball set to 25, win by 2"],
  examples:{
   tennis40love:structuralResearchCase({market:"tennis-game",firstScore:3,secondScore:0,assumedPointWinProbability:.5,assumedDecimalOdds:1.05}),
   volleyball24_18:structuralResearchCase({market:"volleyball-set",firstScore:24,secondScore:18,assumedPointWinProbability:.5,assumedDecimalOdds:1.01}),
  },selfcheck:check
 },{status:check.passed?200:500,headers:{"Cache-Control":"no-store"}});
}

export async function POST(request:Request){
 try{
  const data:unknown=await request.json();
  if(!data||typeof data!=="object"||Array.isArray(data))return NextResponse.json({error:"Expected JSON object"},{status:400});
  const value=data as Record<string,unknown>;
  if(value.market!=="tennis-game"&&value.market!=="volleyball-set")
   return NextResponse.json({error:"Unknown model / market"},{status:400});
  const result=structuralResearchCase({
   market:value.market,
   firstScore:value.firstScore as number,
   secondScore:value.secondScore as number,
   assumedPointWinProbability:value.assumedPointWinProbability as number,
   assumedDecimalOdds:value.assumedDecimalOdds as number
  });
  return NextResponse.json(result,{headers:{"Cache-Control":"no-store"}});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Invalid input"},{status:422});}
}
