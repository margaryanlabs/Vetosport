import type {
  ChangePointFrame,
  FeatureBaseline,
  RegimeBaseline,
  RegimeChangeAnalysis,
  RegimeLabel,
  RegimeObservation,
} from "@/lib/regime/types";

const clamp=(v:number,min=0,max=1)=>Math.min(max,Math.max(min,v));
const mean=(xs:number[])=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0;
const stdev=(xs:number[])=>{
  if(xs.length<2)return .01;
  const m=mean(xs);
  return Math.max(.01,Math.sqrt(xs.reduce((s,x)=>s+(x-m)**2,0)/(xs.length-1)));
};
const baseline=(xs:number[]):FeatureBaseline=>({mean:mean(xs),std:stdev(xs)});
const z=(value:number,b:FeatureBaseline)=>(value-b.mean)/Math.max(.01,b.std);
const logistic=(x:number)=>1/(1+Math.exp(-x));

const normalizeScores=(scores:Record<RegimeLabel,number>)=>{
  const entries=Object.entries(scores) as [RegimeLabel,number][];
  const max=Math.max(...entries.map(([,v])=>v));
  const exp=entries.map(([k,v])=>[k,Math.exp(v-max)] as const);
  const total=exp.reduce((s,[,v])=>s+v,0);
  return Object.fromEntries(exp.map(([k,v])=>[k,v/Math.max(1e-9,total)])) as Record<RegimeLabel,number>;
};

const classify=(obs:RegimeObservation,b:RegimeBaseline,surprise:number)=>{
  if(surprise<1){
    return{
      regime:"STABLE_CONTROL" as RegimeLabel,
      scores:{
        STABLE_CONTROL:.86,
        OPEN_TRANSITION:.04,
        PRESSURE_SIEGE:.04,
        FRAGILE_LIQUIDITY:.03,
        DISLOCATED:.03,
      } as Record<RegimeLabel,number>,
    };
  }

  const tempo=z(obs.tempo,b.tempo);
  const pressure=z(obs.shotPressure,b.shotPressure);
  const transition=z(obs.transitionRate,b.transitionRate);
  const territory=z(obs.territorialControl,b.territorialControl);
  const price=Math.abs(z(obs.priceVelocity,b.priceVelocity));
  const spread=z(obs.spreadStress,b.spreadStress);
  const suspension=z(obs.suspensionRisk,b.suspensionRisk);

  const raw:Record<RegimeLabel,number>={
    STABLE_CONTROL:2.1-.55*surprise-.20*Math.abs(tempo)-.18*Math.abs(transition),
    OPEN_TRANSITION:.72*Math.max(0,tempo)+.86*Math.max(0,transition)+.22*Math.max(0,pressure),
    PRESSURE_SIEGE:.92*Math.max(0,pressure)+.64*Math.max(0,territory)-.18*Math.max(0,transition),
    FRAGILE_LIQUIDITY:.88*Math.max(0,spread)+.82*Math.max(0,suspension)+.28*price,
    DISLOCATED:.82*price+.30*Math.max(0,spread)+.20*surprise-.22*Math.max(0,pressure),
  };
  const scores=normalizeScores(raw);
  const regime=(Object.entries(scores) as [RegimeLabel,number][]).sort((a,b)=>b[1]-a[1])[0][0];
  return{regime,scores};
};

export const analyzeRegimeChange=(
  rows:RegimeObservation[],
  {baselineCount=10,ewmaAlpha=.34,cusumDrift=1.05}:{baselineCount?:number;ewmaAlpha?:number;cusumDrift?:number}={}
):RegimeChangeAnalysis=>{
  if(rows.length<Math.max(4,baselineCount))throw new Error("Not enough observations for regime analysis.");
  const baseRows=rows.slice(0,baselineCount);
  const b:RegimeBaseline={
    tempo:baseline(baseRows.map(x=>x.tempo)),
    shotPressure:baseline(baseRows.map(x=>x.shotPressure)),
    transitionRate:baseline(baseRows.map(x=>x.transitionRate)),
    territorialControl:baseline(baseRows.map(x=>x.territorialControl)),
    priceVelocity:baseline(baseRows.map(x=>x.priceVelocity)),
    spreadStress:baseline(baseRows.map(x=>x.spreadStress)),
    suspensionRisk:baseline(baseRows.map(x=>x.suspensionRisk)),
  };

  let ewma=0,cusum=0,persistence=0;
  const frames:ChangePointFrame[]=rows.map((obs,index)=>{
    if(index<baselineCount){
      return{
        timeMs:obs.timeMs,
        surprise:0,
        ewmaShift:0,
        cusum:0,
        persistence:0,
        changeProbability:0,
        regime:"STABLE_CONTROL",
        regimeScores:{STABLE_CONTROL:1,OPEN_TRANSITION:0,PRESSURE_SIEGE:0,FRAGILE_LIQUIDITY:0,DISLOCATED:0},
        hardChange:false,
      };
    }

    const zs=[
      z(obs.tempo,b.tempo),
      z(obs.shotPressure,b.shotPressure),
      z(obs.transitionRate,b.transitionRate),
      z(obs.territorialControl,b.territorialControl),
      z(obs.priceVelocity,b.priceVelocity),
      z(obs.spreadStress,b.spreadStress),
      z(obs.suspensionRisk,b.suspensionRisk),
    ];
    const surprise=Math.sqrt(zs.reduce((s,x)=>s+x*x,0)/zs.length);
    ewma=ewmaAlpha*surprise+(1-ewmaAlpha)*ewma;
    cusum=Math.max(0,cusum+surprise-cusumDrift);
    persistence=surprise>=1.25?persistence+1:Math.max(0,persistence-1);

    const persistent=clamp(persistence/4);
    const cusumNorm=clamp(cusum/5);
    const rawLogit=-3.2+1.25*ewma+1.15*cusumNorm+1.05*persistent+.28*Math.max(0,surprise-1);
    const changeProbability=clamp(logistic(rawLogit));
    let {regime,scores}=classify(obs,b,surprise);
    if(changeProbability<.35&&persistence===0){
      regime="STABLE_CONTROL";
      scores={
        STABLE_CONTROL:.82,
        OPEN_TRANSITION:.05,
        PRESSURE_SIEGE:.05,
        FRAGILE_LIQUIDITY:.04,
        DISLOCATED:.04,
      };
    }
    const hardChange=changeProbability>=.72&&persistence>=3&&ewma>=1.05&&surprise>=1.25;

    return{
      timeMs:obs.timeMs,
      surprise,
      ewmaShift:ewma,
      cusum,
      persistence,
      changeProbability,
      regime,
      regimeScores:scores,
      hardChange,
    };
  });

  const changePoints=frames.filter(x=>x.hardChange);
  const current=frames[frames.length-1]??null;
  const firstChange=changePoints[0];
  const stableBeforeChange=firstChange
    ? frames.filter(x=>x.timeMs<firstChange.timeMs).slice(-3).every(x=>!x.hardChange)
    : true;
  const reasons:string[]=[];
  if(firstChange)reasons.push(`persistent structural shift detected at t=${firstChange.timeMs}ms`);
  if(current&&current.regime!=="STABLE_CONTROL")reasons.push(`current latent regime: ${current.regime}`);
  if(current&&current.changeProbability>=.5)reasons.push(`change probability ${(current.changeProbability*100).toFixed(0)}%`);

  return{
    baseline:b,
    frames,
    current,
    changePoints,
    regime:current?.regime??"STABLE_CONTROL",
    transitionConfidence:current?.changeProbability??0,
    stableBeforeChange,
    reasons,
  };
};
