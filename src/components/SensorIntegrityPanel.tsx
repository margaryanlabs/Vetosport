"use client";

import type { Locale } from "@/lib/domain/types";
import { conflictIntegrity, healthyIntegrity, missingIntegrity } from "@/lib/integrity/sandbox";

const pct=(v:number)=>`${(v*100).toFixed(0)}%`;

export function SensorIntegrityPanel({locale}:{locale:Locale}) {
  const copy=locale==="ru"
    ? {
        title:"SENSOR INTEGRITY + IDENTIFIABILITY",
        subtitle:"Можно ли доверять входным данным и достаточно ли их для оценки скрытого состояния",
        warning:"SYNTHETIC SENSOR FUSION · LIVE PROVIDERS ЕЩЁ НЕ ПОДКЛЮЧЕНЫ",
        note:"Зависимые источники схлопываются в один dependency group. Конфликт score/clock или неидентифицируемое latent state блокируют downstream EDGE независимо от силы модели."
      }
    : locale==="hy"
      ? {
          title:"SENSOR INTEGRITY + IDENTIFIABILITY",
          subtitle:"Արդյոք տվյալները վստահելի են և բավարար latent state-ը գնահատելու համար",
          warning:"SYNTHETIC SENSOR FUSION · LIVE PROVIDERS ԴԵՌ ՉԵՆ ՄԻԱՑՎԱԾ",
          note:"Կախված աղբյուրները մեկ dependency group են։ Score/clock conflict-ը կամ չիդենտիֆիկացվող latent state-ը hard-block են downstream EDGE-ի համար։"
        }
      : {
          title:"SENSOR INTEGRITY + IDENTIFIABILITY",
          subtitle:"Can VETO trust the inputs, and is the latent state actually observable?",
          warning:"SYNTHETIC SENSOR FUSION · LIVE PROVIDERS NOT CONNECTED YET",
          note:"Dependent sources collapse into one dependency group. Score/clock conflict or an unidentifiable latent state hard-blocks downstream EDGE regardless of model strength."
        };

  return (
    <section className="sensorIntegritySurface">
      <div className="sensorIntegrityHead">
        <div><span className="miniLabel">PARALLAX X</span><div><h3>{copy.title}</h3><p>{copy.subtitle}</p></div></div>
        <span>{copy.warning}</span>
      </div>
      <div className="sensorIntegritySummary">
        <Metric label="INTEGRITY" value={pct(healthyIntegrity.integrityScore)} />
        <Metric label="IDENTIFIABILITY" value={pct(healthyIntegrity.identifiabilityScore)} />
        <Metric label="INDEPENDENT EVIDENCE" value={pct(healthyIntegrity.independentEvidenceRatio)} />
        <Metric label="STATUS" value={healthyIntegrity.overallStatus} positive />
        <Metric label="HARD BLOCK" value={healthyIntegrity.hardBlock ? "YES" : "NO"} positive={!healthyIntegrity.hardBlock} />
      </div>
      <div className="sensorIntegrityMain">
        <section>
          <div className="sensorSubhead"><span>FUSED SENSOR FIELDS</span><strong>Dependency-aware evidence</strong></div>
          <div className="sensorFieldTable">
            {healthyIntegrity.fields.map(field=>(
              <div key={field.field} className={field.status.toLowerCase()}>
                <strong>{field.field.toUpperCase()}</strong>
                <span>{String(field.value ?? "—")}</span>
                <span>CONF <b>{pct(field.confidence)}</b></span>
                <span>GROUPS <b>{field.independentGroups}</b></span>
                <span>DISAGREE <b>{pct(field.disagreement)}</b></span>
                <em>{field.status}</em>
              </div>
            ))}
          </div>
        </section>
        <section>
          <div className="sensorSubhead"><span>LATENT IDENTIFIABILITY</span><strong>Can this state be inferred?</strong></div>
          <div className="sensorDimensionList">
            {healthyIntegrity.dimensions.map(d=>(
              <article key={d.id}>
                <div><strong>{d.label}</strong><em className={d.identifiable?"positive":"negative"}>{d.identifiable?"IDENTIFIABLE":"BLOCKED"}</em></div>
                <b>{pct(d.score)}</b>
                <small>{d.independentGroups} independent groups</small>
              </article>
            ))}
          </div>
        </section>
      </div>
      <div className="sensorControls">
        <Control title="SCORE CONFLICT" status={conflictIntegrity.overallStatus} blocked={conflictIntegrity.hardBlock} score={conflictIntegrity.integrityScore} />
        <Control title="MISSING LINEUP" status={missingIntegrity.overallStatus} blocked={missingIntegrity.hardBlock} score={missingIntegrity.identifiabilityScore} />
      </div>
      <div className="sensorIntegrityMethod"><span>METHOD / LIMITS</span><p>{copy.note}</p><code>veto.integrity.identifiability.v1</code></div>
    </section>
  );
}

function Metric({label,value,positive}:{label:string;value:string;positive?:boolean}) {
  return <div><span>{label}</span><strong className={positive?"positive":""}>{value}</strong></div>;
}
function Control({title,status,blocked,score}:{title:string;status:string;blocked:boolean;score:number}) {
  return <article><span>{title}</span><strong>{status}</strong><b>{pct(score)}</b><em className={blocked?"negative":"positive"}>{blocked?"HARD BLOCK":"NO HARD BLOCK"}</em></article>;
}
