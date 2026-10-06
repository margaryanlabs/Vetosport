"use client";

import type { Locale } from "@/lib/domain/types";
import {
  liquidityAttribution,
  transitionAttribution,
} from "@/lib/regime-attribution/sandbox";

const pct=(v:number)=>`${(v*100).toFixed(0)}%`;
const num=(v:number)=>v.toFixed(2);

export function RegimeAttributionPanel({locale}:{locale:Locale}) {
  const copy=locale==="ru"
    ? {
        title:"REGIME DRIVER ATTRIBUTION",
        subtitle:"Какие факторы действительно вызвали смену режима, а какие просто двигались вместе с ней",
        warning:"COUNTERFACTUAL ABLATION · SYNTHETIC REGIME STREAM",
        note:"Для каждого признака VETO пересчитывает весь regime pipeline, удерживая этот признак на baseline. Contribution показывает потерю structural evidence, а regime flip — изменение самой классификации."
      }
    : locale==="hy"
      ? {
          title:"REGIME DRIVER ATTRIBUTION",
          subtitle:"Որ գործոններն են իրականում առաջացրել regime shift-ը, ոչ թե պարզապես շարժվել նրա հետ",
          warning:"COUNTERFACTUAL ABLATION · SYNTHETIC REGIME STREAM",
          note:"Յուրաքանչյուր feature-ի համար pipeline-ը վերագործարկվում է baseline-fixed counterfactual-ով։"
        }
      : {
          title:"REGIME DRIVER ATTRIBUTION",
          subtitle:"Which factors actually caused the regime shift rather than merely moving with it",
          warning:"COUNTERFACTUAL ABLATION · SYNTHETIC REGIME STREAM",
          note:"For each feature, VETO reruns the full regime pipeline while pinning that feature to baseline. Contribution measures lost structural evidence; regime flip shows whether the inferred state itself changes."
        };

  const primary=transitionAttribution.drivers[0];

  return (
    <section className="regimeAttributionSurface">
      <div className="regimeAttributionHead">
        <div><span className="miniLabel">PARALLAX XX</span><div><h3>{copy.title}</h3><p>{copy.subtitle}</p></div></div>
        <span>{copy.warning}</span>
      </div>

      <div className="regimeAttributionHero">
        <div><span>FULL REGIME</span><strong>{transitionAttribution.fullRegime}</strong><small>CONF {pct(transitionAttribution.fullConfidence)}</small></div>
        <div><span>PRIMARY DRIVER</span><strong>{primary?.feature ?? "NONE"}</strong><small>SHARE {pct(primary?.share ?? 0)}</small></div>
        <div><span>TOP-2 CONCENTRATION</span><strong>{pct(transitionAttribution.concentration)}</strong><small>{transitionAttribution.concentration>=.7?"CONCENTRATED":"DISTRIBUTED"}</small></div>
      </div>

      <div className="regimeAttributionGrid">
        {transitionAttribution.drivers.map(driver=>(
          <article key={driver.feature} className={driver.flipsRegime?"flip":""}>
            <div><span>#{driver.rank}</span><strong>{driver.feature}</strong><em>{driver.flipsRegime?"REGIME FLIP":"SAME REGIME"}</em></div>
            <b>{pct(driver.share)}</b>
            <div className="regimeAttributionRail"><i style={{width:`${Math.max(2,driver.share*100)}%`}} /></div>
            <small>Δ evidence {num(driver.contribution)}</small>
            <small>ablated conf {pct(driver.ablatedConfidence)}</small>
            <small>{driver.ablatedRegime}</small>
          </article>
        ))}
      </div>

      <div className="regimeAttributionCompare">
        <div><span>TRANSITION CASE</span><strong>{transitionAttribution.primaryDriver ?? "—"}</strong><small>{transitionAttribution.fullRegime}</small></div>
        <i>↔</i>
        <div><span>LIQUIDITY CASE</span><strong>{liquidityAttribution.primaryDriver ?? "—"}</strong><small>{liquidityAttribution.fullRegime}</small></div>
        <div><span>INTERPRETATION</span><p>Same change-point machinery, different causal driver profile. That distinction is what prevents every shock from being labeled “momentum”.</p></div>
      </div>

      <div className="regimeAttributionMethod"><span>METHOD / LIMITS</span><p>{copy.note}</p><code>veto.regime.attribution.v1</code></div>
    </section>
  );
}
