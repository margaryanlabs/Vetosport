"use client";

import type { Locale } from "@/lib/domain/types";
import {
  healthyBoundary,
  staleRegimeBoundary,
  transitionCappedBoundary,
} from "@/lib/abstention/sandbox";

const pct=(v:number)=>`${(v*100).toFixed(0)}%`;

export function RegimeCoherenceGatePanel({locale}:{locale:Locale}) {
  const copy=locale==="ru"
    ? {
        title:"REGIME-COHERENCE SIGNAL GATE",
        subtitle:"Не позволяет старому signal snapshot пережить подтверждённую смену режима",
        warning:"DECISION AUTHORITY GATE · SYNTHETIC CONTROLS",
        note:"Несовпадение governed regime и regime snapshot — hard ABSTAIN. Experimental transition hazard сам по себе не hard-block: при IMMINENT + slow adaptation он только ограничивает authority до WATCH."
      }
    : locale==="hy"
      ? {
          title:"REGIME-COHERENCE SIGNAL GATE",
          subtitle:"Չի թողնում հին signal snapshot-ին գոյատևել հաստատված regime shift-ից հետո",
          warning:"DECISION AUTHORITY GATE · SYNTHETIC CONTROLS",
          note:"Governed regime mismatch-ը hard ABSTAIN է։ Experimental transition hazard-ը միայն սահմանափակում է authority-ն մինչև WATCH։"
        }
      : {
          title:"REGIME-COHERENCE SIGNAL GATE",
          subtitle:"Prevents an old signal snapshot from surviving a confirmed regime change",
          warning:"DECISION AUTHORITY GATE · SYNTHETIC CONTROLS",
          note:"A governed-regime mismatch is a hard ABSTAIN. Experimental transition hazard is not a hard block by itself; IMMINENT hazard plus slow adaptation caps authority at WATCH."
        };

  const scenarios=[
    {
      title:"COHERENT SNAPSHOT",
      regime:"OPEN_TRANSITION",
      snapshot:"OPEN_TRANSITION",
      hazard:.28,
      adaptation:.82,
      result:healthyBoundary,
    },
    {
      title:"STALE SNAPSHOT",
      regime:"PRESSURE_SIEGE",
      snapshot:"OPEN_TRANSITION",
      hazard:.91,
      adaptation:.82,
      result:staleRegimeBoundary,
    },
    {
      title:"IMMINENT / SLOW",
      regime:"OPEN_TRANSITION",
      snapshot:"OPEN_TRANSITION",
      hazard:.88,
      adaptation:.31,
      result:transitionCappedBoundary,
    },
  ] as const;

  return (
    <section className="regimeCoherenceSurface">
      <div className="regimeCoherenceHead">
        <div><span className="miniLabel">PARALLAX XXV</span><div><h3>{copy.title}</h3><p>{copy.subtitle}</p></div></div>
        <span>{copy.warning}</span>
      </div>

      <div className="regimeCoherenceGrid">
        {scenarios.map(item=>(
          <article key={item.title} className={item.result.decision.toLowerCase().replaceAll("_","-")}>
            <span>{item.title}</span>
            <div><small>GOVERNED REGIME</small><strong>{item.regime}</strong></div>
            <div><small>SIGNAL SNAPSHOT</small><strong>{item.snapshot}</strong></div>
            <div className="regimeCoherencePair"><b>HAZARD {pct(item.hazard)}</b><b>ADAPT {pct(item.adaptation)}</b></div>
            <em>{item.result.decision}</em>
            <p>{item.result.abstentionReason ?? item.result.warnings[0] ?? "authority preserved"}</p>
          </article>
        ))}
      </div>

      <div className="regimeCoherenceFlow">
        <div><span>1</span><strong>DETECT</strong><small>raw transition</small></div>
        <i>→</i>
        <div><span>2</span><strong>GOVERN</strong><small>hysteresis state</small></div>
        <i>→</i>
        <div><span>3</span><strong>COMPARE</strong><small>signal regime snapshot</small></div>
        <i>→</i>
        <div><span>4</span><strong>CAP / ABSTAIN</strong><small>decision authority</small></div>
      </div>

      <div className="regimeCoherenceProof">
        <div><span>CONTROL</span><strong>ROBUST GAP 10.1 pp</strong></div>
        <i>+</i>
        <div><span>STALE REGIME</span><strong className="negative">MISMATCH</strong></div>
        <i>→</i>
        <div><span>DECISION</span><strong className="negative">{staleRegimeBoundary.decision}</strong></div>
      </div>

      <div className="regimeCoherenceMethod"><span>METHOD / LIMITS</span><p>{copy.note}</p><code>veto.regime.coherence-gate.v1</code></div>
    </section>
  );
}
