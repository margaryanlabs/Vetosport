"use client";

import type { Locale } from "@/lib/domain/types";
import { badCalibration, healthyCalibration, smallCalibration } from "@/lib/calibration/sandbox";

const pct=(v:number)=>`${(v*100).toFixed(1)}%`;
const num=(v:number)=>v.toFixed(3);

export function CalibrationDriftPanel({locale}:{locale:Locale}) {
  const copy=locale==="ru"
    ? {
        title:"CALIBRATION DRIFT + FAMILY KILL SWITCH",
        subtitle:"Следит, не начала ли модель систематически переоценивать вероятность в конкретном market family",
        warning:"SYNTHETIC CALIBRATION WINDOWS · НЕ РЕАЛЬНЫЙ OOS МОНИТОРИНГ",
        note:"Kill-switch включается только при достаточной выборке и устойчивой деградации calibration. Маленькая выборка даёт WATCH, а не самоуверенный KILL."
      }
    : locale==="hy"
      ? {
          title:"CALIBRATION DRIFT + FAMILY KILL SWITCH",
          subtitle:"Հետևում է՝ model-ը չի՞ դարձել համակարգային overconfident կոնկրետ market family-ում",
          warning:"SYNTHETIC CALIBRATION WINDOWS · ՈՉ ԻՐԱԿԱՆ OOS ՄՈՆԻԹՈՐԻՆԳ",
          note:"Kill-switch-ը միանում է միայն բավարար sample-ի և կայուն calibration degradation-ի դեպքում։"
        }
      : {
          title:"CALIBRATION DRIFT + FAMILY KILL SWITCH",
          subtitle:"Detects systematic overconfidence inside a specific market family before global metrics hide it",
          warning:"SYNTHETIC CALIBRATION WINDOWS · NOT LIVE OOS MONITORING",
          note:"The kill switch requires sufficient sample and sustained calibration degradation. Small samples produce WATCH, not an overconfident KILL."
        };

  return (
    <section className="calibrationDriftSurface">
      <div className="calibrationDriftHead">
        <div><span className="miniLabel">PARALLAX XVI</span><div><h3>{copy.title}</h3><p>{copy.subtitle}</p></div></div>
        <span>{copy.warning}</span>
      </div>

      <div className="calibrationScenarioGrid">
        <Scenario title="HEALTHY WINDOW" result={healthyCalibration} />
        <Scenario title="OVERCONFIDENT WINDOW" result={badCalibration} />
        <Scenario title="SMALL SAMPLE WINDOW" result={smallCalibration} />
      </div>

      <div className="calibrationCompare">
        <div className="calibrationCompareHead"><span>METRIC</span><span>BASELINE</span><span>CURRENT</span><span>DELTA / STATE</span></div>
        <Row label="ECE" base={pct(badCalibration.baseline.ece)} current={pct(badCalibration.current.ece)} delta={pct(badCalibration.eceDelta)} bad />
        <Row label="BRIER" base={num(badCalibration.baseline.brier)} current={num(badCalibration.current.brier)} delta={num(badCalibration.brierDelta)} bad />
        <Row label="BIAS" base={pct(badCalibration.baseline.bias)} current={pct(badCalibration.current.bias)} delta={pct(badCalibration.biasDelta)} bad />
        <Row label="SLOPE" base={num(badCalibration.baseline.slope)} current={num(badCalibration.current.slope)} delta={num(badCalibration.slopeDeviation)} bad />
      </div>

      <div className="calibrationKill">
        <div><span>FAMILY</span><strong>{badCalibration.family.toUpperCase()}</strong><small>{badCalibration.league}</small></div>
        <i>→</i>
        <div><span>DRIFT SCORE</span><strong>{pct(badCalibration.score)}</strong></div>
        <i>→</i>
        <div><span>ACTION</span><strong className="negative">{badCalibration.killSwitch?"KILL FAMILY":"KEEP LIVE"}</strong></div>
        <div><span>WHY</span><p>{badCalibration.reasons.join(" · ")}</p></div>
      </div>

      <div className="calibrationDriftMethod"><span>METHOD / LIMITS</span><p>{copy.note}</p><code>veto.calibration.drift.v1</code></div>
    </section>
  );
}

function Scenario({title,result}:{title:string;result:typeof healthyCalibration}) {
  return <article className={result.status.toLowerCase()}><span>{title}</span><strong>{result.status}</strong><b>{pct(result.score)}</b><small>N={result.current.sampleSize} · ECE {pct(result.current.ece)}</small><em className={result.killSwitch?"negative":"positive"}>{result.killSwitch?"KILL":"NO KILL"}</em></article>;
}
function Row({label,base,current,delta,bad}:{label:string;base:string;current:string;delta:string;bad?:boolean}) {
  return <div className="calibrationCompareRow"><strong>{label}</strong><span>{base}</span><span>{current}</span><b className={bad?"negative":""}>{delta}</b></div>;
}
