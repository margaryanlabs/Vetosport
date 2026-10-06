"use client";

import type { Locale } from "@/lib/domain/types";
import {
  commonPath,
  earlyCommonPath,
  rarePath,
  regimeGraph,
} from "@/lib/regime-graph/sandbox";

const pct=(v:number)=>`${(v*100).toFixed(0)}%`;

export function RegimeGraphPanel({locale}:{locale:Locale}) {
  const copy=locale==="ru"
    ? {
        title:"REGIME TRANSITION GRAPH / PATH PLAUSIBILITY",
        subtitle:"Проверяет, естественен ли предлагаемый переход с учётом истории путей и времени жизни текущего режима",
        warning:"SYNTHETIC SEMI-MARKOV HISTORY · НЕ LIVE OOS TRANSITIONS",
        note:"Dirichlet smoothing не обнуляет unseen paths. Dwell pressure повышает plausibility перехода, когда текущий regime уже прожил типичную длительность."
      }
    : locale==="hy"
      ? {
          title:"REGIME TRANSITION GRAPH / PATH PLAUSIBILITY",
          subtitle:"Ստուգում է regime switch-ի պատմական բնականությունը և dwell-time-ը",
          warning:"SYNTHETIC SEMI-MARKOV HISTORY · ՈՉ LIVE OOS TRANSITIONS",
          note:"Dirichlet smoothing-ը unseen path-ը զրո չի դարձնում, dwell pressure-ը հաշվի է առնում regime-ի տարիքը։"
        }
      : {
          title:"REGIME TRANSITION GRAPH / PATH PLAUSIBILITY",
          subtitle:"Tests whether a proposed regime switch is historically plausible given path structure and dwell time",
          warning:"SYNTHETIC SEMI-MARKOV HISTORY · NOT LIVE OOS TRANSITIONS",
          note:"Dirichlet smoothing keeps unseen paths non-zero. Dwell pressure increases plausibility when the current regime has lived through its typical duration."
        };

  const topEdges=[...regimeGraph.edges]
    .sort((a,b)=>b.probability-a.probability)
    .slice(0,8);

  return (
    <section className="regimeGraphSurface">
      <div className="regimeGraphHead">
        <div><span className="miniLabel">PARALLAX XXX</span><div><h3>{copy.title}</h3><p>{copy.subtitle}</p></div></div>
        <span>{copy.warning}</span>
      </div>

      <div className="regimeGraphHero">
        <Path title="COMMON / MATURE DWELL" path={commonPath} />
        <Path title="COMMON / EARLY DWELL" path={earlyCommonPath} />
        <Path title="RARE JUMP" path={rarePath} />
      </div>

      <div className="regimeGraphEdges">
        {topEdges.map(edge=>(
          <article key={`${edge.from}-${edge.to}`}>
            <span>{edge.from}</span>
            <i>→</i>
            <strong>{edge.to}</strong>
            <b>{pct(edge.probability)}</b>
            <small>N={edge.count}</small>
          </article>
        ))}
      </div>

      <div className="regimeGraphDwell">
        {regimeGraph.dwell.map(row=>(
          <article key={row.regime}>
            <span>{row.regime}</span>
            <strong>{row.meanFrames.toFixed(1)}</strong>
            <small>MEAN</small>
            <b>P90 {row.p90Frames.toFixed(0)}</b>
          </article>
        ))}
      </div>

      <div className="regimeGraphProof">
        <div><span>SAME PATH</span><strong>STABLE → OPEN</strong></div>
        <div><span>EARLY DWELL</span><strong>{pct(earlyCommonPath.plausibility)}</strong></div>
        <i>→</i>
        <div><span>MATURE DWELL</span><strong className="positive">{pct(commonPath.plausibility)}</strong></div>
        <div><span>RARE UNSEEN</span><strong className="negative">{rarePath.status} · {pct(rarePath.transitionProbability)}</strong></div>
      </div>

      <div className="regimeGraphMethod"><span>METHOD / LIMITS</span><p>{copy.note}</p><code>veto.regime.transition-graph.v1</code></div>
    </section>
  );
}

function Path({title,path}:{title:string;path:typeof commonPath}) {
  return <article className={path.status.toLowerCase()}><span>{title}</span><strong>{path.from} → {path.to}</strong><b>{pct(path.plausibility)}</b><small>P(path) {pct(path.transitionProbability)} · DWELL {pct(path.dwellPressure)}</small><em>{path.status}</em></article>;
}
