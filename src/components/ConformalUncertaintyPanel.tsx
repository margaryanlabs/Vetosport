"use client";

import type { Locale } from "@/lib/domain/types";
import {
  calibratedEnvelope,
  driftEnvelope,
  severeEnvelope,
  sparseEnvelope,
} from "@/lib/conformal/sandbox";

const pct=(v:number)=>`${(v*100).toFixed(1)}%`;

export function ConformalUncertaintyPanel({locale}:{locale:Locale}) {
  const copy=locale==="ru"
    ? {
        title:"ADAPTIVE CONFORMAL UNCERTAINTY",
        subtitle:"Интервал вокруг fair probability расширяется, когда recent calibration coverage начинает ломаться",
        warning:"POINT-IN-TIME PROBABILITY ERROR · НЕ ИНТЕРВАЛ ИСХОДА МАТЧА",
        note:"Nonconformity = |predicted probability − reference probability| в point-in-time validation. При плохом recent coverage radius расширяется; слишком широкий envelope создаёт hard abstention."
      }
    : locale==="hy"
      ? {
          title:"ADAPTIVE CONFORMAL UNCERTAINTY",
          subtitle:"Fair probability-ի uncertainty envelope-ը լայնանում է, երբ recent calibration coverage-ը վատանում է",
          warning:"POINT-IN-TIME PROBABILITY ERROR · ՈՉ MATCH OUTCOME INTERVAL",
          note:"Nonconformity-ը probability estimation error-ն է point-in-time validation-ում։ Coverage drift-ի դեպքում envelope-ը լայնանում է։"
        }
      : {
          title:"ADAPTIVE CONFORMAL UNCERTAINTY",
          subtitle:"The fair-probability envelope widens when recent calibration coverage starts to fail",
          warning:"POINT-IN-TIME PROBABILITY ERROR · NOT A MATCH-OUTCOME INTERVAL",
          note:"Nonconformity is |predicted probability − reference probability| in point-in-time validation. Broken recent coverage widens the radius; an excessively wide envelope becomes a hard abstention."
        };

  return (
    <section className="conformalSurface">
      <div className="conformalHead">
        <div><span className="miniLabel">PARALLAX XXII</span><div><h3>{copy.title}</h3><p>{copy.subtitle}</p></div></div>
        <span>{copy.warning}</span>
      </div>

      <div className="conformalGrid">
        <EnvelopeCard title="CALIBRATED" envelope={calibratedEnvelope} />
        <EnvelopeCard title="COVERAGE DRIFT" envelope={driftEnvelope} />
        <EnvelopeCard title="SEVERE DRIFT" envelope={severeEnvelope} />
        <EnvelopeCard title="SPARSE REGIME" envelope={sparseEnvelope} />
      </div>

      <div className="conformalInterval">
        <div><span>BASE RADIUS</span><strong>{pct(driftEnvelope.baseRadius)}</strong></div>
        <i>→</i>
        <div><span>ADAPTIVE RADIUS</span><strong>{pct(driftEnvelope.adaptiveRadius)}</strong></div>
        <i>→</i>
        <div><span>ENVELOPE</span><strong>{pct(driftEnvelope.lower)} — {pct(driftEnvelope.upper)}</strong></div>
        <div><span>RECENT COVERAGE</span><strong className="negative">{pct(driftEnvelope.recentCoverage)}</strong></div>
      </div>

      <div className="conformalProof">
        <div><span>SEVERE CONTROL</span><strong>{severeEnvelope.status}</strong></div>
        <div><span>RADIUS</span><strong>{pct(severeEnvelope.adaptiveRadius)}</strong></div>
        <div><span>ACTION</span><strong className="negative">{severeEnvelope.hardBlock?"ABSTAIN":"KEEP"}</strong></div>
        <div><span>WHY</span><p>{severeEnvelope.reasons.join(" · ")}</p></div>
      </div>

      <div className="conformalMethod"><span>METHOD / LIMITS</span><p>{copy.note}</p><code>veto.conformal.uncertainty.v1</code></div>
    </section>
  );
}

function EnvelopeCard({title,envelope}:{title:string;envelope:typeof calibratedEnvelope}) {
  return (
    <article className={envelope.status.toLowerCase()}>
      <span>{title}</span>
      <strong>{envelope.status}</strong>
      <b>{pct(envelope.adaptiveRadius)}</b>
      <small>{envelope.source} · N={envelope.calibrationSample} · RECENT {pct(envelope.recentCoverage)}</small>
      <em className={envelope.hardBlock?"negative":"positive"}>{envelope.hardBlock?"HARD BLOCK":"NO BLOCK"}</em>
    </article>
  );
}
