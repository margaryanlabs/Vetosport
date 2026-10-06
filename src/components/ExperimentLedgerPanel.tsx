"use client";

import type { Locale } from "@/lib/domain/types";
import {
  sandboxExperimentIntegrity,
  sandboxExperimentLedger,
  sandboxExperimentObservation,
  sandboxLedgerVerified,
  sandboxPromotionGate,
  sandboxRegisteredExperiment,
} from "@/lib/research/sandbox";

const pct = (value: number) => `${(value * 100).toFixed(0)}%`;
const pct2 = (value: number) => `${(value * 100).toFixed(2)}%`;

export function ExperimentLedgerPanel({ locale }: { locale: Locale }) {
  const protocol = sandboxRegisteredExperiment;
  const observation = sandboxExperimentObservation;
  const gate = sandboxPromotionGate;
  const hash = sandboxExperimentIntegrity.expectedProtocolHash;

  const copy =
    locale === "ru"
      ? {
          title: "REGISTERED EXPERIMENT LEDGER",
          subtitle:
            "Правила исследования фиксируются до результата · post-hoc изменения блокируют promotion",
          warning:
            "HASH-CHAIN PREVIEW · ПОКА НЕ PERSISTED В ОТДЕЛЬНОМ STORAGE",
          protocol: "LOCKED RESEARCH PROTOCOL",
          gate: "PROMOTION GATE",
          chain: "EXPERIMENT HASH CHAIN",
          note:
            "ELIGIBLE_FOR_CANARY не означает production EDGE. Это только разрешение на ограниченный canary/shadow этап после preregistration. Пока отдельное хранилище не подключено, hash-chain демонстрирует контракт целостности, но не является постоянным журналом.",
        }
      : locale === "hy"
        ? {
            title: "REGISTERED EXPERIMENT LEDGER",
            subtitle:
              "Հետազոտության կանոնները փակվում են արդյունքից առաջ · post-hoc փոփոխությունները արգելափակում են promotion-ը",
            warning:
              "HASH-CHAIN PREVIEW · ԴԵՌ ՉԻ ՊԱՀՊԱՆՎՈՒՄ ԱՌԱՆՁԻՆ STORAGE-ՈՒՄ",
            protocol: "LOCKED RESEARCH PROTOCOL",
            gate: "PROMOTION GATE",
            chain: "EXPERIMENT HASH CHAIN",
            note:
              "ELIGIBLE_FOR_CANARY-ը production EDGE չէ։ Սա միայն սահմանափակ canary/shadow փուլ անցնելու թույլտվություն է։",
          }
        : {
            title: "REGISTERED EXPERIMENT LEDGER",
            subtitle:
              "Research rules lock before results · post-hoc mutation blocks promotion",
            warning:
              "HASH-CHAIN PREVIEW · NOT YET PERSISTED IN DEDICATED STORAGE",
            protocol: "LOCKED RESEARCH PROTOCOL",
            gate: "PROMOTION GATE",
            chain: "EXPERIMENT HASH CHAIN",
            note:
              "ELIGIBLE_FOR_CANARY is not a production EDGE. It only permits a constrained canary/shadow stage after preregistration. Until dedicated storage is connected, the hash chain demonstrates the integrity contract but is not a persistent journal.",
          };

  return (
    <section className="experimentLedgerSurface">
      <div className="experimentLedgerHead">
        <div>
          <span className="miniLabel">PARALLAX VI</span>
          <div>
            <h3>{copy.title}</h3>
            <p>{copy.subtitle}</p>
          </div>
        </div>
        <span>{copy.warning}</span>
      </div>

      <div className="experimentLedgerSummary">
        <div>
          <span>INTEGRITY</span>
          <strong className={sandboxExperimentIntegrity.valid ? "positive" : "negative"}>
            {sandboxExperimentIntegrity.valid ? "VERIFIED" : "BROKEN"}
          </strong>
        </div>
        <div>
          <span>PROMOTION STATUS</span>
          <strong>{gate.status}</strong>
        </div>
        <div>
          <span>PROMOTION SCORE</span>
          <strong>{pct(gate.score)}</strong>
        </div>
        <div>
          <span>LEDGER CHAIN</span>
          <strong className={sandboxLedgerVerified ? "positive" : "negative"}>
            {sandboxLedgerVerified ? "VALID" : "INVALID"}
          </strong>
        </div>
      </div>

      <div className="experimentLedgerMain">
        <section className="experimentProtocol">
          <div className="experimentSubhead">
            <div>
              <span>{copy.protocol}</span>
              <strong>{protocol.title}</strong>
            </div>
            <small>{protocol.id}</small>
          </div>

          <div className="experimentProtocolHash">
            <span>PROTOCOL SHA-256</span>
            <code>{hash.slice(0, 18)}…{hash.slice(-12)}</code>
          </div>

          <div className="experimentProtocolGrid">
            <div>
              <span>PRIMARY METRIC</span>
              <strong>{protocol.primaryMetric.toUpperCase()}</strong>
            </div>
            <div>
              <span>MIN EFFECT</span>
              <strong>{pct2(protocol.minimumEffect)}</strong>
            </div>
            <div>
              <span>FDR THRESHOLD</span>
              <strong>q ≤ {protocol.fdrThreshold.toFixed(2)}</strong>
            </div>
            <div>
              <span>MIN SAMPLE</span>
              <strong>{protocol.minimumSample}</strong>
            </div>
            <div>
              <span>OOS WINDOWS</span>
              <strong>≥ {protocol.minimumOosWindows}</strong>
            </div>
            <div>
              <span>VARIANT BUDGET</span>
              <strong>{protocol.allowedVariants}</strong>
            </div>
          </div>

          <div className="experimentWindow">
            <span>LOCKED EVALUATION WINDOW</span>
            <strong>
              {protocol.evaluationStart.slice(0, 10)}
              <i>→</i>
              {protocol.evaluationEnd.slice(0, 10)}
            </strong>
            <small>training cutoff {protocol.trainingCutoff.slice(0, 10)}</small>
          </div>

          <div className="experimentFeatureLock">
            <span>FROZEN FEATURES</span>
            <div>
              {protocol.frozenFeatures.map((feature) => (
                <b key={feature}>{feature}</b>
              ))}
            </div>
          </div>
        </section>

        <section className="experimentPromotion">
          <div className="experimentSubhead">
            <div>
              <span>{copy.gate}</span>
              <strong>Preregistered criteria only</strong>
            </div>
            <em className={gate.status.toLowerCase()}>
              {gate.status}
            </em>
          </div>

          <div className="experimentObserved">
            <div>
              <span>SAMPLE</span>
              <strong>{observation.sampleSize}</strong>
            </div>
            <div>
              <span>NET CLV</span>
              <strong>{pct2(observation.meanNetClv)}</strong>
            </div>
            <div>
              <span>q</span>
              <strong>{observation.fdrQValue.toFixed(3)}</strong>
            </div>
            <div>
              <span>VARIANTS</span>
              <strong>{observation.evaluatedVariants}/{protocol.allowedVariants}</strong>
            </div>
          </div>

          <div className="experimentChecks">
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

      <div className="experimentChain">
        <div>
          <span>{copy.chain}</span>
          <strong>Append-only integrity preview</strong>
        </div>
        <div className="experimentChainRows">
          {sandboxExperimentLedger.map((row) => (
            <article key={row.index}>
              <span>{String(row.index + 1).padStart(2, "0")}</span>
              <div>
                <strong>{row.stage}</strong>
                <small>{row.recordHash.slice(0, 12)}…{row.recordHash.slice(-8)}</small>
              </div>
              <i>→</i>
            </article>
          ))}
        </div>
      </div>

      <div className="experimentLedgerMethod">
        <span>METHOD / LIMITS</span>
        <p>{copy.note}</p>
        <code>veto.research.preregistered.v1</code>
      </div>
    </section>
  );
}
