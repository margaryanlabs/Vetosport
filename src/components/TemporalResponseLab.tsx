"use client";

import type { Locale } from "@/lib/domain/types";
import {
  sandboxBookmakerSeries,
  sandboxTemporalAnalysis,
} from "@/lib/parallax/temporal-sandbox";

const ms = (value: number | null) =>
  value == null ? "—" : value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${Math.round(value)}ms`;

const pct = (value: number) => `${(value * 100).toFixed(0)}%`;

export function TemporalResponseLab({ locale }: { locale: Locale }) {
  const analysis = sandboxTemporalAnalysis;
  const maxTime = Math.max(
    1,
    ...sandboxBookmakerSeries.flatMap((series) =>
      series.quotes.map((quote) => quote.tMs),
    ),
  );
  const delta =
    analysis.shock.targetProbability -
    analysis.shock.baselineProbability;

  const copy =
    locale === "ru"
      ? {
          title: "TEMPORAL MARKET RESPONSE",
          subtitle:
            "Кто двигает рынок первым · кто копирует · где цена устаревает",
          warning:
            "СИНТЕТИЧЕСКИЙ QUOTE STREAM · НЕ РЕАЛЬНЫЕ БУКМЕКЕРЫ",
          graph: "MARKET LEADER GRAPH",
          fingerprints: "BOOKMAKER FINGERPRINTS",
          note:
            "Leader/follower вывод допустим только при синхронных executable quotes. Displayed odds без acceptance/clock data могут создавать ложный lag.",
        }
      : locale === "hy"
        ? {
            title: "TEMPORAL MARKET RESPONSE",
            subtitle:
              "Ով է առաջինը շարժում շուկան · ով է հետևում · որտեղ է գինը հնանում",
            warning:
              "ՍԻՆԹԵՏԻԿ QUOTE STREAM · ՈՉ ԻՐԱԿԱՆ ԲՈՒՔՄԵՔԵՐՆԵՐ",
            graph: "MARKET LEADER GRAPH",
            fingerprints: "BOOKMAKER FINGERPRINTS",
            note:
              "Leader/follower եզրակացությունը ճիշտ է միայն synchronized executable quotes-ի դեպքում։",
          }
        : {
            title: "TEMPORAL MARKET RESPONSE",
            subtitle:
              "Who moves first · who follows · where the price goes stale",
            warning:
              "SYNTHETIC QUOTE STREAM · NOT REAL BOOKMAKERS",
            graph: "MARKET LEADER GRAPH",
            fingerprints: "BOOKMAKER FINGERPRINTS",
            note:
              "Leader/follower inference is only valid with synchronized executable quotes. Displayed odds without acceptance and clock data can create false lag.",
          };

  return (
    <section className="temporalLab">
      <div className="temporalLabHead">
        <div>
          <span className="miniLabel">PARALLAX II</span>
          <div>
            <h3>{copy.title}</h3>
            <p>{copy.subtitle}</p>
          </div>
        </div>
        <span className="temporalWarning">{copy.warning}</span>
      </div>

      <div className="temporalSummary">
        <div>
          <span>LEADER</span>
          <strong>
            {analysis.fingerprints.find(
              (item) => item.bookId === analysis.leaderBookId,
            )?.label ?? "—"}
          </strong>
        </div>
        <div>
          <span>MEDIAN REACTION</span>
          <strong>{ms(analysis.medianReactionDelayMs)}</strong>
        </div>
        <div>
          <span>CONSENSUS HALF-LIFE</span>
          <strong>{ms(analysis.consensusHalfLifeMs)}</strong>
        </div>
        <div>
          <span>PROPAGATION SPREAD</span>
          <strong>{ms(analysis.propagationSpreadMs)}</strong>
        </div>
        <div>
          <span>RESPONSE CONFIDENCE</span>
          <strong>{pct(analysis.marketResponseConfidence)}</strong>
        </div>
      </div>

      <div className="temporalTrace">
        <div className="temporalTraceHead">
          <span>RESPONSE TRACE</span>
          <small>
            P { (analysis.shock.baselineProbability * 100).toFixed(1) }%
            {" → "}
            {(analysis.shock.targetProbability * 100).toFixed(1)}%
          </small>
        </div>

        <div className="temporalTraceRows">
          {sandboxBookmakerSeries.map((series) => {
            const fingerprint = analysis.fingerprints.find(
              (item) => item.bookId === series.bookId,
            );

            return (
              <div className="temporalTraceRow" key={series.bookId}>
                <div className="temporalTraceIdentity">
                  <strong>{series.label}</strong>
                  <span className={fingerprint?.classification.toLowerCase()}>
                    {fingerprint?.classification ?? "—"}
                  </span>
                </div>

                <div className="temporalTracePlot">
                  <i className="temporalTargetLine" />
                  {series.quotes.map((quote, index) => {
                    const progress =
                      Math.abs(delta) < 1e-9
                        ? 0
                        : (quote.probability -
                            analysis.shock.baselineProbability) /
                          delta;
                    const left = Math.max(
                      0,
                      Math.min(100, (quote.tMs / maxTime) * 100),
                    );
                    const bottom = Math.max(
                      3,
                      Math.min(90, progress * 78 + 5),
                    );

                    return (
                      <b
                        className={
                          quote.suspended
                            ? "suspended"
                            : quote.executable === false
                              ? "nonExecutable"
                              : ""
                        }
                        key={`${series.bookId}-${quote.tMs}-${index}`}
                        style={{
                          left: `${left}%`,
                          bottom: `${bottom}%`,
                        }}
                      />
                    );
                  })}
                </div>

                <div className="temporalTraceMeta">
                  <span>
                    DELAY <b>{ms(fingerprint?.reactionDelayMs ?? null)}</b>
                  </span>
                  <span>
                    T½ <b>{ms(fingerprint?.halfLifeMs ?? null)}</b>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="temporalLower">
        <section className="temporalGraph">
          <div className="temporalSubhead">
            <div>
              <span>{copy.graph}</span>
              <strong>Observed propagation order</strong>
            </div>
            <small>confidence-weighted</small>
          </div>

          <div className="temporalLeaderCore">
            <div className="temporalLeaderNode leader">
              <span>LEADER</span>
              <strong>
                {analysis.fingerprints[0]?.label ?? "—"}
              </strong>
              <small>
                score {pct(analysis.fingerprints[0]?.leaderScore ?? 0)}
              </small>
            </div>

            <div className="temporalEdges">
              {analysis.leaderGraph.map((edge) => {
                const follower = analysis.fingerprints.find(
                  (item) => item.bookId === edge.to,
                );
                return (
                  <div key={`${edge.from}-${edge.to}`}>
                    <i style={{ width: `${Math.max(8, edge.strength * 100)}%` }} />
                    <span>+{ms(edge.lagMs)}</span>
                    <strong>{follower?.label ?? edge.to}</strong>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="temporalFingerprints">
          <div className="temporalSubhead">
            <div>
              <span>{copy.fingerprints}</span>
              <strong>Reaction identity by source</strong>
            </div>
            <small>synthetic sample</small>
          </div>

          <div className="temporalFingerprintTable">
            <div className="temporalFingerprintHead">
              <span>BOOK</span>
              <span>CLASS</span>
              <span>DELAY</span>
              <span>HALF-LIFE</span>
              <span>VELOCITY</span>
              <span>STALE AREA</span>
              <span>EXEC</span>
              <span>CONF</span>
            </div>

            {analysis.fingerprints.map((item) => (
              <div className="temporalFingerprintRow" key={item.bookId}>
                <strong>{item.label}</strong>
                <em className={item.classification.toLowerCase()}>
                  {item.classification}
                </em>
                <span>{ms(item.reactionDelayMs)}</span>
                <span>{ms(item.halfLifeMs)}</span>
                <span>
                  {item.repricingVelocityPpPerSecond >= 0 ? "+" : ""}
                  {item.repricingVelocityPpPerSecond.toFixed(2)} pp/s
                </span>
                <span>{item.staleAreaPpSeconds.toFixed(1)}</span>
                <span>{pct(item.executableCoverage)}</span>
                <span>{pct(item.confidence)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="temporalMethod">
        <span>METHOD / LIMITS</span>
        <p>{copy.note}</p>
        <code>veto.parallax.temporal-response.v1</code>
      </div>
    </section>
  );
}
