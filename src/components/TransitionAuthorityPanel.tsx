"use client";

import type { Locale } from "@/lib/domain/types";
import {
  highRiskFastAuthority,
  highRiskSlowAuthority,
  lowRiskAuthority,
  sparseAuthority,
  staleAuthority,
} from "@/lib/transition-authority/sandbox";

const pct=(v:number)=>`${(v*100).toFixed(0)}%`;

export function TransitionAuthorityPanel({locale}:{locale:Locale}) {
  const copy=locale==="ru"
    ? {
        title:"CALIBRATED TRANSITION AUTHORITY",
        subtitle:"Переводит калиброванный transition risk в реальную decision authority с учётом скорости адаптации модели",
        warning:"SYNTHETIC AUTHORITY POLICY · НЕ LIVE EXECUTION CONTROL",
        note:"Gate использует только калиброванную вероятность на выбранном execution horizon. Pooled/sparse calibration не получает права сохранять полную authority; stale regime всегда ABSTAIN."
      }
    : locale==="hy"
      ? {
          title:"CALIBRATED TRANSITION AUTHORITY",
          subtitle:"Կալիբրացված transition risk-ը վերածում է decision authority-ի՝ հաշվի առնելով model adaptation speed-ը",
          warning:"SYNTHETIC AUTHORITY POLICY · ՈՉ LIVE EXECUTION CONTROL",
          note:"Gate-ը օգտագործում է միայն calibrated probability-ը ընտրված execution horizon-ի վրա։"
        }
      : {
          title:"CALIBRATED TRANSITION AUTHORITY",
          subtitle:"Converts calibrated transition risk into decision authority using model adaptation speed",
          warning:"SYNTHETIC AUTHORITY POLICY · NOT LIVE EXECUTION CONTROL",
          note:"The gate uses only calibrated transition probability at the chosen execution horizon. Pooled/sparse calibration cannot preserve full authority; a stale regime always abstains."
        };

  const scenarios=[
    ["LOW / CALIBRATED",lowRiskAuthority],
    ["HIGH / SLOW MODEL",highRiskSlowAuthority],
    ["HIGH / FAST MODEL",highRiskFastAuthority],
    ["SPARSE REGIME",sparseAuthority],
    ["STALE REGIME",staleAuthority],
  ] as const;

  return (
    <section className="transitionAuthoritySurface">
      <div className="transitionAuthorityHead">
        <div><span className="miniLabel">PARALLAX XXVII</span><div><h3>{copy.title}</h3><p>{copy.subtitle}</p></div></div>
        <span>{copy.warning}</span>
      </div>

      <div className="transitionAuthorityGrid">
        {scenarios.map(([title,result])=>(
          <article key={title} className={result.action.toLowerCase().replaceAll("_","-")}>
            <span>{title}</span>
            <strong>{result.action}</strong>
            <b>{pct(result.selectedProbability)}</b>
            <small>H={result.executionHorizon} · ADAPT RISK {pct(result.adaptationRisk)}</small>
            <em>{pct(result.authorityMultiplier)} AUTHORITY</em>
          </article>
        ))}
      </div>

      <div className="transitionAuthorityFlow">
        <div><span>CALIBRATED P</span><strong>{pct(highRiskSlowAuthority.selectedProbability)}</strong></div>
        <i>×</i>
        <div><span>MODEL FRAGILITY</span><strong>{pct(1-.28)}</strong></div>
        <i>→</i>
        <div><span>ADAPTATION RISK</span><strong>{pct(highRiskSlowAuthority.adaptationRisk)}</strong></div>
        <i>→</i>
        <div><span>ACTION</span><strong className="negative">{highRiskSlowAuthority.action}</strong></div>
      </div>

      <div className="transitionAuthorityRules">
        <div><span>UNTRUSTED / POOLED</span><strong>MAX WATCH</strong></div>
        <div><span>HIGH P + SLOW MODEL</span><strong>ABSTAIN</strong></div>
        <div><span>HIGH P + FAST MODEL</span><strong>PRESERVE</strong></div>
        <div><span>STALE REGIME</span><strong>ABSTAIN</strong></div>
      </div>

      <div className="transitionAuthorityMethod"><span>METHOD / LIMITS</span><p>{copy.note}</p><code>veto.regime.transition-authority.v1</code></div>
    </section>
  );
}
