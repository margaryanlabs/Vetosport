"use client";

import type { Locale } from "@/lib/domain/types";
import {
  sandboxBlockedExecution,
  sandboxExecutionGate,
  sandboxFeedAnomaly,
  sandboxInformationShock,
  sandboxLiquidityShock,
  sandboxNoiseShock,
} from "@/lib/parallax/shock-execution-sandbox";

const pct = (value: number) => `${(value * 100).toFixed(0)}%`;

export function ShockExecutionPanel({ locale }: { locale: Locale }) {
  const shock = sandboxInformationShock;
  const gate = sandboxExecutionGate;

  const copy =
    locale === "ru"
      ? {
          title: "MARKET SHOCK + EXECUTION GATE",
          subtitle:
            "Что именно произошло с рынком и переживёт ли сигнал реальное исполнение",
          warning:
            "СИНТЕТИЧЕСКИЙ SHOCK / EXECUTION SCENARIO · НЕ LIVE БУКМЕКЕР",
          anatomy: "SHOCK ANATOMY",
          gate: "EXECUTION-AWARE GATE",
          blockers: "HARD BLOCK EXAMPLE",
          note:
            "RESEARCH_EDGE означает только то, что сигнал прошёл заданные research/execution assumptions. Это не гарантия принятия ставки, доступности цены или прибыли.",
        }
      : locale === "hy"
        ? {
            title: "MARKET SHOCK + EXECUTION GATE",
            subtitle:
              "Ինչ է տեղի ունեցել շուկայում և արդյոք signal-ը կդիմանա իրական execution-ին",
            warning:
              "ՍԻՆԹԵՏԻԿ SHOCK / EXECUTION SCENARIO · ՈՉ LIVE ԲՈՒՔՄԵՔԵՐ",
            anatomy: "SHOCK ANATOMY",
            gate: "EXECUTION-AWARE GATE",
            blockers: "HARD BLOCK EXAMPLE",
            note:
              "RESEARCH_EDGE-ը նշանակում է միայն, որ signal-ը անցել է տրված research/execution assumptions-ը։",
          }
        : {
            title: "MARKET SHOCK + EXECUTION GATE",
            subtitle:
              "What actually moved the market, and whether the signal survives real execution",
            warning:
              "SYNTHETIC SHOCK / EXECUTION SCENARIO · NOT A LIVE BOOKMAKER",
            anatomy: "SHOCK ANATOMY",
            gate: "EXECUTION-AWARE GATE",
            blockers: "HARD BLOCK EXAMPLE",
            note:
              "RESEARCH_EDGE only means the signal survived the supplied research and execution assumptions. It is not a guarantee of acceptance, price availability or profit.",
          };

  const hypotheses = [
    {
      label: "INFORMATION",
      value: shock.informationScore,
      active: shock.classification === "INFORMATION_SHOCK",
    },
    {
      label: "LIQUIDITY",
      value: shock.liquidityScore,
      active: shock.classification === "LIQUIDITY_SHOCK",
    },
    {
      label: "FEED ANOMALY",
      value: shock.feedAnomalyScore,
      active: shock.classification === "FEED_ANOMALY",
    },
    {
      label: "NOISE",
      value: shock.noiseScore,
      active: shock.classification === "NOISE",
    },
  ];

  return (
    <section className="shockExecutionSurface">
      <div className="shockExecutionHead">
        <div>
          <span className="miniLabel">PARALLAX IV</span>
          <div>
            <h3>{copy.title}</h3>
            <p>{copy.subtitle}</p>
          </div>
        </div>
        <span>{copy.warning}</span>
      </div>

      <div className="shockExecutionSummary">
        <div>
          <span>SHOCK CLASS</span>
          <strong className="positive">{shock.classification}</strong>
        </div>
        <div>
          <span>SHOCK CONFIDENCE</span>
          <strong>{pct(shock.confidence)}</strong>
        </div>
        <div>
          <span>GATE STATUS</span>
          <strong className={gate.status === "RESEARCH_EDGE" ? "positive" : ""}>
            {gate.status}
          </strong>
        </div>
        <div>
          <span>GATE SCORE</span>
          <strong>{pct(gate.gateScore)}</strong>
        </div>
        <div>
          <span>POST-LATENCY GAP</span>
          <strong className={gate.postLatencyGapPp > 0 ? "positive" : "negative"}>
            {gate.postLatencyGapPp >= 0 ? "+" : ""}
            {gate.postLatencyGapPp.toFixed(2)} pp
          </strong>
        </div>
      </div>

      <div className="shockExecutionMain">
        <section className="shockAnatomy">
          <div className="shockSubhead">
            <div>
              <span>{copy.anatomy}</span>
              <strong>Competing explanations</strong>
            </div>
            <small>{shock.classification}</small>
          </div>

          <div className="shockHypotheses">
            {hypotheses.map((item) => (
              <div className={item.active ? "active" : ""} key={item.label}>
                <div>
                  <span>{item.label}</span>
                  <strong>{pct(item.value)}</strong>
                </div>
                <i>
                  <b style={{ width: `${Math.max(3, item.value * 100)}%` }} />
                </i>
              </div>
            ))}
          </div>

          <div className="shockEvidenceGrid">
            <div>
              <span>OFFICIAL EVENT</span>
              <strong>{shock.evidence.officialEventMatch ? "YES" : "NO"}</strong>
            </div>
            <div>
              <span>SOURCES</span>
              <strong>{shock.evidence.independentSources}</strong>
            </div>
            <div>
              <span>LINKED CONFIRM</span>
              <strong>
                {shock.evidence.linkedMarketsConfirmed}/
                {shock.evidence.linkedMarketsObserved}
              </strong>
            </div>
            <div>
              <span>PERSISTENCE</span>
              <strong>{(shock.evidence.persistenceMs / 1000).toFixed(1)}s</strong>
            </div>
            <div>
              <span>REVERSAL</span>
              <strong>{pct(shock.evidence.reversalFraction)}</strong>
            </div>
            <div>
              <span>FEED CONFLICT</span>
              <strong>{pct(shock.evidence.feedConflictScore)}</strong>
            </div>
          </div>

          <div className="shockReasons">
            {shock.reasons.map((reason, index) => (
              <div key={reason}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <p>{reason}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="executionGate">
          <div className="shockSubhead">
            <div>
              <span>{copy.gate}</span>
              <strong>Does the signal survive delivery?</strong>
            </div>
            <small>{gate.status}</small>
          </div>

          <div className="executionHero">
            <div>
              <span>SIGNAL SURVIVAL</span>
              <strong>{pct(gate.survivalFraction)}</strong>
            </div>
            <div>
              <span>AFTER LATENCY / COSTS</span>
              <strong className={gate.postLatencyGapPp > 0 ? "positive" : "negative"}>
                {gate.postLatencyGapPp >= 0 ? "+" : ""}
                {gate.postLatencyGapPp.toFixed(2)} pp
              </strong>
            </div>
          </div>

          <div className="executionChecks">
            {gate.checks.map((check) => (
              <div className={check.passed ? "passed" : "failed"} key={check.id}>
                <i />
                <div>
                  <strong>{check.label}</strong>
                  <small>{check.detail}</small>
                </div>
                <em>{check.hard ? "HARD" : "SOFT"}</em>
                <b>{check.passed ? "PASS" : "FAIL"}</b>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="shockComparison">
        <div>
          <span>CONTROL SCENARIOS</span>
          <strong>Same move, different cause → different gate behavior</strong>
        </div>

        <div className="shockControlGrid">
          <article>
            <span>NOISE CONTROL</span>
            <strong>{sandboxNoiseShock.classification}</strong>
            <small>reversal {pct(sandboxNoiseShock.evidence.reversalFraction)}</small>
          </article>
          <article>
            <span>LIQUIDITY CONTROL</span>
            <strong>{sandboxLiquidityShock.classification}</strong>
            <small>
              suspension {pct(sandboxLiquidityShock.evidence.suspensionFraction)}
            </small>
          </article>
          <article>
            <span>FEED CONTROL</span>
            <strong>{sandboxFeedAnomaly.classification}</strong>
            <small>conflict {pct(sandboxFeedAnomaly.evidence.feedConflictScore)}</small>
          </article>
          <article className="blocked">
            <span>{copy.blockers}</span>
            <strong>{sandboxBlockedExecution.status}</strong>
            <small>
              {sandboxBlockedExecution.blockers.length} hard blockers
            </small>
          </article>
        </div>
      </div>

      <div className="shockExecutionMethod">
        <span>METHOD / LIMITS</span>
        <p>{copy.note}</p>
        <code>veto.parallax.shock-execution.v1</code>
      </div>
    </section>
  );
}
