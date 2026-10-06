"use client";

import type { Locale } from "@/lib/domain/types";
import {
  chatterMachine,
  noiseHoldMachine,
  recoveryMachine,
  switchMachine,
} from "@/lib/regime-hysteresis/sandbox";

const pct=(v:number)=>`${(v*100).toFixed(0)}%`;

export function RegimeHysteresisPanel({locale}:{locale:Locale}) {
  const copy=locale==="ru"
    ? {
        title:"REGIME HYSTERESIS / RECOVERY STATE MACHINE",
        subtitle:"Отделяет реальную смену режима от шума и не даёт latent state прыгать между классами",
        warning:"SYNTHETIC STATE GOVERNANCE · НЕ LIVE REGIME AUTHORITY",
        note:"Вход, выход и switch используют разные пороги. После входа действует minimum dwell; recovery и regime switch требуют нескольких последовательных подтверждений."
      }
    : locale==="hy"
      ? {
          title:"REGIME HYSTERESIS / RECOVERY STATE MACHINE",
          subtitle:"Տարբերակում է իրական regime shift-ը աղմուկից և կանխում state chatter-ը",
          warning:"SYNTHETIC STATE GOVERNANCE · ՈՉ LIVE REGIME AUTHORITY",
          note:"Enter, exit և switch-ը ունեն տարբեր շեմեր։ Minimum dwell-ից հետո recovery/switch-ը պահանջում է մի քանի հաջորդական հաստատում։"
        }
      : {
          title:"REGIME HYSTERESIS / RECOVERY STATE MACHINE",
          subtitle:"Separates real regime transitions from classifier noise and prevents latent-state chatter",
          warning:"SYNTHETIC STATE GOVERNANCE · NOT LIVE REGIME AUTHORITY",
          note:"Entry, exit and switching use different thresholds. After entry, minimum dwell applies; recovery and regime switching require multiple sequential confirmations."
        };

  const current=switchMachine.frames[switchMachine.frames.length-1];

  return (
    <section className="regimeHysteresisSurface">
      <div className="regimeHysteresisHead">
        <div><span className="miniLabel">PARALLAX XXIII</span><div><h3>{copy.title}</h3><p>{copy.subtitle}</p></div></div>
        <span>{copy.warning}</span>
      </div>

      <div className="regimeHysteresisHero">
        <div><span>ACTIVE REGIME</span><strong>{switchMachine.activeRegime}</strong><small>{switchMachine.phase}</small></div>
        <div><span>RAW FLIPS</span><strong>{chatterMachine.rawFlipCount}</strong><small>classifier chatter</small></div>
        <div><span>GOVERNED FLIPS</span><strong className="positive">{chatterMachine.governedFlipCount}</strong><small>{chatterMachine.noiseSuppressed} suppressed</small></div>
        <div><span>DWELL</span><strong>{current?.dwellFrames ?? 0}</strong><small>frames in regime</small></div>
      </div>

      <div className="regimeHysteresisScenarioGrid">
        <Scenario title="ONE RECOVERY BLIP" result={noiseHoldMachine} />
        <Scenario title="CONFIRMED RECOVERY" result={recoveryMachine} />
        <Scenario title="RAW CHATTER" result={chatterMachine} />
        <Scenario title="CONFIRMED SWITCH" result={switchMachine} />
      </div>

      <div className="regimeHysteresisTimeline">
        <div className="regimeHysteresisTimelineHead"><span>TIME</span><span>RAW</span><span>P(change)</span><span>GOVERNED</span><span>PHASE</span><span>DWELL</span></div>
        {switchMachine.frames.map(row=>(
          <div key={row.timeMs} className={row.rawRegime!==row.activeRegime?"suppressed":""}>
            <code>{row.timeMs/1000}s</code>
            <span>{row.rawRegime}</span>
            <b>{pct(row.rawChangeProbability)}</b>
            <strong>{row.activeRegime}</strong>
            <em>{row.phase}</em>
            <i>{row.dwellFrames}</i>
          </div>
        ))}
      </div>

      <div className="regimeHysteresisTransitions">
        {switchMachine.transitions.map((event,index)=>(
          <article key={`${event.timeMs}-${event.type}-${index}`}>
            <span>{event.type}</span>
            <strong>{event.from}</strong>
            <i>→</i>
            <strong>{event.to}</strong>
            <small>{event.evidenceFrames} evidence frames · P {pct(event.changeProbability)}</small>
          </article>
        ))}
      </div>

      <div className="regimeHysteresisPolicy">
        <div><span>ENTER</span><strong>{pct(switchMachine.config.enterProbability)}</strong><small>{switchMachine.config.enterFrames} frames</small></div>
        <div><span>MIN DWELL</span><strong>{switchMachine.config.minDwellFrames}</strong><small>frames</small></div>
        <div><span>EXIT</span><strong>≤ {pct(switchMachine.config.exitProbability)}</strong><small>{switchMachine.config.recoveryFrames} recovery frames</small></div>
        <div><span>SWITCH</span><strong>{pct(switchMachine.config.switchProbability)}</strong><small>{switchMachine.config.switchFrames} frames</small></div>
      </div>

      <div className="regimeHysteresisMethod"><span>METHOD / LIMITS</span><p>{copy.note}</p><code>veto.regime.hysteresis.v1</code></div>
    </section>
  );
}

function Scenario({title,result}:{title:string;result:typeof switchMachine}) {
  return (
    <article>
      <span>{title}</span>
      <strong>{result.activeRegime}</strong>
      <b>{result.phase}</b>
      <small>raw {result.rawFlipCount} · governed {result.governedFlipCount}</small>
      <em>{result.noiseSuppressed} SUPPRESSED</em>
    </article>
  );
}
