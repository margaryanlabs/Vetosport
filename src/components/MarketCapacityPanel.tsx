"use client";

import type { Locale } from "@/lib/domain/types";
import { capacityScenarios } from "@/lib/capacity/sandbox";

const pct=(v:number)=>`${(v*100).toFixed(0)}%`;
const pp=(v:number)=>`${v>=0?"+":""}${v.toFixed(2)} pp`;

export function MarketCapacityPanel({locale}:{locale:Locale}) {
  const copy=locale==="ru"
    ? {
        title:"MARKET CAPACITY / TRADABILITY",
        subtitle:"Есть ли у расхождения реальный объём после задержки, отказов, suspensions и slippage",
        warning:"SYNTHETIC CAPACITY MODEL · НЕ РЕКОМЕНДАЦИЯ РАЗМЕРА СТАВКИ",
        note:"Capacity Score измеряет качество исполнимости, а не прибыль. ZERO означает, что отображаемый edge нельзя считать practically tradable при заданных execution assumptions."
      }
    : locale==="hy"
      ? {
          title:"MARKET CAPACITY / TRADABILITY",
          subtitle:"Արդյոք price gap-ը ունի իրական executable capacity latency-ից և slippage-ից հետո",
          warning:"SYNTHETIC CAPACITY MODEL · ՈՉ ԽԱՂԱԴՐՈՒՅՔԻ ՉԱՓԻ ԽՈՐՀՈՒՐԴ",
          note:"Capacity Score-ը execution quality է, ոչ շահույթի կանխատեսում։"
        }
      : {
          title:"MARKET CAPACITY / TRADABILITY",
          subtitle:"Does the disagreement retain practical capacity after delay, rejection, suspension and slippage?",
          warning:"SYNTHETIC CAPACITY MODEL · NOT A STAKE-SIZING RECOMMENDATION",
          note:"Capacity Score measures executability quality, not profit. ZERO means the displayed edge is not practically tradable under the supplied execution assumptions."
        };

  const rows=Object.values(capacityScenarios);

  return (
    <section className="capacitySurface">
      <div className="capacityHead">
        <div><span className="miniLabel">PARALLAX XII</span><div><h3>{copy.title}</h3><p>{copy.subtitle}</p></div></div>
        <span>{copy.warning}</span>
      </div>

      <div className="capacityGrid">
        {rows.map(row=>(
          <article key={row.marketId} className={row.class.toLowerCase()}>
            <div><span>{row.marketId}</span><strong>{row.class}</strong></div>
            <b>{pct(row.capacityScore)}</b>
            <div className="capacityMetrics">
              <span>ROBUST GAP <strong>{pp(row.robustGapPp)}</strong></span>
              <span>POST-EXEC <strong>{pp(row.postExecutionGapPp)}</strong></span>
              <span>SURVIVAL <strong>{pct(row.survivalFraction)}</strong></span>
              <span>EXEC COVER <strong>{pct(row.executableCoverage)}</strong></span>
              <span>LIMIT REL <strong>{pct(row.limitReliability)}</strong></span>
              <span>LIQUIDITY <strong>{pct(row.liquidityProxy)}</strong></span>
            </div>
            <div className="capacityReasons">
              {row.reasons.length?row.reasons.map(reason=><span key={reason}>{reason}</span>):<span>no material execution warning</span>}
            </div>
            <em className={row.hardBlock?"negative":"positive"}>{row.hardBlock?"HARD BLOCK":"EXECUTABLE CANDIDATE"}</em>
          </article>
        ))}
      </div>

      <div className="capacityProof">
        <div><span>FALSE EDGE CONTROL</span><strong>{capacityScenarios.fakeEdge.marketId}</strong></div>
        <div><span>RAW ROBUST GAP</span><strong>{pp(capacityScenarios.fakeEdge.robustGapPp)}</strong></div>
        <i>→</i>
        <div><span>CAPACITY</span><strong className="negative">{capacityScenarios.fakeEdge.class}</strong></div>
        <div><span>WHY</span><p>{capacityScenarios.fakeEdge.reasons.join(" · ")}</p></div>
      </div>

      <div className="capacityMethod"><span>METHOD / LIMITS</span><p>{copy.note}</p><code>veto.capacity.tradability.v1</code></div>
    </section>
  );
}
