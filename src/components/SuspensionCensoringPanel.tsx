"use client";

import type { Locale } from "@/lib/domain/types";
import { biasedCensoring, cleanCensoring, thinCensoring } from "@/lib/censoring/sandbox";

const pct=(v:number)=>`${(v*100).toFixed(0)}%`;
const pp=(v:number)=>`${v>=0?"+":""}${v.toFixed(2)} pp`;

export function SuspensionCensoringPanel({locale}:{locale:Locale}) {
  const copy=locale==="ru"
    ? {
        title:"SUSPENSION CENSORING / AVAILABILITY BIAS",
        subtitle:"Проверяет, не возникают ли лучшие edge именно тогда, когда рынок недоступен",
        warning:"SYNTHETIC AVAILABILITY WINDOWS · НЕ LIVE BOOKMAKER LOGS",
        note:"Raw edge без учёта suspensions создаёт selection bias. VETO сравнивает raw candidate set с executable subset и блокирует family, если edge систематически исчезает вместе с доступностью."
      }
    : locale==="hy"
      ? {
          title:"SUSPENSION CENSORING / AVAILABILITY BIAS",
          subtitle:"Ստուգում է՝ լավագույն edge-երը չեն՞ առաջանում հենց unavailable market պատուհաններում",
          warning:"SYNTHETIC AVAILABILITY WINDOWS · ՈՉ LIVE BOOKMAKER LOGS",
          note:"Raw edge-ը առանց suspension/executability-ի կարող է selection bias ստեղծել։"
        }
      : {
          title:"SUSPENSION CENSORING / AVAILABILITY BIAS",
          subtitle:"Checks whether the strongest edges appear exactly when the market is unavailable",
          warning:"SYNTHETIC AVAILABILITY WINDOWS · NOT LIVE BOOKMAKER LOGS",
          note:"Raw edge without suspension awareness creates selection bias. VETO compares the raw candidate set with the executable subset and blocks a family when the apparent edge disappears with availability."
        };

  return (
    <section className="censoringSurface">
      <div className="censoringHead">
        <div><span className="miniLabel">PARALLAX XVII</span><div><h3>{copy.title}</h3><p>{copy.subtitle}</p></div></div>
        <span>{copy.warning}</span>
      </div>

      <div className="censoringGrid">
        <Scenario title="CLEAN AVAILABILITY" result={cleanCensoring} />
        <Scenario title="BIASED AVAILABILITY" result={biasedCensoring} />
        <Scenario title="THIN AVAILABILITY" result={thinCensoring} />
      </div>

      <div className="censoringProof">
        <div><span>RAW CANDIDATE EDGE</span><strong>{pp(biasedCensoring.rawMeanGapPp)}</strong></div>
        <i>→</i>
        <div><span>EXECUTABLE EDGE</span><strong>{pp(biasedCensoring.executableMeanGapPp)}</strong></div>
        <i>→</i>
        <div><span>INFLATION</span><strong className="negative">{pp(biasedCensoring.edgeInflationPp)}</strong></div>
        <div><span>CENSORED CANDIDATES</span><strong>{pct(biasedCensoring.censoredCandidateRate)}</strong></div>
        <div><span>ACTION</span><strong className="negative">{biasedCensoring.hardBlock?"BLOCK FAMILY":"KEEP"}</strong></div>
      </div>

      <div className="censoringReasons">
        {biasedCensoring.reasons.map(reason=><span key={reason}>{reason}</span>)}
      </div>

      <div className="censoringMethod"><span>METHOD / LIMITS</span><p>{copy.note}</p><code>veto.suspension.censoring.v1</code></div>
    </section>
  );
}

function Scenario({title,result}:{title:string;result:typeof cleanCensoring}) {
  return <article className={result.status.toLowerCase()}><span>{title}</span><strong>{result.status}</strong><b>{pct(result.biasScore)}</b><small>EXEC {pct(result.executableCoverage)} · CENSORED {pct(result.censoredCandidateRate)}</small><em className={result.hardBlock?"negative":"positive"}>{result.hardBlock?"BLOCK":"NO BLOCK"}</em></article>;
}
