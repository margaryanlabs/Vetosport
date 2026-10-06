"use client";

import type { Locale } from "@/lib/domain/types";
import { cleanLeakageMonitor, warningLeakageMonitor, leakingLeakageMonitor } from "@/lib/leakage/sandbox";

const pct=(v:number)=>`${(v*100).toFixed(0)}%`;

export function LeakageMonitorPanel({locale}:{locale:Locale}) {
  const copy=locale==="ru"
    ? {
        title:"NEGATIVE CONTROLS + LEAKAGE MONITOR",
        subtitle:"VETO специально пытается поймать собственную модель на утечке будущего и псевдо-alpha",
        warning:"SYNTHETIC LEAKAGE TESTS · НЕ ДОКАЗАТЕЛЬСТВО РЕАЛЬНОЙ ЧИСТОТЫ ДАННЫХ",
        note:"Future proxy, post-decision feature или статистически значимый placebo-control автоматически блокируют promotion. Настоящая защита требует point-in-time feature availability из Data Plane."
      }
    : locale==="hy"
      ? {
          title:"NEGATIVE CONTROLS + LEAKAGE MONITOR",
          subtitle:"VETO-ն փորձում է բռնել սեփական մոդելին future leakage-ի և pseudo-alpha-ի վրա",
          warning:"SYNTHETIC LEAKAGE TESTS · ՈՉ ԻՐԱԿԱՆ DATA CLEANLINESS-ի ԱՊԱՑՈՒՅՑ",
          note:"Future proxy կամ post-decision feature-ը hard-block են promotion-ի համար։"
        }
      : {
          title:"NEGATIVE CONTROLS + LEAKAGE MONITOR",
          subtitle:"VETO actively tries to catch its own models using future information or placebo alpha",
          warning:"SYNTHETIC LEAKAGE TESTS · NOT PROOF OF REAL DATA CLEANLINESS",
          note:"A future proxy, post-decision feature, or statistically meaningful placebo control hard-blocks promotion. Real protection requires point-in-time feature availability from the Data Plane."
        };

  return (
    <section className="leakageSurface">
      <div className="leakageHead">
        <div><span className="miniLabel">PARALLAX XIV</span><div><h3>{copy.title}</h3><p>{copy.subtitle}</p></div></div>
        <span>{copy.warning}</span>
      </div>

      <div className="leakageSummary">
        <Scenario title="CLEAN CONTROL SET" result={cleanLeakageMonitor} />
        <Scenario title="WARNING CONTROL SET" result={warningLeakageMonitor} />
        <Scenario title="LEAKING CONTROL SET" result={leakingLeakageMonitor} />
      </div>

      <div className="leakageTable">
        {leakingLeakageMonitor.controls.map(control=>(
          <article key={control.id} className={control.status.toLowerCase()}>
            <div><span>{control.family}</span><strong>{control.label}</strong></div>
            <span>EFFECT <b>{control.observedEffect.toFixed(4)}</b></span>
            <span>q <b>{control.qValue.toFixed(3)}</b></span>
            <span>EXCESS <b>{control.excessEffect.toFixed(4)}</b></span>
            <span>TEMPORAL <b>{control.temporalLeak?"LEAK":"OK"}</b></span>
            <em>{control.status}</em>
          </article>
        ))}
      </div>

      <div className="leakageProof">
        <div><span>LEAKAGE CONTROL</span><strong>Closing-price future proxy</strong></div>
        <div><span>AVAILABLE</span><strong>1450ms</strong></div>
        <i>→</i>
        <div><span>DECISION</span><strong>1000ms</strong></div>
        <div><span>RESULT</span><strong className="negative">PROMOTION BLOCK</strong></div>
      </div>

      <div className="leakageMethod"><span>METHOD / LIMITS</span><p>{copy.note}</p><code>veto.leakage.negative-controls.v1</code></div>
    </section>
  );
}

function Scenario({title,result}:{title:string;result:typeof cleanLeakageMonitor}) {
  return <article className={result.status.toLowerCase()}><span>{title}</span><strong>{result.status}</strong><b>{pct(result.leakageScore)}</b><small>CLEAN {pct(result.cleanRate)}</small><em className={result.hardBlock?"negative":"positive"}>{result.hardBlock?"HARD BLOCK":"NO BLOCK"}</em></article>;
}
