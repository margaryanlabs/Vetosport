"use client";

import type { Locale } from "@/lib/domain/types";
import { sandboxPropagationAnalysis } from "@/lib/parallax/propagation-sandbox";

const ms = (value: number | null) =>
  value == null
    ? "—"
    : value >= 1000
      ? `${(value / 1000).toFixed(1)}s`
      : `${Math.round(value)}ms`;

const pct = (value: number) => `${(value * 100).toFixed(0)}%`;

export function CrossMarketPropagation({
  locale,
}: {
  locale: Locale;
}) {
  const analysis = sandboxPropagationAnalysis;

  const copy =
    locale === "ru"
      ? {
          title: "CROSS-MARKET PROPAGATION",
          subtitle:
            "Какие связанные рынки уже поглотили state shock, а какие всё ещё отстают",
          warning:
            "СИНТЕТИЧЕСКИЙ LINKED-MARKET TRACE · НЕ LIVE EDGE",
          leader: "PROPAGATION LEADER",
          candidates: "STALE CANDIDATES",
          note:
            "STALE-CANDIDATE означает временное структурное отставание внутри синхронного тестового потока. Это не доказательство исполнимой цены и не торговый сигнал без real quotes, limits, suspensions и OOS CLV.",
        }
      : locale === "hy"
        ? {
            title: "CROSS-MARKET PROPAGATION",
            subtitle:
              "Որ կապված շուկաներն արդեն կլանել են state shock-ը, իսկ որոնք դեռ ուշանում են",
            warning:
              "ՍԻՆԹԵՏԻԿ LINKED-MARKET TRACE · ՈՉ LIVE EDGE",
            leader: "PROPAGATION LEADER",
            candidates: "STALE CANDIDATES",
            note:
              "STALE-CANDIDATE-ը կառուցվածքային ուշացում է synchronized test stream-ում, ոչ թե ապացուցված executable edge։",
          }
        : {
            title: "CROSS-MARKET PROPAGATION",
            subtitle:
              "Which linked markets absorbed the state shock and which are still behind",
            warning:
              "SYNTHETIC LINKED-MARKET TRACE · NOT A LIVE EDGE",
            leader: "PROPAGATION LEADER",
            candidates: "STALE CANDIDATES",
            note:
              "STALE-CANDIDATE means temporary structural lag inside a synchronized test stream. It is not proof of an executable edge without real quotes, limits, suspensions and OOS CLV.",
          };

  const leader = analysis.families.find(
    (family) => family.familyId === analysis.leaderFamilyId,
  );

  return (
    <section className="propagationSurface">
      <div className="propagationHead">
        <div>
          <span className="miniLabel">PARALLAX III</span>
          <div>
            <h3>{copy.title}</h3>
            <p>{copy.subtitle}</p>
          </div>
        </div>
        <span>{copy.warning}</span>
      </div>

      <div className="propagationSummary">
        <div>
          <span>{copy.leader}</span>
          <strong>{leader?.label ?? "—"}</strong>
        </div>
        <div>
          <span>PROPAGATION SPREAD</span>
          <strong>{ms(analysis.propagationSpreadMs)}</strong>
        </div>
        <div>
          <span>MODEL CONFIDENCE</span>
          <strong>{pct(analysis.confidence)}</strong>
        </div>
        <div>
          <span>{copy.candidates}</span>
          <strong>{analysis.staleCandidates.length}</strong>
        </div>
      </div>

      <div className="propagationGraph">
        <div className="propagationLeaderNode">
          <span>LEADER</span>
          <strong>{leader?.label ?? "—"}</strong>
          <small>
            response {ms(leader?.responseTimeMs ?? null)}
          </small>
        </div>

        <div className="propagationEdges">
          {analysis.graph.map((edge) => {
            const target = analysis.families.find(
              (family) => family.familyId === edge.to,
            );
            return (
              <div
                className={`propagationEdge ${target?.classification
                  .toLowerCase()
                  .replaceAll(" ", "-")}`}
                key={`${edge.from}-${edge.to}`}
              >
                <div>
                  <i style={{ width: `${Math.max(8, edge.strength * 100)}%` }} />
                  <span>+{ms(edge.lagMs)}</span>
                </div>
                <strong>{target?.label ?? edge.to}</strong>
                <em>
                  {target?.classification ?? "—"}
                </em>
              </div>
            );
          })}
        </div>
      </div>

      <div className="propagationTable">
        <div className="propagationTableHead">
          <span>FAMILY</span>
          <span>STATE</span>
          <span>RESPONSE</span>
          <span>LAG</span>
          <span>ABSORBED</span>
          <span>OUTSTANDING</span>
          <span>STALE SCORE</span>
          <span>EXEC</span>
        </div>

        {analysis.families.map((family) => (
          <div
            className={`propagationRow ${family.classification
              .toLowerCase()
              .replaceAll(" ", "-")}`}
            key={family.familyId}
          >
            <strong>{family.label}</strong>
            <em>{family.classification}</em>
            <span>{ms(family.responseTimeMs)}</span>
            <span>{ms(family.followerLagMs)}</span>
            <span>{pct(Math.min(1, family.responseFraction))}</span>
            <span>{family.outstandingGapPp.toFixed(1)} pp</span>
            <b>{pct(family.staleScore)}</b>
            <span>{pct(family.executableCoverage)}</span>
          </div>
        ))}
      </div>

      <div className="propagationCandidates">
        <div>
          <span>{copy.candidates}</span>
          <strong>
            Markets that remain behind the linked-family response
          </strong>
        </div>

        <div>
          {analysis.staleCandidates.length === 0 ? (
            <span className="propagationEmpty">NONE</span>
          ) : (
            analysis.staleCandidates.map((candidate) => (
              <article key={candidate.familyId}>
                <span>{candidate.label}</span>
                <strong>{pct(candidate.staleScore)}</strong>
                <small>
                  lag {ms(candidate.followerLagMs)} · outstanding{" "}
                  {candidate.outstandingGapPp.toFixed(1)} pp
                </small>
              </article>
            ))
          )}
        </div>
      </div>

      <div className="propagationMethod">
        <span>METHOD / LIMITS</span>
        <p>{copy.note}</p>
        <code>veto.parallax.cross-market.v1</code>
      </div>
    </section>
  );
}
