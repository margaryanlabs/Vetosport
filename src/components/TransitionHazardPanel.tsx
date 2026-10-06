"use client";

import type { Locale } from "@/lib/domain/types";
import {
  liquidityHazard,
  oneSpikeHazard,
  stableHazard,
  transitionHazard,
} from "@/lib/transition-hazard/sandbox";

const pct=(v:number)=>`${(v*100).toFixed(0)}%`;

export function TransitionHazardPanel({locale}:{locale:Locale}) {
  const copy=locale==="ru"
    ? {
        title:"TRANSITION HAZARD / EARLY WARNING",
        subtitle:"Показывает приближение смены режима до того, как hard change уже подтверждён",
        warning:"EXPERIMENTAL HAZARD INDEX · НЕ КАЛИБРОВАННАЯ PROBABILITY",
        note:"Hazard Index агрегирует P(change), persistence, EWMA/CUSUM pressure, альтернативную regime mass и краткосрочный trend. До OOS-калибровки это индекс раннего предупреждения, а не вероятность."
      }
    : locale==="hy"
      ? {
          title:"TRANSITION HAZARD / EARLY WARNING",
          subtitle:"Ցույց է տալիս regime shift-ի մոտեցումը մինչև hard change-ի հաստատումը",
          warning:"EXPERIMENTAL HAZARD INDEX · ՈՉ ԿԱԼԻԲՐԱՑՎԱԾ PROBABILITY",
          note:"Hazard Index-ը միավորում է P(change), persistence, EWMA/CUSUM pressure, alternative regime mass և trend։"
        }
      : {
          title:"TRANSITION HAZARD / EARLY WARNING",
          subtitle:"Surfaces an approaching regime transition before the hard change is already confirmed",
          warning:"EXPERIMENTAL HAZARD INDEX · NOT A CALIBRATED PROBABILITY",
          note:"The Hazard Index combines P(change), persistence, EWMA/CUSUM pressure, alternative-regime mass and short-horizon trend. Until OOS calibration, it is an early-warning index rather than a probability."
        };

  const lead=transitionHazard.leadMsToHardChange;

  return (
    <section className="transitionHazardSurface">
      <div className="transitionHazardHead">
        <div><span className="miniLabel">PARALLAX XXIV</span><div><h3>{copy.title}</h3><p>{copy.subtitle}</p></div></div>
        <span>{copy.warning}</span>
      </div>

      <div className="transitionHazardHero">
        <div><span>CURRENT STATUS</span><strong>{transitionHazard.status}</strong><small>HAZARD {pct(transitionHazard.hazardScore)}</small></div>
        <div><span>DOMINANT ALTERNATIVE</span><strong>{transitionHazard.current?.dominantAlternative ?? "NONE"}</strong><small>away from STABLE_CONTROL</small></div>
        <div><span>EARLY WARNING LEAD</span><strong className="positive">{lead===null?"—":String(lead/1000)+"s"}</strong><small>before first hard change</small></div>
        <div><span>SPIKE CONTROL</span><strong className="positive">{oneSpikeHazard.frames.some(x=>x.status==="IMMINENT")?"FAIL":"REJECTED"}</strong><small>no false IMMINENT</small></div>
      </div>

      <div className="transitionHazardScenarioGrid">
        <Scenario title="STABLE CONTROL" result={stableHazard} />
        <Scenario title="OPEN TRANSITION" result={transitionHazard} />
        <Scenario title="LIQUIDITY SHIFT" result={liquidityHazard} />
        <Scenario title="ONE SPIKE" result={oneSpikeHazard} />
      </div>

      <div className="transitionHazardTimeline">
        <div className="transitionHazardTimelineHead"><span>TIME</span><span>RAW REGIME</span><span>HAZARD</span><span>STATUS</span><span>ALT MASS</span><span>PERSIST</span><span>HARD</span></div>
        {transitionHazard.frames.slice(-10).map(row=>(
          <div key={row.timeMs} className={row.status.toLowerCase()}>
            <code>{row.timeMs/1000}s</code>
            <span>{row.rawRegime}</span>
            <b>{pct(row.hazardScore)}</b>
            <strong>{row.status}</strong>
            <span>{pct(row.alternativeMass)}</span>
            <i>{row.persistence}</i>
            <em>{row.hardChange?"YES":"NO"}</em>
          </div>
        ))}
      </div>

      <div className="transitionHazardStages">
        <div><span>STABLE</span><strong>&lt;36%</strong><small>no action</small></div>
        <i>→</i>
        <div><span>PRECURSOR</span><strong>36–55%</strong><small>watch structure</small></div>
        <i>→</i>
        <div><span>ARMED</span><strong>56–75%</strong><small>transition risk high</small></div>
        <i>→</i>
        <div><span>IMMINENT</span><strong>≥76%</strong><small>requires persistence ≥2</small></div>
      </div>

      <div className="transitionHazardProof">
        <div><span>FIRST ARMED</span><strong>{transitionHazard.firstArmed?String(transitionHazard.firstArmed.timeMs/1000)+"s":"—"}</strong></div>
        <div><span>FIRST IMMINENT</span><strong>{transitionHazard.firstImminent?String(transitionHazard.firstImminent.timeMs/1000)+"s":"—"}</strong></div>
        <div><span>HARD CHANGE</span><strong>{transitionHazard.firstHardChange?String(transitionHazard.firstHardChange.timeMs/1000)+"s":"—"}</strong></div>
        <div><span>INTERPRETATION</span><p>{transitionHazard.reasons.join(" · ")}</p></div>
      </div>

      <div className="transitionHazardMethod"><span>METHOD / LIMITS</span><p>{copy.note}</p><code>veto.regime.transition-hazard.v1</code></div>
    </section>
  );
}

function Scenario({title,result}:{title:string;result:typeof transitionHazard}) {
  return (
    <article className={result.status.toLowerCase()}>
      <span>{title}</span>
      <strong>{result.status}</strong>
      <b>{pct(result.hazardScore)}</b>
      <small>{result.current?.dominantAlternative ?? "NO ALT"}</small>
      <em>{result.leadMsToHardChange===null?"NO LEAD":String(result.leadMsToHardChange/1000)+"s LEAD"}</em>
    </article>
  );
}
