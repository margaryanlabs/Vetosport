"use client";

import type { Locale } from "@/lib/domain/types";
import {
  liquidityRegime,
  oneSpikeRegime,
  stableRegime,
  transitionRegime,
} from "@/lib/regime/sandbox";

const pct=(v:number)=>`${(v*100).toFixed(0)}%`;
const num=(v:number)=>v.toFixed(2);

export function RegimeChangePanel({locale}:{locale:Locale}) {
  const copy=locale==="ru"
    ? {
        title:"REGIME + CHANGE-POINT INTELLIGENCE",
        subtitle:"Ловит структурную смену скрытого состояния раньше, чем она станет очевидной по счёту или цене",
        warning:"SYNTHETIC SEQUENTIAL DETECTOR · НЕ LIVE MATCH STATE",
        note:"Детектор сочетает standardized surprise, EWMA shift, CUSUM и persistence. Один spike не считается сменой режима: hard change требует последовательного подтверждения."
      }
    : locale==="hy"
      ? {
          title:"REGIME + CHANGE-POINT INTELLIGENCE",
          subtitle:"Բռնում է latent state-ի կառուցվածքային փոփոխությունը մինչև score/price-ը դա ակնհայտ դարձնի",
          warning:"SYNTHETIC SEQUENTIAL DETECTOR · ՈՉ LIVE MATCH STATE",
          note:"Detector-ը միավորում է standardized surprise, EWMA shift, CUSUM և persistence։ Մեկ spike-ը regime change չէ։"
        }
      : {
          title:"REGIME + CHANGE-POINT INTELLIGENCE",
          subtitle:"Detects a structural latent-state shift before score or price makes it obvious",
          warning:"SYNTHETIC SEQUENTIAL DETECTOR · NOT LIVE MATCH STATE",
          note:"The detector combines standardized surprise, EWMA shift, CUSUM and persistence. One spike is not a regime change: a hard transition requires sequential confirmation."
        };

  const current=transitionRegime.current;
  const first=transitionRegime.changePoints[0];

  return (
    <section className="regimeSurface">
      <div className="regimeHead">
        <div><span className="miniLabel">PARALLAX XIX</span><div><h3>{copy.title}</h3><p>{copy.subtitle}</p></div></div>
        <span>{copy.warning}</span>
      </div>

      <div className="regimeHero">
        <div>
          <span>CURRENT LATENT REGIME</span>
          <strong>{current?.regime ?? "UNKNOWN"}</strong>
          <small>CHANGE CONF {pct(current?.changeProbability ?? 0)}</small>
        </div>
        <div>
          <span>FIRST CONFIRMED CHANGE</span>
          <strong>{first ? `T+${first.timeMs/1000}s` : "NONE"}</strong>
          <small>{first ? `PERSISTENCE ${first.persistence}` : "NO HARD CHANGE"}</small>
        </div>
        <div>
          <span>STRUCTURAL STATE</span>
          <strong className={transitionRegime.changePoints.length?"negative":"positive"}>{transitionRegime.changePoints.length?"SHIFTED":"STABLE"}</strong>
          <small>{transitionRegime.stableBeforeChange?"stable pre-window":"unstable pre-window"}</small>
        </div>
      </div>

      <div className="regimeScenarioGrid">
        <Scenario title="STABLE CONTROL" result={stableRegime} />
        <Scenario title="OPEN TRANSITION" result={transitionRegime} />
        <Scenario title="LIQUIDITY SHOCK" result={liquidityRegime} />
        <Scenario title="ONE-POINT SPIKE" result={oneSpikeRegime} />
      </div>

      <div className="regimeTimeline">
        <div className="regimeTimelineHead"><span>TIME</span><span>SURPRISE</span><span>EWMA</span><span>CUSUM</span><span>PERSIST</span><span>CHANGE P</span><span>REGIME</span></div>
        {transitionRegime.frames.slice(-10).map(frame=>(
          <div className={frame.hardChange?"hard":""} key={frame.timeMs}>
            <code>{frame.timeMs/1000}s</code>
            <span>{num(frame.surprise)}</span>
            <span>{num(frame.ewmaShift)}</span>
            <span>{num(frame.cusum)}</span>
            <span>{frame.persistence}</span>
            <b>{pct(frame.changeProbability)}</b>
            <em>{frame.regime}</em>
          </div>
        ))}
      </div>

      <div className="regimeDistribution">
        <div><span>REGIME POSTERIOR-LIKE SCORES</span><strong>{current?.regime ?? "—"}</strong></div>
        <div className="regimeBars">
          {current && Object.entries(current.regimeScores).map(([label,value])=>(
            <article key={label}>
              <span>{label}</span>
              <div><i style={{width:`${Math.max(2,value*100)}%`}} /></div>
              <b>{pct(value)}</b>
            </article>
          ))}
        </div>
      </div>

      <div className="regimeProof">
        <div><span>NEGATIVE CONTROL</span><strong>ONE EXTREME SPIKE</strong></div>
        <i>→</i>
        <div><span>HARD CHANGES</span><strong>{oneSpikeRegime.changePoints.length}</strong></div>
        <div><span>RESULT</span><strong className="positive">{oneSpikeRegime.changePoints.length===0?"REJECT STRUCTURAL SHIFT":"FALSE POSITIVE"}</strong></div>
      </div>

      <div className="regimeMethod"><span>METHOD / LIMITS</span><p>{copy.note}</p><code>veto.regime.change-point.v1</code></div>
    </section>
  );
}

function Scenario({title,result}:{title:string;result:typeof stableRegime}) {
  return (
    <article className={result.changePoints.length?"shifted":"stable"}>
      <span>{title}</span>
      <strong>{result.regime}</strong>
      <b>{pct(result.transitionConfidence)}</b>
      <small>{result.changePoints.length} hard change(s)</small>
      <em className={result.changePoints.length?"negative":"positive"}>{result.changePoints.length?"SHIFT":"NO SHIFT"}</em>
    </article>
  );
}
