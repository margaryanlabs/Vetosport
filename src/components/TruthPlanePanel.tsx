"use client";

import type { Locale } from "@/lib/domain/types";
import {
  sandboxTruthBeforeCorrection,
  sandboxTruthAfterCorrection,
  sandboxTruthFinal,
  sandboxTruthHealth,
} from "@/lib/truth/sandbox";
import { validateTruthRecord } from "@/lib/truth/engine";

const ms = (value: number) =>
  value >= 1000 ? `${(value / 1000).toFixed(2)}s` : `${Math.round(value)}ms`;

const pct = (value: number) => `${(value * 100).toFixed(0)}%`;

export function TruthPlanePanel({ locale }: { locale: Locale }) {
  const copy =
    locale === "ru"
      ? {
          title: "BITEMPORAL TRUTH PLANE",
          subtitle:
            "Что произошло · когда источник это отправил · когда VETO реально это узнала",
          warning:
            "СИНТЕТИЧЕСКИЙ JOURNAL · POINT-IN-TIME МЕХАНИКА, НЕ LIVE FEED",
          before: "REPLAY BEFORE CORRECTION",
          after: "REPLAY AFTER CORRECTION",
          note:
            "Replay использует gateway_received_at, а не только event_occurred_at. Поздняя correction не имеет права менять то, что модель якобы знала раньше. Реальный moat появится после подключения постоянного append-only хранилища и provider clock telemetry.",
        }
      : locale === "hy"
        ? {
            title: "BITEMPORAL TRUTH PLANE",
            subtitle:
              "Ինչ է տեղի ունեցել · երբ աղբյուրը ուղարկել է · երբ VETO-ն իրականում իմացել է",
            warning:
              "ՍԻՆԹԵՏԻԿ JOURNAL · POINT-IN-TIME ՄԵԽԱՆԻԿԱ, ՈՉ LIVE FEED",
            before: "REPLAY BEFORE CORRECTION",
            after: "REPLAY AFTER CORRECTION",
            note:
              "Replay-ը օգտագործում է gateway_received_at-ը։ Ուշ correction-ը չի կարող փոխել անցյալում մոդելի հասանելի տեղեկատվությունը։",
          }
        : {
            title: "BITEMPORAL TRUTH PLANE",
            subtitle:
              "What happened · when the source emitted it · when VETO actually knew it",
            warning:
              "SYNTHETIC JOURNAL · POINT-IN-TIME MECHANICS, NOT A LIVE FEED",
            before: "REPLAY BEFORE CORRECTION",
            after: "REPLAY AFTER CORRECTION",
            note:
              "Replay uses gateway_received_at, not event_occurred_at alone. A late correction cannot rewrite what the model supposedly knew in the past. The real moat begins once a persistent append-only store and provider clock telemetry are connected.",
          };

  const finalRows = sandboxTruthFinal.visibleRecords.map((record) => ({
    record,
    validation: validateTruthRecord(record),
  }));

  return (
    <section className="truthPlaneSurface">
      <div className="truthPlaneHead">
        <div>
          <span className="miniLabel">PARALLAX VII</span>
          <div>
            <h3>{copy.title}</h3>
            <p>{copy.subtitle}</p>
          </div>
        </div>
        <span>{copy.warning}</span>
      </div>

      <div className="truthPlaneSummary">
        <div>
          <span>TRUTH HEALTH</span>
          <strong>{pct(sandboxTruthHealth.score)}</strong>
        </div>
        <div>
          <span>VALID RECORDS</span>
          <strong>{pct(sandboxTruthHealth.validRecordRate)}</strong>
        </div>
        <div>
          <span>CLOCK CONFIDENCE</span>
          <strong>{pct(sandboxTruthHealth.clockConfidence)}</strong>
        </div>
        <div>
          <span>FRESHNESS CONF</span>
          <strong>{pct(sandboxTruthHealth.freshnessConfidence)}</strong>
        </div>
        <div>
          <span>LOOKAHEAD</span>
          <strong className={sandboxTruthHealth.lookaheadSafe ? "positive" : "negative"}>
            {sandboxTruthHealth.lookaheadSafe ? "SAFE" : "FAILED"}
          </strong>
        </div>
      </div>

      <div className="truthPlaneTimeline">
        <div className="truthPlaneTimelineHead">
          <span>ID</span>
          <span>TYPE</span>
          <span>EVENT</span>
          <span>EMIT</span>
          <span>RECEIVE</span>
          <span>COMMIT</span>
          <span>LATENCY</span>
          <span>FLAGS</span>
        </div>

        {finalRows.map(({ record, validation }) => (
          <div className="truthPlaneRow" key={record.id}>
            <code>{record.id}</code>
            <strong>{record.eventType}</strong>
            <span>{record.eventOccurredAtMs}ms</span>
            <span>{record.sourceEmittedAtMs}ms</span>
            <span>{record.gatewayReceivedAtMs}ms</span>
            <span>{record.stateCommittedAtMs}ms</span>
            <b>{ms(validation.pipelineLatencyMs)}</b>
            <em className={record.lateArrival ? "late" : ""}>
              {record.correctionOf
                ? "CORRECTION"
                : record.lateArrival
                  ? "LATE"
                  : "CLEAN"}
            </em>
          </div>
        ))}
      </div>

      <div className="truthReplayCompare">
        <ReplayCard
          title={copy.before}
          asOf={sandboxTruthBeforeCorrection.asOfMs}
          active={sandboxTruthBeforeCorrection.activeRecords.map((r) => r.id)}
          excluded={sandboxTruthBeforeCorrection.excludedFutureRecords}
          corrections={sandboxTruthBeforeCorrection.appliedCorrections.length}
          watermark={sandboxTruthBeforeCorrection.watermarkMs}
        />
        <div className="truthReplayArrow">→</div>
        <ReplayCard
          title={copy.after}
          asOf={sandboxTruthAfterCorrection.asOfMs}
          active={sandboxTruthAfterCorrection.activeRecords.map((r) => r.id)}
          excluded={sandboxTruthAfterCorrection.excludedFutureRecords}
          corrections={sandboxTruthAfterCorrection.appliedCorrections.length}
          watermark={sandboxTruthAfterCorrection.watermarkMs}
        />
      </div>

      <div className="truthCorrectionProof">
        <div>
          <span>CORRECTION PROOF</span>
          <strong>evt-002 → evt-002-c1</strong>
        </div>
        <p>
          The corrected tempo value is absent at t=4000ms and becomes active
          only after gateway receipt at 4720ms. Historical replay remains unchanged.
        </p>
        <div>
          <span>BEFORE</span>
          <strong>evt-002</strong>
          <i>→</i>
          <span>AFTER</span>
          <strong>evt-002-c1</strong>
        </div>
      </div>

      <div className="truthPlaneMethod">
        <span>METHOD / LIMITS</span>
        <p>{copy.note}</p>
        <code>veto.truth.bitemporal.v1</code>
      </div>
    </section>
  );
}

function ReplayCard({
  title,
  asOf,
  active,
  excluded,
  corrections,
  watermark,
}: {
  title: string;
  asOf: number;
  active: string[];
  excluded: string[];
  corrections: number;
  watermark: number | null;
}) {
  return (
    <article className="truthReplayCard">
      <div>
        <span>{title}</span>
        <strong>AS OF {asOf}ms</strong>
      </div>
      <div className="truthReplayStats">
        <span>ACTIVE <b>{active.length}</b></span>
        <span>FUTURE EXCLUDED <b>{excluded.length}</b></span>
        <span>CORRECTIONS <b>{corrections}</b></span>
        <span>WATERMARK <b>{watermark ?? "—"}ms</b></span>
      </div>
      <div className="truthReplayIds">
        {active.map((id) => <code key={id}>{id}</code>)}
      </div>
    </article>
  );
}
