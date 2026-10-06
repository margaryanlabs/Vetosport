"use client";

import type { Locale } from "@/lib/domain/types";
import {
  abstainFrontier,
  pooledFrontier,
  safeFrontier,
  watchFrontier,
} from "@/lib/authority-frontier/sandbox";

const pct=(v:number)=>`${(v*100).toFixed(0)}%`;
const pp=(v:number|null)=>v===null?"—":`${(v*100).toFixed(1)} pp`;

export function AuthorityFrontierPanel({locale}:{locale:Locale}) {
  const copy=locale==="ru"
    ? {
        title:"TRANSITION AUTHORITY FRONTIER",
        subtitle:"Показывает расстояние до границ PRESERVE / WATCH / ABSTAIN, а не только текущий статус",
        warning:"COUNTERFACTUAL POLICY SURFACE · SYNTHETIC CONTROLS",
        note:"Frontier аналитически строится из калиброванной transition probability и adaptation speed. Pooled/untrusted calibration не имеет права показывать безопасный запас."
      }
    : locale==="hy"
      ? {
          title:"TRANSITION AUTHORITY FRONTIER",
          subtitle:"Ցույց է տալիս PRESERVE / WATCH / ABSTAIN սահմանների հեռավորությունը, ոչ միայն status-ը",
          warning:"COUNTERFACTUAL POLICY SURFACE · SYNTHETIC CONTROLS",
          note:"Frontier-ը կառուցվում է calibrated transition probability-ից և adaptation speed-ից։"
        }
      : {
          title:"TRANSITION AUTHORITY FRONTIER",
          subtitle:"Shows distance to PRESERVE / WATCH / ABSTAIN boundaries rather than only the current label",
          warning:"COUNTERFACTUAL POLICY SURFACE · SYNTHETIC CONTROLS",
          note:"The frontier is derived analytically from calibrated transition probability and adaptation speed. Pooled or untrusted calibration is not allowed to claim a safety margin."
        };

  const rows=[
    ["SAFE",safeFrontier],
    ["WATCH",watchFrontier],
    ["ABSTAIN",abstainFrontier],
    ["POOLED",pooledFrontier],
  ] as const;

  return (
    <section className="authorityFrontierSurface">
      <div className="authorityFrontierHead">
        <div><span className="miniLabel">PARALLAX XXVIII</span><div><h3>{copy.title}</h3><p>{copy.subtitle}</p></div></div>
        <span>{copy.warning}</span>
      </div>

      <div className="authorityFrontierGrid">
        {rows.map(([title,result])=>(
          <article key={title} className={result.current.action.toLowerCase().replaceAll("_","-")}>
            <span>{title}</span>
            <strong>{result.current.action}</strong>
            <b>P {pct(result.current.transitionProbability)}</b>
            <b>ADAPT {pct(result.current.modelAdaptationSpeed)}</b>
            <small>RISK {pct(result.current.adaptationRisk)}</small>
            <em>WATCH ΔP {pp(result.probabilityToWatch)}</em>
          </article>
        ))}
      </div>

      <div className="authorityFrontierMap">
        {safeFrontier.grid.map((point,index)=>(
          <div
            key={index}
            className={point.action.toLowerCase().replaceAll("_","-")}
            title={`P ${pct(point.transitionProbability)} · Adapt ${pct(point.modelAdaptationSpeed)} · ${point.action}`}
          >
            <span>{pct(point.transitionProbability)}</span>
            <b>{pct(point.modelAdaptationSpeed)}</b>
          </div>
        ))}
      </div>

      <div className="authorityFrontierProof">
        <div><span>CURRENT SAFE POINT</span><strong>P {pct(safeFrontier.current.transitionProbability)} · A {pct(safeFrontier.current.modelAdaptationSpeed)}</strong></div>
        <i>→</i>
        <div><span>WATCH BOUNDARY</span><strong>ΔP {pp(safeFrontier.probabilityToWatch)}</strong></div>
        <div><span>MIN ADAPT TO PRESERVE</span><strong>{safeFrontier.adaptationFloorToPreserve===null?"—":pct(safeFrontier.adaptationFloorToPreserve)}</strong></div>
      </div>

      <div className="authorityFrontierMethod"><span>METHOD / LIMITS</span><p>{copy.note}</p><code>veto.regime.authority-frontier.v1</code></div>
    </section>
  );
}
