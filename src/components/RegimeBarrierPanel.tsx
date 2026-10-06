"use client";

import type { Locale } from "@/lib/domain/types";
import {
  liquidityBarrierNear,
  openBarrierFar,
  openBarrierNear,
} from "@/lib/regime-barrier/sandbox";

const sigma=(v:number|null)=>v===null?"—":`${v.toFixed(2)}σ`;
const pct=(v:number)=>`${(v*100).toFixed(0)}%`;

export function RegimeBarrierPanel({locale}:{locale:Locale}) {
  const copy=locale==="ru"
    ? {
        title:"REGIME BARRIER / MINIMAL COUNTERFACTUAL SHIFT",
        subtitle:"Ищет минимальное устойчивое изменение state-space, которое реально переводит систему в другой regime",
        warning:"COUNTERFACTUAL SEARCH · SYNTHETIC STATE WINDOWS",
        note:"Для каждого target regime VETO perturb’ит последние несколько кадров в единицах baseline σ и rerun’ит полный change-point pipeline. Barrier cost — нормализованная дистанция до подтверждённого hard transition."
      }
    : locale==="hy"
      ? {
          title:"REGIME BARRIER / MINIMAL COUNTERFACTUAL SHIFT",
          subtitle:"Գտնում է state-space-ի նվազագույն կայուն փոփոխությունը, որը իրականում փոխում է regime-ը",
          warning:"COUNTERFACTUAL SEARCH · SYNTHETIC STATE WINDOWS",
          note:"VETO-ն perturb է անում վերջին frames-ը baseline σ-ներով և վերագործարկում ամբողջ change-point pipeline-ը։"
        }
      : {
          title:"REGIME BARRIER / MINIMAL COUNTERFACTUAL SHIFT",
          subtitle:"Finds the smallest sustained state-space move that actually pushes the system into another regime",
          warning:"COUNTERFACTUAL SEARCH · SYNTHETIC STATE WINDOWS",
          note:"For each target regime, VETO perturbs recent frames in baseline-σ units and reruns the full change-point pipeline. Barrier cost is normalized distance to a confirmed hard transition."
        };

  const cases=[
    ["OPEN / NEAR",openBarrierNear],
    ["OPEN / FAR",openBarrierFar],
    ["LIQUIDITY / NEAR",liquidityBarrierNear],
  ] as const;

  return (
    <section className="regimeBarrierSurface">
      <div className="regimeBarrierHead">
        <div><span className="miniLabel">PARALLAX XXIX</span><div><h3>{copy.title}</h3><p>{copy.subtitle}</p></div></div>
        <span>{copy.warning}</span>
      </div>

      <div className="regimeBarrierGrid">
        {cases.map(([title,result])=>(
          <article key={title}>
            <span>{title}</span>
            <strong>{result.targetRegime}</strong>
            <b>{sigma(result.barrierCost)}</b>
            <small>{result.best?.features.join(" + ") ?? "NO REACHABLE BARRIER"}</small>
            <em className={result.fragile?"negative":"positive"}>{result.fragile?"FRAGILE":"BUFFERED"}</em>
          </article>
        ))}
      </div>

      <div className="regimeBarrierCompare">
        <div><span>NEAR OPEN BARRIER</span><strong>{sigma(openBarrierNear.barrierCost)}</strong></div>
        <i>vs</i>
        <div><span>FAR OPEN BARRIER</span><strong>{sigma(openBarrierFar.barrierCost)}</strong></div>
        <div><span>INTERPRETATION</span><p>{openBarrierNear.barrierCost!==null&&openBarrierFar.barrierCost!==null&&openBarrierNear.barrierCost<openBarrierFar.barrierCost?"Near-boundary state requires less sustained perturbation to tip into OPEN_TRANSITION.":"Barrier ordering unresolved."}</p></div>
      </div>

      <div className="regimeBarrierCandidates">
        {openBarrierNear.candidates.map((candidate,index)=>(
          <article key={`${candidate.features.join("-")}-${index}`}>
            <span>#{index+1}</span>
            <strong>{candidate.features.join(" + ")}</strong>
            <b>{candidate.sigma.toFixed(1)}σ</b>
            <small>COST {candidate.cost.toFixed(2)} · P(change) {pct(candidate.changeProbability)}</small>
          </article>
        ))}
      </div>

      <div className="regimeBarrierMethod"><span>METHOD / LIMITS</span><p>{copy.note}</p><code>veto.regime.counterfactual-barrier.v1</code></div>
    </section>
  );
}
