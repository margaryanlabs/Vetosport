"use client";

import type { Locale } from "@/lib/domain/types";
import {
  sandboxCompiledContracts,
  sandboxContracts,
  sandboxSemanticComparison,
  sandboxSettlementExamples,
} from "@/lib/contracts/sandbox";

export function ContractSemanticsPanel({ locale }: { locale: Locale }) {
  const hockeyReg = sandboxCompiledContracts.find(
    (item) => item.spec.id === "hockey-u55-reg",
  );
  const hockeyFull = sandboxCompiledContracts.find(
    (item) => item.spec.id === "hockey-u55-full",
  );

  const copy =
    locale === "ru"
      ? {
          title: "CONTRACT SEMANTICS COMPILER",
          subtitle:
            "Сначала VETO доказывает, что два коэффициента означают один и тот же контракт",
          warning:
            "SANDBOX SETTLEMENT RULES · PROVIDER RULEBOOKS ЕЩЁ НЕ ПОДКЛЮЧЕНЫ",
          gate: "COMPARABILITY GATE",
          settlement: "SETTLEMENT INVARIANTS",
          note:
            "Цена допускается в cross-market/book comparison только после совпадения sport, family, side, period, overtime policy, line и void rules. Реальные provider rulebooks должны быть versioned и point-in-time.",
        }
      : locale === "hy"
        ? {
            title: "CONTRACT SEMANTICS COMPILER",
            subtitle:
              "VETO-ն նախ ապացուցում է, որ երկու գին նույն contract-ն են նշանակում",
            warning:
              "SANDBOX SETTLEMENT RULES · PROVIDER RULEBOOKS ԴԵՌ ՉԵՆ ՄԻԱՑՎԱԾ",
            gate: "COMPARABILITY GATE",
            settlement: "SETTLEMENT INVARIANTS",
            note:
              "Cross-market comparison-ը թույլատրվում է միայն contract semantics-ի ամբողջական համընկնումից հետո։",
          }
        : {
            title: "CONTRACT SEMANTICS COMPILER",
            subtitle:
              "VETO first proves that two prices refer to the same economic contract",
            warning:
              "SANDBOX SETTLEMENT RULES · PROVIDER RULEBOOKS NOT CONNECTED YET",
            gate: "COMPARABILITY GATE",
            settlement: "SETTLEMENT INVARIANTS",
            note:
              "A price enters cross-market/book comparison only after sport, family, side, period, overtime policy, line and void rules match. Real provider rulebooks must be versioned and point-in-time.",
          };

  return (
    <section className="contractSemanticsSurface">
      <div className="contractSemanticsHead">
        <div>
          <span className="miniLabel">PARALLAX VIII</span>
          <div>
            <h3>{copy.title}</h3>
            <p>{copy.subtitle}</p>
          </div>
        </div>
        <span>{copy.warning}</span>
      </div>

      <div className="contractCompare">
        <ContractCard
          title="BOOK / CONTRACT A"
          semanticKey={hockeyReg?.semanticKey ?? "—"}
          fields={[
            ["MARKET", "Hockey Under 5.5"],
            ["PERIOD", "REGULATION"],
            ["OVERTIME", "EXCLUDED"],
            ["LINE", "5.50"],
          ]}
        />

        <div className="contractCompareGate">
          <span>{copy.gate}</span>
          <strong className="negative">NOT COMPARABLE</strong>
          <b>{Math.round(sandboxSemanticComparison.semanticDistance * 100)}% semantic distance</b>
          <div>
            {sandboxSemanticComparison.reasons.map((reason) => (
              <small key={reason}>{reason}</small>
            ))}
          </div>
        </div>

        <ContractCard
          title="BOOK / CONTRACT B"
          semanticKey={hockeyFull?.semanticKey ?? "—"}
          fields={[
            ["MARKET", "Hockey Under 5.5"],
            ["PERIOD", "FULL GAME"],
            ["OVERTIME", "INCLUDED"],
            ["LINE", "5.50"],
          ]}
        />
      </div>

      <div className="contractSettlement">
        <div>
          <span>{copy.settlement}</span>
          <strong>Asian / quarter-line payoff semantics</strong>
        </div>
        <div className="contractSettlementGrid">
          <article>
            <span>UNDER 2.25 · TOTAL=2</span>
            <strong>{sandboxSettlementExamples.under225}</strong>
            <small>½ U2.0 PUSH + ½ U2.5 WIN</small>
          </article>
          <article>
            <span>OVER 2.25 · TOTAL=2</span>
            <strong>{sandboxSettlementExamples.over225}</strong>
            <small>½ O2.0 PUSH + ½ O2.5 LOSS</small>
          </article>
          <article>
            <span>HOME +0.25 · DRAW</span>
            <strong>{sandboxSettlementExamples.homePlus025}</strong>
            <small>½ +0 PUSH + ½ +0.5 WIN</small>
          </article>
        </div>
      </div>

      <div className="contractRegistryTable">
        <div className="contractRegistryHead">
          <span>ID</span>
          <span>FAMILY</span>
          <span>SIDE</span>
          <span>PERIOD</span>
          <span>OT</span>
          <span>LINE</span>
          <span>LEGS</span>
          <span>STATUS</span>
        </div>
        {sandboxCompiledContracts.map((item) => (
          <div className="contractRegistryRow" key={item.spec.id}>
            <code>{item.spec.id}</code>
            <span>{item.spec.family}</span>
            <span>{item.spec.side}</span>
            <span>{item.spec.period}</span>
            <span>{item.spec.overtimeIncluded ? "YES" : "NO"}</span>
            <span>{item.spec.line ?? "—"}</span>
            <span>{item.settlementLegs.length}</span>
            <b className={item.warnings.length ? "warning" : "positive"}>
              {item.warnings.length ? "REVIEW" : "COMPILED"}
            </b>
          </div>
        ))}
      </div>

      <div className="contractSemanticsMethod">
        <span>METHOD / LIMITS</span>
        <p>{copy.note}</p>
        <code>veto.contracts.semantics.v1</code>
      </div>
    </section>
  );
}

function ContractCard({
  title,
  semanticKey,
  fields,
}: {
  title: string;
  semanticKey: string;
  fields: Array<[string, string]>;
}) {
  return (
    <article className="contractCard">
      <div>
        <span>{title}</span>
        <strong>{fields[0][1]}</strong>
      </div>
      <div className="contractCardFields">
        {fields.slice(1).map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <b>{value}</b>
          </div>
        ))}
      </div>
      <code>{semanticKey}</code>
    </article>
  );
}
