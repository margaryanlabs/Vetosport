"use client";

import type { Locale } from "@/lib/domain/types";
import { discoveryControl } from "@/lib/discovery/sandbox";

const pct=(v:number)=>`${(v*100).toFixed(2)}%`;

export function DiscoveryControlPanel({locale}:{locale:Locale}) {
  const copy=locale==="ru"
    ? {
        title:"DISCOVERY CONTROL PLANE",
        subtitle:"Учитывает все проверенные гипотезы, а не только красивые победители",
        warning:"SYNTHETIC HYPOTHESIS STREAM · RESEARCH GOVERNANCE DEMO",
        note:"Batch mode использует Benjamini–Hochberg. Streaming mode — консервативный alpha-spending budget. Это защита research-процесса, а не доказательство существования alpha."
      }
    : locale==="hy"
      ? {
          title:"DISCOVERY CONTROL PLANE",
          subtitle:"Հաշվում է բոլոր փորձարկված hypothesis-ները, ոչ միայն հաջողվածները",
          warning:"SYNTHETIC HYPOTHESIS STREAM · RESEARCH GOVERNANCE DEMO",
          note:"Batch mode-ը Benjamini–Hochberg է, streaming mode-ը conservative alpha-spending budget։"
        }
      : {
          title:"DISCOVERY CONTROL PLANE",
          subtitle:"Counts every tested hypothesis, not just the attractive winners",
          warning:"SYNTHETIC HYPOTHESIS STREAM · RESEARCH GOVERNANCE DEMO",
          note:"Batch mode uses Benjamini–Hochberg. Streaming mode uses a conservative alpha-spending budget. This governs research error, not proof that alpha exists."
        };

  return (
    <section className="discoverySurface">
      <div className="discoveryHead">
        <div><span className="miniLabel">PARALLAX XV</span><div><h3>{copy.title}</h3><p>{copy.subtitle}</p></div></div>
        <span>{copy.warning}</span>
      </div>

      <div className="discoverySummary">
        <Metric label="TESTED" value={String(discoveryControl.tested)} />
        <Metric label="BH DISCOVERIES" value={String(discoveryControl.discoveries)} />
        <Metric label="FDR q" value={pct(discoveryControl.q)} />
        <Metric label="STREAM ALPHA BUDGET" value={pct(discoveryControl.alphaBudget)} />
      </div>

      <div className="discoveryTable">
        <div className="discoveryTableHead"><span>ID</span><span>FAMILY</span><span>p</span><span>BH THRESHOLD</span><span>BATCH</span><span>STREAM α</span><span>STREAM</span></div>
        {discoveryControl.batch.map(batch=>{
          const stream=discoveryControl.sequential.find(x=>x.id===batch.id);
          return (
            <div className="discoveryRow" key={batch.id}>
              <code>{batch.id}</code>
              <span>{batch.family}</span>
              <span>{batch.pValue.toFixed(3)}</span>
              <span>{batch.threshold.toFixed(4)}</span>
              <b className={batch.accepted?"positive":""}>{batch.accepted?"DISCOVERY":"REJECT"}</b>
              <span>{stream?.alphaAllocated.toFixed(4)}</span>
              <b className={stream?.accepted?"positive":""}>{stream?.accepted?"PASS":"NO"}</b>
            </div>
          );
        })}
      </div>

      <div className="discoveryBudget">
        <div><span>SEQUENTIAL BUDGET</span><strong>{pct(discoveryControl.sequential[discoveryControl.sequential.length - 1]?.cumulativeAlphaSpent ?? 0)}</strong></div>
        <div className="discoveryBudgetRail">{discoveryControl.sequential.map(x=><i key={x.id} style={{width:`${Math.max(3,x.alphaAllocated/discoveryControl.alphaBudget*100)}%`}} />)}</div>
      </div>

      <div className="discoveryMethod"><span>METHOD / LIMITS</span><p>{copy.note}</p><code>veto.discovery.control.v1</code></div>
    </section>
  );
}

function Metric({label,value}:{label:string;value:string}) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}
