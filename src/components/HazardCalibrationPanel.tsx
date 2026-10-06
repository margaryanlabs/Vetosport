"use client";

import type { Locale } from "@/lib/domain/types";
import {
  highHazardEstimate,
  lowHazardEstimate,
  openModel1,
  openModel3,
  openModel5,
  sparseHazardEstimate,
} from "@/lib/hazard-calibration/sandbox";

const pct=(v:number)=>`${(v*100).toFixed(0)}%`;

export function HazardCalibrationPanel({locale}:{locale:Locale}) {
  const copy=locale==="ru"
    ? {
        title:"HAZARD CALIBRATION / LEAD-TIME RELIABILITY",
        subtitle:"Превращает experimental hazard index в проверяемую P(transition ≤ 1/3/5 frames)",
        warning:"SYNTHETIC SHADOW HISTORY · НЕ LIVE OOS CALIBRATION",
        note:"Beta-shrinkage стабилизирует малые bin’ы, isotonic pooling заставляет вероятность расти монотонно вместе с hazard. Sparse regime использует pooled fallback."
      }
    : locale==="hy"
      ? {
          title:"HAZARD CALIBRATION / LEAD-TIME RELIABILITY",
          subtitle:"Experimental hazard index-ը վերածում է ստուգելի P(transition ≤ 1/3/5 frames)-ի",
          warning:"SYNTHETIC SHADOW HISTORY · ՈՉ LIVE OOS CALIBRATION",
          note:"Beta-shrinkage-ը կայունացնում է փոքր bin-երը, isotonic pooling-ը պահում է monotonicity։"
        }
      : {
          title:"HAZARD CALIBRATION / LEAD-TIME RELIABILITY",
          subtitle:"Turns the experimental hazard index into testable P(transition ≤ 1/3/5 frames)",
          warning:"SYNTHETIC SHADOW HISTORY · NOT LIVE OOS CALIBRATION",
          note:"Beta shrinkage stabilizes small bins; isotonic pooling enforces monotonic probabilities as hazard rises. Sparse regimes fall back to pooled history."
        };

  return (
    <section className="hazardCalibrationSurface">
      <div className="hazardCalibrationHead">
        <div><span className="miniLabel">PARALLAX XXVI</span><div><h3>{copy.title}</h3><p>{copy.subtitle}</p></div></div>
        <span>{copy.warning}</span>
      </div>

      <div className="hazardCalibrationHero">
        <Estimate title="LOW HAZARD" estimate={lowHazardEstimate} />
        <Estimate title="HIGH HAZARD" estimate={highHazardEstimate} />
        <Estimate title="SPARSE REGIME" estimate={sparseHazardEstimate} />
      </div>

      <div className="hazardCalibrationModels">
        <Model title="1 FRAME" model={openModel1} />
        <Model title="3 FRAMES" model={openModel3} />
        <Model title="5 FRAMES" model={openModel5} />
      </div>

      <div className="hazardCalibrationBins">
        {openModel3.bins.map(bin=>(
          <article key={bin.lower}>
            <span>{pct(bin.lower)}–{pct(bin.upper)}</span>
            <div><i style={{width:`${Math.max(2,bin.calibratedRate*100)}%`}} /></div>
            <strong>{pct(bin.calibratedRate)}</strong>
            <small>N={bin.count}</small>
          </article>
        ))}
      </div>

      <div className="hazardCalibrationProof">
        <div><span>INDEX</span><strong>{pct(highHazardEstimate.hazardScore)}</strong></div>
        <i>→</i>
        <div><span>P ≤1 FRAME</span><strong>{pct(highHazardEstimate.p1)}</strong></div>
        <div><span>P ≤3 FRAMES</span><strong>{pct(highHazardEstimate.p3)}</strong></div>
        <div><span>P ≤5 FRAMES</span><strong>{pct(highHazardEstimate.p5)}</strong></div>
      </div>

      <div className="hazardCalibrationMethod"><span>METHOD / LIMITS</span><p>{copy.note}</p><code>veto.regime.hazard-calibration.v1</code></div>
    </section>
  );
}

function Estimate({title,estimate}:{title:string;estimate:typeof highHazardEstimate}) {
  return <article><span>{title}</span><strong>{estimate.status}</strong><b>{pct(estimate.hazardScore)}</b><small>P1 {pct(estimate.p1)} · P3 {pct(estimate.p3)} · P5 {pct(estimate.p5)}</small><em>{estimate.source}</em></article>;
}

function Model({title,model}:{title:string;model:typeof openModel1}) {
  return <article><span>{title}</span><strong>{model.status}</strong><b>N={model.sampleSize}</b><small>BRIER {model.brier.toFixed(3)}</small></article>;
}
