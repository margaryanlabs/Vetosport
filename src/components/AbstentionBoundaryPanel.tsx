"use client";

import type { Locale } from "@/lib/domain/types";
import {
  conformalBoundary,
  healthyBoundary,
  leakageBoundary,
  semanticBoundary,
  staleRegimeBoundary,
  transitionCappedBoundary,
  oodBoundary,
  weakBoundary,
} from "@/lib/abstention/sandbox";

const pct=(v:number)=>`${(v*100).toFixed(0)}%`;

export function AbstentionBoundaryPanel({locale}:{locale:Locale}) {
  const copy=locale==="ru"
    ? {
        title:"ABSTENTION / DECISION BOUNDARY",
        subtitle:"Сначала VETO пытается доказать, что имеет право вообще принимать решение",
        warning:"SYNTHETIC GATE COMPOSITION · НЕ LIVE SIGNAL AUTHORITY",
        note:"ABSTAIN — это сознательный результат системы. Hard blockers имеют приоритет над размером model gap; evidence margin не является вероятностью выигрыша."
      }
    : locale==="hy"
      ? {
          title:"ABSTENTION / DECISION BOUNDARY",
          subtitle:"VETO-ն նախ ապացուցում է, որ ընդհանրապես իրավունք ունի որոշում տալու",
          warning:"SYNTHETIC GATE COMPOSITION · ՈՉ LIVE SIGNAL AUTHORITY",
          note:"ABSTAIN-ը լիարժեք համակարգային արդյունք է։ Hard blocker-ը ավելի կարևոր է, քան մեծ model gap-ը։"
        }
      : {
          title:"ABSTENTION / DECISION BOUNDARY",
          subtitle:"VETO first proves that it has enough authority to make any decision at all",
          warning:"SYNTHETIC GATE COMPOSITION · NOT LIVE SIGNAL AUTHORITY",
          note:"ABSTAIN is a first-class system outcome. Hard blockers outrank model-gap size; evidence margin is not a win probability."
        };

  const controls=[
    ["HEALTHY EVIDENCE",healthyBoundary],
    ["LEAKAGE + HUGE GAP",leakageBoundary],
    ["SEMANTIC FREEZE",semanticBoundary],
    ["OUT OF DISTRIBUTION",oodBoundary],
    ["CONFORMAL FAILURE",conformalBoundary],
    ["STALE REGIME SNAPSHOT",staleRegimeBoundary],
    ["IMMINENT + SLOW MODEL",transitionCappedBoundary],
    ["WEAK EVIDENCE",weakBoundary],
  ] as const;

  return (
    <section className="abstentionSurface">
      <div className="abstentionHead">
        <div><span className="miniLabel">PARALLAX XVIII</span><div><h3>{copy.title}</h3><p>{copy.subtitle}</p></div></div>
        <span>{copy.warning}</span>
      </div>

      <div className="abstentionHero">
        <div>
          <span>PRIMARY DECISION</span>
          <strong className="positive">{healthyBoundary.decision}</strong>
          <small>EVIDENCE MARGIN {pct(healthyBoundary.evidenceMargin)}</small>
        </div>
        <div>
          <span>ABSTENTION PRINCIPLE</span>
          <strong>HARD GATE &gt; MODEL GAP</strong>
          <small>leakage · semantics · calibration · censoring · conformal · regime coherence · OOD · capacity</small>
        </div>
      </div>

      <div className="abstentionControls">
        {controls.map(([title,result])=>(
          <article key={title} className={result.decision.toLowerCase().replaceAll("_","-")}>
            <span>{title}</span>
            <strong>{result.decision}</strong>
            <b>{pct(result.evidenceMargin)}</b>
            <small>{result.abstentionReason ?? (result.warnings[0] ?? "all mandatory gates survived")}</small>
          </article>
        ))}
      </div>

      <div className="abstentionChecks">
        {healthyBoundary.checks.map(check=>(
          <div key={check.id} className={check.passed?"passed":"failed"}>
            <i />
            <div><strong>{check.label}</strong><small>{check.detail}</small></div>
            <em>{check.hard?"HARD":"SOFT"}</em>
            <b>{check.passed?"PASS":"FAIL"}</b>
          </div>
        ))}
      </div>

      <div className="abstentionProof">
        <div><span>CONTROL</span><strong>Leakage + robust gap 12.8 pp</strong></div>
        <i>→</i>
        <div><span>BOUNDARY</span><strong className="negative">{leakageBoundary.decision}</strong></div>
        <div><span>WHY</span><p>{leakageBoundary.blockers.join(" · ")}</p></div>
      </div>

      <div className="abstentionMethod"><span>METHOD / LIMITS</span><p>{copy.note}</p><code>veto.abstention.boundary.v1</code></div>
    </section>
  );
}
