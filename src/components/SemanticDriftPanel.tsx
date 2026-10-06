"use client";

import type { Locale } from "@/lib/domain/types";
import { breakingDrift, stableDrift } from "@/lib/drift/sandbox";

const pct=(v:number)=>`${(v*100).toFixed(0)}%`;

export function SemanticDriftPanel({locale}:{locale:Locale}) {
  const copy=locale==="ru"
    ? {
        title:"SEMANTIC DRIFT DETECTOR",
        subtitle:"Ловит тихие изменения provider schema и settlement rules до того, как они сломают replay",
        warning:"SYNTHETIC PROVIDER VERSIONS · LIVE RULEBOOK FEED ЕЩЁ НЕ ПОДКЛЮЧЕН",
        note:"Breaking drift замораживает affected market families до versioned contract update и повторного point-in-time replay. Non-breaking alias drift только обновляет registry."
      }
    : locale==="hy"
      ? {
          title:"SEMANTIC DRIFT DETECTOR",
          subtitle:"Բռնում է provider schema/settlement rule-ի լուռ փոփոխությունները replay-ը կոտրելուց առաջ",
          warning:"SYNTHETIC PROVIDER VERSIONS · LIVE RULEBOOK FEED ԴԵՌ ՉԿԱ",
          note:"Breaking drift-ը freeze է անում affected market families-ը մինչև versioned contract update և replay repair։"
        }
      : {
          title:"SEMANTIC DRIFT DETECTOR",
          subtitle:"Detects silent provider schema and settlement changes before they poison replay",
          warning:"SYNTHETIC PROVIDER VERSIONS · LIVE RULEBOOK FEED NOT CONNECTED",
          note:"Breaking drift freezes affected market families until contract semantics are versioned and point-in-time replay is repaired. Non-breaking alias drift only refreshes the registry."
        };

  return (
    <section className="semanticDriftSurface">
      <div className="semanticDriftHead">
        <div><span className="miniLabel">PARALLAX XIII</span><div><h3>{copy.title}</h3><p>{copy.subtitle}</p></div></div>
        <span>{copy.warning}</span>
      </div>

      <div className="semanticDriftGrid">
        <DriftCard title="NON-BREAKING CONTROL" drift={stableDrift} />
        <DriftCard title="BREAKING CONTROL" drift={breakingDrift} />
      </div>

      <div className="semanticDriftChanges">
        <div><span>BREAKING CHANGESET</span><strong>{breakingDrift.fromVersion} → {breakingDrift.toVersion}</strong></div>
        {breakingDrift.changes.map(change=>(
          <article key={change.path}>
            <span>{change.category}</span>
            <strong>{change.path}</strong>
            <small>{String(change.before)} → {String(change.after)}</small>
            <em className={change.severity==="BREAKING"?"negative":""}>{change.severity}</em>
          </article>
        ))}
      </div>

      <div className="semanticDriftActions">
        <div><span>REQUIRED RESPONSE</span><strong>{breakingDrift.freezeRequired?"FREEZE AFFECTED FAMILIES":"OBSERVE"}</strong></div>
        <div>{breakingDrift.actions.map(action=><span key={action}>{action}</span>)}</div>
      </div>

      <div className="semanticDriftMethod"><span>METHOD / LIMITS</span><p>{copy.note}</p><code>veto.semantic-drift.v1</code></div>
    </section>
  );
}

function DriftCard({title,drift}:{title:string;drift:typeof stableDrift}) {
  return (
    <article className={drift.breaking?"breaking":""}>
      <span>{title}</span>
      <strong>{drift.breaking?"BREAKING":"SAFE"}</strong>
      <b>{pct(drift.driftScore)}</b>
      <small>{drift.changes.length} change(s)</small>
      <em className={drift.freezeRequired?"negative":"positive"}>{drift.freezeRequired?"FREEZE":"NO FREEZE"}</em>
    </article>
  );
}
