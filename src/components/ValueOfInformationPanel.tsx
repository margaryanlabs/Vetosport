"use client";

import type { Locale } from "@/lib/domain/types";
import { voiContext, voiRoutes } from "@/lib/voi/sandbox";

const pct=(v:number)=>`${(v*100).toFixed(0)}%`;
const money=(v:number)=>`$${v.toFixed(3)}`;

export function ValueOfInformationPanel({locale}:{locale:Locale}) {
  const copy=locale==="ru"
    ? {
        title:"VALUE-OF-INFORMATION ROUTER",
        subtitle:"Какой следующий источник данных реально стоит запросить до того, как сигнал исчезнет",
        warning:"SYNTHETIC ACQUISITION POLICY · НЕ АВТОПОКУПКА ДАННЫХ",
        note:"Router учитывает uncertainty reduction, identifiability gain, latency survival, стоимость и зависимость источников. FETCH NOW не означает ставку — это только разрешение запросить дополнительную информацию."
      }
    : locale==="hy"
      ? {
          title:"VALUE-OF-INFORMATION ROUTER",
          subtitle:"Որ տվյալների աղբյուրն արժե հարցնել մինչև signal-ը կվերանա",
          warning:"SYNTHETIC ACQUISITION POLICY · ՈՉ ԱՎՏՈՄԱՏ ՏՎՅԱԼՆԵՐԻ ԳՆՈՒՄ",
          note:"Router-ը հաշվի է առնում uncertainty reduction, identifiability gain, latency survival, cost և source dependency։"
        }
      : {
          title:"VALUE-OF-INFORMATION ROUTER",
          subtitle:"Which next data request is actually worth making before the signal decays",
          warning:"SYNTHETIC ACQUISITION POLICY · NOT AUTOMATED DATA PURCHASING",
          note:"The router prices uncertainty reduction, identifiability gain, latency survival, cost and source dependence. FETCH NOW only authorizes an information request, never a wager."
        };

  return (
    <section className="voiSurface">
      <div className="voiHead">
        <div><span className="miniLabel">PARALLAX XI</span><div><h3>{copy.title}</h3><p>{copy.subtitle}</p></div></div>
        <span>{copy.warning}</span>
      </div>

      <div className="voiSummary">
        <Metric label="SIGNAL HALF-LIFE" value={`${(voiContext.signalHalfLifeMs/1000).toFixed(1)}s`} />
        <Metric label="MAX LATENCY" value={`${voiContext.maxLatencyMs}ms`} />
        <Metric label="REQUEST BUDGET" value={money(voiContext.requestBudgetUsd)} />
        <Metric label="UNRESOLVED FIELDS" value={String(new Set([...voiContext.conflictedFields,...voiContext.missingFields,...voiContext.weakFields]).size)} />
      </div>

      <div className="voiQueue">
        {voiRoutes.map((route,index)=>(
          <article className={route.action.toLowerCase().replaceAll("_","-")} key={route.id}>
            <div className="voiRank"><span>{String(index+1).padStart(2,"0")}</span><strong>{pct(route.score)}</strong></div>
            <div className="voiIdentity"><strong>{route.label}</strong><small>{route.id}</small><div>{route.reasons.map(reason=><span key={reason}>{reason}</span>)}</div></div>
            <div className="voiMetrics">
              <span>VALUE <b>{pct(route.expectedValue)}</b></span>
              <span>SURVIVAL <b>{pct(route.latencySurvival)}</b></span>
              <span>REDUNDANCY <b>{pct(route.redundancyPenalty)}</b></span>
              <span>COST PEN <b>{pct(route.costPenalty)}</b></span>
            </div>
            <em>{route.action}</em>
          </article>
        ))}
      </div>

      <div className="voiDecision">
        <div><span>NEXT BEST REQUEST</span><strong>{voiRoutes[0]?.label ?? "NONE"}</strong></div>
        <div><span>ACTION</span><strong className="positive">{voiRoutes[0]?.action ?? "SKIP"}</strong></div>
        <div><span>WHY</span><p>{voiRoutes[0]?.reasons.join(" · ")}</p></div>
      </div>

      <div className="voiMethod"><span>METHOD / LIMITS</span><p>{copy.note}</p><code>veto.voi.router.v1</code></div>
    </section>
  );
}

function Metric({label,value}:{label:string;value:string}) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}
