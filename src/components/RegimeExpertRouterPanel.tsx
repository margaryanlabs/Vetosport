"use client";

import type { Locale } from "@/lib/domain/types";
import {
  liquidityRouting,
  stableRouting,
  transitionRouting,
} from "@/lib/regime-router/sandbox";

const pct=(v:number)=>`${(v*100).toFixed(0)}%`;

export function RegimeExpertRouterPanel({locale}:{locale:Locale}) {
  const copy=locale==="ru"
    ? {
        title:"REGIME-CONDITIONED EXPERT ROUTER",
        subtitle:"Model Council меняет authority экспертов в зависимости от текущего скрытого режима",
        warning:"SYNTHETIC REGIME RELIABILITY · НЕ LIVE MODEL GOVERNANCE",
        note:"Вес эксперта зависит от regime-specific reliability, confidence, independence, shared-dependency penalty и adaptation speed. Anti-dominance cap ограничивает любого эксперта 42%."
      }
    : locale==="hy"
      ? {
          title:"REGIME-CONDITIONED EXPERT ROUTER",
          subtitle:"Model Council-ը փոխում է expert authority-ն ըստ ընթացիկ latent regime-ի",
          warning:"SYNTHETIC REGIME RELIABILITY · ՈՉ LIVE MODEL GOVERNANCE",
          note:"Weight-ը կախված է regime reliability-ից, confidence-ից, independence-ից, dependency penalty-ից և adaptation speed-ից։"
        }
      : {
          title:"REGIME-CONDITIONED EXPERT ROUTER",
          subtitle:"Model Council changes expert authority as the latent regime changes",
          warning:"SYNTHETIC REGIME RELIABILITY · NOT LIVE MODEL GOVERNANCE",
          note:"Expert weight depends on regime-specific reliability, confidence, independence, shared-dependency penalty and adaptation speed. An anti-dominance cap limits any one expert to 42%."
        };

  return (
    <section className="regimeRouterSurface">
      <div className="regimeRouterHead">
        <div><span className="miniLabel">PARALLAX XXI</span><div><h3>{copy.title}</h3><p>{copy.subtitle}</p></div></div>
        <span>{copy.warning}</span>
      </div>

      <div className="regimeRouterSummary">
        <Scenario title="STABLE" routing={stableRouting} />
        <Scenario title="OPEN TRANSITION" routing={transitionRouting} />
        <Scenario title="FRAGILE LIQUIDITY" routing={liquidityRouting} />
      </div>

      <div className="regimeRouterTable">
        <div className="regimeRouterTableHead"><span>EXPERT</span><span>WEIGHT</span><span>REGIME REL</span><span>ADAPT PEN</span><span>STATUS</span></div>
        {transitionRouting.experts.map(expert=>(
          <div key={expert.id} className={expert.status.toLowerCase()}>
            <div><strong>{expert.label}</strong><small>{expert.id}</small></div>
            <b>{pct(expert.weight)}</b>
            <span>{pct(expert.regimeReliability)}</span>
            <span>{pct(expert.adaptationPenalty)}</span>
            <em>{expert.status}</em>
          </div>
        ))}
      </div>

      <div className="regimeRouterCompare">
        <div><span>STABLE DOMINANT</span><strong>{stableRouting.dominantExpertId ?? "—"}</strong><small>N_eff {stableRouting.effectiveExperts.toFixed(2)}</small></div>
        <i>→</i>
        <div><span>TRANSITION DOMINANT</span><strong>{transitionRouting.dominantExpertId ?? "—"}</strong><small>N_eff {transitionRouting.effectiveExperts.toFixed(2)}</small></div>
        <i>→</i>
        <div><span>LIQUIDITY DOMINANT</span><strong>{liquidityRouting.dominantExpertId ?? "—"}</strong><small>N_eff {liquidityRouting.effectiveExperts.toFixed(2)}</small></div>
      </div>

      <div className="regimeRouterMethod"><span>METHOD / LIMITS</span><p>{copy.note}</p><code>veto.regime.expert-router.v1</code></div>
    </section>
  );
}

function Scenario({title,routing}:{title:string;routing:typeof stableRouting}) {
  return (
    <article>
      <span>{title}</span>
      <strong>{routing.dominantExpertId ?? "NONE"}</strong>
      <b>{pct(routing.maxWeight)}</b>
      <small>N_eff {routing.effectiveExperts.toFixed(2)} · top2 {pct(routing.concentration)}</small>
    </article>
  );
}
