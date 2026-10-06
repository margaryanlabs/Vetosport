import type { RegimeLabel } from "@/lib/regime/types";
import type {
  RegimeDwellStats,
  RegimeEpisode,
  RegimePathAssessment,
  RegimeTransitionEdge,
  RegimeTransitionGraph,
} from "@/lib/regime-graph/types";

const regimes:RegimeLabel[]=[
  "STABLE_CONTROL",
  "OPEN_TRANSITION",
  "PRESSURE_SIEGE",
  "FRAGILE_LIQUIDITY",
  "DISLOCATED",
];

const clamp=(v:number)=>Math.min(1,Math.max(0,v));

const median=(xs:number[])=>{
  if(!xs.length)return 0;
  const s=[...xs].sort((a,b)=>a-b);
  const m=Math.floor(s.length/2);
  return s.length%2?s[m]:(s[m-1]+s[m])/2;
};

const quantile=(xs:number[],q:number)=>{
  if(!xs.length)return 0;
  const s=[...xs].sort((a,b)=>a-b);
  const idx=Math.min(s.length-1,Math.max(0,Math.ceil(q*s.length)-1));
  return s[idx];
};

export const compressRegimeSequence=(sequence:RegimeLabel[]):RegimeEpisode[]=>{
  if(!sequence.length)return[];
  const episodes:RegimeEpisode[]=[];
  let start=0;
  for(let i=1;i<=sequence.length;i++){
    if(i===sequence.length||sequence[i]!==sequence[start]){
      episodes.push({
        regime:sequence[start],
        startIndex:start,
        endIndex:i-1,
        durationFrames:i-start,
      });
      start=i;
    }
  }
  return episodes;
};

export const buildRegimeTransitionGraph=(
  sequences:RegimeLabel[][],
  alpha=.5,
):RegimeTransitionGraph=>{
  const episodes=sequences.flatMap(compressRegimeSequence);
  const transitionCounts=new Map<string,number>();
  const outgoing=new Map<RegimeLabel,number>();

  for(const sequence of sequences){
    const eps=compressRegimeSequence(sequence);
    for(let i=1;i<eps.length;i++){
      const from=eps[i-1].regime;
      const to=eps[i].regime;
      const key=`${from}->${to}`;
      transitionCounts.set(key,(transitionCounts.get(key)??0)+1);
      outgoing.set(from,(outgoing.get(from)??0)+1);
    }
  }

  const edges:RegimeTransitionEdge[]=[];
  for(const from of regimes){
    const targets=regimes.filter(to=>to!==from);
    const denominator=(outgoing.get(from)??0)+alpha*targets.length;
    for(const to of targets){
      const count=transitionCounts.get(`${from}->${to}`)??0;
      edges.push({
        from,
        to,
        count,
        probability:denominator>0?(count+alpha)/denominator:1/targets.length,
      });
    }
  }

  const dwell:RegimeDwellStats[]=regimes.map(regime=>{
    const durations=episodes.filter(x=>x.regime===regime).map(x=>x.durationFrames);
    return{
      regime,
      episodes:durations.length,
      meanFrames:durations.length?durations.reduce((a,b)=>a+b,0)/durations.length:0,
      medianFrames:median(durations),
      p90Frames:quantile(durations,.9),
    };
  });

  return{edges,dwell,alpha,regimes};
};

export const assessRegimePath=(
  graph:RegimeTransitionGraph,
  from:RegimeLabel,
  to:RegimeLabel,
  currentDwellFrames:number,
):RegimePathAssessment=>{
  const edge=graph.edges.find(x=>x.from===from&&x.to===to);
  const dwell=graph.dwell.find(x=>x.regime===from);
  const transitionProbability=edge?.probability??0;
  const meanDwellFrames=Math.max(1,dwell?.meanFrames??1);
  const dwellPressure=clamp(currentDwellFrames/(meanDwellFrames*.85));
  const probabilitySupport=clamp(transitionProbability/.35);

  const plausibility=clamp(.72*probabilitySupport+.28*dwellPressure);
  const anomalyScore=1-plausibility;

  const status:RegimePathAssessment["status"]=
    transitionProbability<.08&&dwellPressure<.8
      ?"RARE"
      :anomalyScore>.52||transitionProbability<.16
        ?"WATCH"
        :"NORMAL";

  const reasons:string[]=[];
  if(transitionProbability<.08)reasons.push(`historical transition probability is only ${(transitionProbability*100).toFixed(1)}%`);
  if(dwellPressure<.5)reasons.push("current regime has not reached typical dwell duration");
  if(dwellPressure>=1)reasons.push("current regime has reached or exceeded typical dwell duration");
  if(status==="NORMAL")reasons.push("transition is historically compatible with the observed regime path");

  return{
    from,
    to,
    transitionProbability,
    currentDwellFrames,
    meanDwellFrames,
    dwellPressure,
    plausibility,
    anomalyScore,
    status,
    reasons,
  };
};
