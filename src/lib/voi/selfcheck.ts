import { routeInformationRequests } from "@/lib/voi/engine";
import { voiCandidates, voiContext, voiRoutes } from "@/lib/voi/sandbox";

export const runVoiSelfCheck=()=>{
  const officialScore=voiRoutes.find(x=>x.id==="official-score");
  const duplicate=voiRoutes.find(x=>x.id==="duplicate-odds");
  const social=voiRoutes.find(x=>x.id==="social");

  const expired=routeInformationRequests(
    voiCandidates,
    {...voiContext,signalHalfLifeMs:350,maxLatencyMs:500}
  );

  const checks=[
    {name:"official critical refresh ranks first",passed:voiRoutes[0]?.id==="official-score"},
    {name:"critical official refresh fetches now",passed:officialScore?.action==="FETCH_NOW"},
    {name:"dependent duplicate is penalized",passed:(duplicate?.redundancyPenalty??0)>0&&(duplicate?.score??1)<(officialScore?.score??0)},
    {name:"irrelevant social source is skipped",passed:social?.action==="SKIP"},
    {name:"short half-life suppresses slow requests",passed:expired.find(x=>x.id==="tracking")?.action!=="FETCH_NOW"},
    {name:"scores remain bounded",passed:voiRoutes.every(x=>x.score>=0&&x.score<=1&&x.expectedValue>=0&&x.expectedValue<=1)},
  ];
  return{passed:checks.every(x=>x.passed),checks,sample:{routes:voiRoutes,expired}};
};
