import type { BatchFdrDecision, DiscoveryControlResult, HypothesisTest, SequentialTestDecision } from "@/lib/discovery/types";

const clampP=(p:number)=>Math.min(1,Math.max(0,p));

export const benjaminiHochberg=(tests:HypothesisTest[],q=.05):BatchFdrDecision[]=>{
  const sorted=[...tests].map(x=>({...x,pValue:clampP(x.pValue)})).sort((a,b)=>a.pValue-b.pValue);
  const m=Math.max(1,sorted.length);
  let k=0;
  sorted.forEach((test,index)=>{
    const rank=index+1;
    if(test.pValue<=q*rank/m)k=rank;
  });
  return sorted.map((test,index)=>{
    const rank=index+1;
    return{...test,rank,threshold:q*rank/m,accepted:rank<=k};
  });
};

export const sequentialAlphaSpend=(tests:HypothesisTest[],alphaBudget=.05,rho=.8):SequentialTestDecision[]=>{
  let spent=0;
  return tests.map((test,index)=>{
    const alphaAllocated=alphaBudget*(1-rho)*Math.pow(rho,index);
    spent+=alphaAllocated;
    return{
      ...test,
      pValue:clampP(test.pValue),
      index:index+1,
      alphaAllocated,
      accepted:clampP(test.pValue)<=alphaAllocated,
      cumulativeAlphaSpent:spent,
    };
  });
};

export const controlDiscovery=(
  tests:HypothesisTest[],
  {q=.05,alphaBudget=.05,rho=.8}:{q?:number;alphaBudget?:number;rho?:number}={}
):DiscoveryControlResult=>{
  const batch=benjaminiHochberg(tests,q);
  const sequential=sequentialAlphaSpend(tests,alphaBudget,rho);
  return{
    batch,
    sequential,
    discoveries:batch.filter(x=>x.accepted).length,
    tested:tests.length,
    q,
    alphaBudget,
  };
};
