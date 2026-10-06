"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/domain/types";
import { sandboxFootballSurface } from "@/lib/sandbox/football-model";
import { sandboxParallaxAnalysis } from "@/lib/parallax/sandbox";
import { TemporalResponseLab } from "@/components/TemporalResponseLab";
import { CrossMarketPropagation } from "@/components/CrossMarketPropagation";
import { ShockExecutionPanel } from "@/components/ShockExecutionPanel";
import { AlphaMemoryPanel } from "@/components/AlphaMemoryPanel";
import { ExperimentLedgerPanel } from "@/components/ExperimentLedgerPanel";
import { TruthPlanePanel } from "@/components/TruthPlanePanel";
import { ContractSemanticsPanel } from "@/components/ContractSemanticsPanel";
import { DataPlanePanel } from "@/components/DataPlanePanel";
import { SensorIntegrityPanel } from "@/components/SensorIntegrityPanel";
import { ValueOfInformationPanel } from "@/components/ValueOfInformationPanel";
import { MarketCapacityPanel } from "@/components/MarketCapacityPanel";
import { SemanticDriftPanel } from "@/components/SemanticDriftPanel";
import { LeakageMonitorPanel } from "@/components/LeakageMonitorPanel";
import { DiscoveryControlPanel } from "@/components/DiscoveryControlPanel";
import { CalibrationDriftPanel } from "@/components/CalibrationDriftPanel";
import { SuspensionCensoringPanel } from "@/components/SuspensionCensoringPanel";
import { AbstentionBoundaryPanel } from "@/components/AbstentionBoundaryPanel";
import { RegimeChangePanel } from "@/components/RegimeChangePanel";
import { RegimeAttributionPanel } from "@/components/RegimeAttributionPanel";
import { RegimeExpertRouterPanel } from "@/components/RegimeExpertRouterPanel";
import { ConformalUncertaintyPanel } from "@/components/ConformalUncertaintyPanel";
import { RegimeHysteresisPanel } from "@/components/RegimeHysteresisPanel";
import { TransitionHazardPanel } from "@/components/TransitionHazardPanel";

const pct = (value: number) => `${(value * 100).toFixed(1)}%`;
const pp = (value: number) =>
  `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)} pp`;

const residualClass = (value: number) => {
  const magnitude = Math.abs(value);
  if (magnitude >= 0.025) return "high";
  if (magnitude >= 0.012) return "medium";
  return "low";
};

type ParallaxHealth = { passed: boolean };
type ShadowPreview = {
  persistence: string;
  record?: {
    recordHash: string;
    modelVersion: string;
    status: string;
    stateId: string;
    contractId: string;
  };
};

export function ParallaxCore({ locale }: { locale: Locale }) {
  const analysis = sandboxParallaxAnalysis;
  const [health, setHealth] = useState<ParallaxHealth | null>(null);
  const [shadow, setShadow] = useState<ShadowPreview | null>(null);

  useEffect(() => {
    let active = true;

    Promise.all([
      fetch("/api/intelligence/parallax/selfcheck", {
        cache: "no-store",
      }).then((response) => (response.ok ? response.json() : null)),
      fetch("/api/intelligence/parallax/shadow", {
        cache: "no-store",
      }).then((response) => (response.ok ? response.json() : null)),
    ])
      .then(([healthPayload, shadowPayload]) => {
        if (!active) return;
        if (healthPayload) setHealth(healthPayload as ParallaxHealth);
        if (shadowPayload) setShadow(shadowPayload as ShadowPreview);
      })
      .catch(() => {
        // The research surface remains readable even if health metadata fails.
      });

    return () => {
      active = false;
    };
  }, []);
  const topVetoStates = sandboxFootballSurface.scorelines
    .slice()
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 6);
  const topMarketStates = analysis.marketWorld
    .slice()
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 6);

  const consistencyState =
    analysis.consistencyScore >= 88
      ? "COHERENT"
      : analysis.consistencyScore >= 65
        ? "TENSION"
        : "CONFLICT";

  const robustState =
    analysis.primary.robustGap > 0.04
      ? "SURVIVES"
      : analysis.primary.robustGap > 0
        ? "THIN"
        : "FAILS";

  const copy =
    locale === "ru"
      ? {
          subtitle:
            "Одна вероятность мира против одной вероятности рынка",
          explanation:
            "PARALLAX пытается восстановить единую market-world distribution, которая одновременно объясняет связанные цены. Residual показывает, где эта картина мира ломается.",
          snapshot:
            "СИНТЕТИЧЕСКИЙ MARKET SNAPSHOT · НЕ РЕАЛЬНЫЙ БУКМЕКЕР",
          vetoWorld: "VETO WORLD",
          marketWorld: "MARKET WORLD",
          cluster: "INCONSISTENCY CLUSTER",
          robust: "ROBUST DISLOCATION",
          decay: "SIGNAL DECAY",
          counterfactual: "COUNTERFACTUAL INVALIDATION",
          method:
            "Research v1: no-vig probabilities, synchronized contract semantics and scoreline-state projection. Tradability не доказана без executable quotes, latency и OOS CLV.",
        }
      : locale === "hy"
        ? {
            subtitle:
              "Մեկ հավանական աշխարհ ընդդեմ շուկայի ենթադրվող աշխարհի",
            explanation:
              "PARALLAX-ը փորձում է վերականգնել մեկ market-world distribution, որը միաժամանակ բացատրում է կապված գները։ Residual-ը ցույց է տալիս, թե որտեղ է այդ աշխարհը կոտրվում։",
            snapshot:
              "ՍԻՆԹԵՏԻԿ MARKET SNAPSHOT · ՈՉ ԻՐԱԿԱՆ ԲՈՒՔՄԵՔԵՐ",
            vetoWorld: "VETO WORLD",
            marketWorld: "MARKET WORLD",
            cluster: "INCONSISTENCY CLUSTER",
            robust: "ROBUST DISLOCATION",
            decay: "SIGNAL DECAY",
            counterfactual: "COUNTERFACTUAL INVALIDATION",
            method:
              "Research v1: no-vig probabilities, synchronized contracts and scoreline-state projection. Tradability-ը չի ապացուցվել առանց executable quotes, latency և OOS CLV-ի։",
          }
        : {
            subtitle:
              "One probabilistic world versus the market-implied world",
            explanation:
              "PARALLAX reconstructs one market-world distribution that must explain linked prices simultaneously. Residuals expose where that world stops being internally coherent.",
            snapshot:
              "SYNTHETIC MARKET SNAPSHOT · NOT A LIVE BOOKMAKER",
            vetoWorld: "VETO WORLD",
            marketWorld: "MARKET WORLD",
            cluster: "INCONSISTENCY CLUSTER",
            robust: "ROBUST DISLOCATION",
            decay: "SIGNAL DECAY",
            counterfactual: "COUNTERFACTUAL INVALIDATION",
            method:
              "Research v1: no-vig probabilities, synchronized contract semantics and scoreline-state projection. Tradability is not established without executable quotes, latency evidence and OOS CLV.",
          };

  return (
    <section className="parallaxSurface" id="parallax">
      <div className="parallaxHead">
        <div>
          <span className="panelIndex">04</span>
          <div>
            <h2>MARKET PARALLAX</h2>
            <p>{copy.subtitle}</p>
          </div>
        </div>

        <div className="parallaxStatus">
          <strong className={health?.passed ? "verified" : ""}>
            {health == null
              ? "CHECKING"
              : health.passed
                ? "PARALLAX VERIFIED"
                : "PARALLAX FAIL"}
          </strong>
          <span>{copy.snapshot}</span>
          <i />
        </div>
      </div>

      <div className="parallaxThesis">
        <div>
          <span>PARALLAX CORE</span>
          <strong>
            VETO DOESN&apos;T PICK WINNERS.
            <br />
            IT AUDITS THE PRICE.
          </strong>
        </div>
        <p>{copy.explanation}</p>
        <div className="parallaxConsistencyScore">
          <span>MARKET CONSISTENCY</span>
          <strong>{analysis.consistencyScore}</strong>
          <em className={consistencyState.toLowerCase()}>
            {consistencyState}
          </em>
        </div>
      </div>

      <div className="parallaxWorlds">
        <WorldColumn
          label={copy.vetoWorld}
          states={topVetoStates}
          note="goal-state.v1"
        />

        <div className="parallaxBridge">
          <div className="parallaxBridgeCore">
            <span>PROJECT</span>
            <strong>
              {analysis.converged ? "SOLVED" : "RESIDUAL"}
            </strong>
            <small>
              RMSE {(analysis.residualRmse * 100).toFixed(2)} pp
            </small>
          </div>

          <div className="parallaxResidualRail">
            {analysis.contracts.slice(0, 9).map((contract) => {
              const delta = contract.consistencyResidual;
              return (
                <div
                  className={`parallaxResidualNode ${residualClass(delta)}`}
                  key={contract.id}
                >
                  <i />
                  <span>{contract.family}</span>
                  <b>{pp(delta)}</b>
                </div>
              );
            })}
          </div>
        </div>

        <WorldColumn
          label={copy.marketWorld}
          states={topMarketStates}
          note="projected market state"
        />
      </div>

      <div className="parallaxContractTable">
        <div className="parallaxContractHead">
          <span>CONTRACT</span>
          <span>VETO</span>
          <span>MARKET</span>
          <span>PROJECTED</span>
          <span>VETO GAP</span>
          <span>RESIDUAL</span>
        </div>

        {analysis.contracts.map((contract) => (
          <div
            className={`parallaxContractRow ${residualClass(
              contract.consistencyResidual,
            )}`}
            key={contract.id}
          >
            <div>
              <i />
              <span>
                <strong>{contract.label}</strong>
                <small>{contract.family}</small>
              </span>
            </div>
            <span>{pct(contract.vetoProbability)}</span>
            <span>{pct(contract.marketProbability)}</span>
            <span>{pct(contract.projectedMarketProbability)}</span>
            <b className={contract.vetoGap >= 0 ? "positive" : "negative"}>
              {pp(contract.vetoGap)}
            </b>
            <b
              className={
                Math.abs(contract.consistencyResidual) >= 0.025
                  ? "negative"
                  : ""
              }
            >
              {pp(contract.consistencyResidual)}
            </b>
          </div>
        ))}
      </div>

      <div className="parallaxIntelligenceGrid">
        <section className="parallaxCluster">
          <div className="parallaxSubhead">
            <div>
              <span>{copy.cluster}</span>
              <strong>Where the market-world bends</strong>
            </div>
            <small>TOP {analysis.inconsistencyCluster.length}</small>
          </div>

          <div className="parallaxClusterList">
            {analysis.inconsistencyCluster.map((contract, index) => (
              <div className="parallaxClusterRow" key={contract.id}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <i className={residualClass(contract.consistencyResidual)} />
                <div>
                  <strong>{contract.label}</strong>
                  <small>{contract.family}</small>
                </div>
                <b>{pp(contract.consistencyResidual)}</b>
              </div>
            ))}
          </div>
        </section>

        <section className="parallaxRobust">
          <div className="parallaxSubhead">
            <div>
              <span>{copy.robust}</span>
              <strong>{analysis.primary.label}</strong>
            </div>
            <em className={robustState.toLowerCase()}>{robustState}</em>
          </div>

          <div className="parallaxRobustCore">
            <div>
              <span>FAIR</span>
              <strong>{pct(analysis.primary.fairProbability)}</strong>
            </div>
            <div>
              <span>MARKET</span>
              <strong>{pct(analysis.primary.marketProbability)}</strong>
            </div>
            <div>
              <span>RAW GAP</span>
              <strong className="positive">
                {pp(analysis.primary.rawGap)}
              </strong>
            </div>
            <div>
              <span>ROBUST FLOOR</span>
              <strong>{pct(analysis.primary.robustFloor)}</strong>
            </div>
            <div>
              <span>ROBUST GAP</span>
              <strong
                className={
                  analysis.primary.robustGap > 0 ? "positive" : "negative"
                }
              >
                {pp(analysis.primary.robustGap)}
              </strong>
            </div>
            <div>
              <span>BREAK-EVEN</span>
              <strong>{analysis.primary.breakEvenOdds.toFixed(2)}</strong>
            </div>
          </div>

          <div className="parallaxUncertainty">
            <span>UNCERTAINTY BUDGET</span>
            <div>
              <i style={{ width: `${Math.min(100, analysis.uncertainty.model * 1800)}%` }} />
              <b>MODEL {(analysis.uncertainty.model * 100).toFixed(1)} pp</b>
            </div>
            <div>
              <i style={{ width: `${Math.min(100, analysis.uncertainty.data * 1800)}%` }} />
              <b>DATA {(analysis.uncertainty.data * 100).toFixed(1)} pp</b>
            </div>
            <div>
              <i style={{ width: `${Math.min(100, analysis.uncertainty.execution * 1800)}%` }} />
              <b>EXEC {(analysis.uncertainty.execution * 100).toFixed(1)} pp</b>
            </div>
            <div>
              <i style={{ width: `${Math.min(100, analysis.uncertainty.clock * 1800)}%` }} />
              <b>CLOCK {(analysis.uncertainty.clock * 100).toFixed(1)} pp</b>
            </div>
          </div>
        </section>

        <section className="parallaxDecay">
          <div className="parallaxSubhead">
            <div>
              <span>{copy.decay}</span>
              <strong>{analysis.decay.status}</strong>
            </div>
            <small>HALF-LIFE {analysis.decay.halfLifeSeconds}s</small>
          </div>

          <div className="parallaxDecayHero">
            <div>
              <span>PEAK</span>
              <strong>{pp(analysis.decay.peakGap)}</strong>
            </div>
            <i>→</i>
            <div>
              <span>NOW</span>
              <strong>{pp(analysis.decay.currentGap)}</strong>
            </div>
            <i>→</i>
            <div>
              <span>+20s</span>
              <strong>{pp(analysis.decay.expectedGap20s)}</strong>
            </div>
          </div>

          <div className="parallaxDecayLane">
            <span />
            <i
              style={{
                left: `${Math.max(
                  6,
                  Math.min(94, analysis.decay.survival20s * 100),
                )}%`,
              }}
            />
          </div>

          <div className="parallaxDecayMeta">
            <span>
              AGE <b>{analysis.decay.ageSeconds}s</b>
            </span>
            <span>
              SURVIVAL +20s <b>{pct(analysis.decay.survival20s)}</b>
            </span>
          </div>
        </section>
      </div>

      <TemporalResponseLab locale={locale} />
      <CrossMarketPropagation locale={locale} />
      <ShockExecutionPanel locale={locale} />
      <AlphaMemoryPanel locale={locale} />
      <ExperimentLedgerPanel locale={locale} />
      <TruthPlanePanel locale={locale} />
      <ContractSemanticsPanel locale={locale} />
      <DataPlanePanel locale={locale} />
      <SensorIntegrityPanel locale={locale} />
      <ValueOfInformationPanel locale={locale} />
      <MarketCapacityPanel locale={locale} />
      <SemanticDriftPanel locale={locale} />
      <LeakageMonitorPanel locale={locale} />
      <DiscoveryControlPanel locale={locale} />
      <CalibrationDriftPanel locale={locale} />
      <SuspensionCensoringPanel locale={locale} />
      <AbstentionBoundaryPanel locale={locale} />
      <RegimeChangePanel locale={locale} />
      <RegimeAttributionPanel locale={locale} />
      <RegimeExpertRouterPanel locale={locale} />
      <ConformalUncertaintyPanel locale={locale} />
      <RegimeHysteresisPanel locale={locale} />
      <TransitionHazardPanel locale={locale} />

      <div className="parallaxCounterfactuals">
        <div className="parallaxCounterHead">
          <div>
            <span>{copy.counterfactual}</span>
            <strong>What has to change for the dislocation to die?</strong>
          </div>
          <small>STATE SHOCK TEST</small>
        </div>

        <div className="parallaxCounterGrid">
          {analysis.counterfactuals.map((item, index) => (
            <div className="parallaxCounterCard" key={item.id}>
              <div>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <em className={item.status.toLowerCase()}>{item.status}</em>
              </div>
              <strong>{item.label}</strong>
              <div>
                <span>NEW P</span>
                <b>{pct(item.probability)}</b>
              </div>
              <div>
                <span>ROBUST GAP</span>
                <b className={item.robustGap > 0 ? "positive" : "negative"}>
                  {pp(item.robustGap)}
                </b>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="parallaxShadow">
        <div>
          <span>SHADOW DECISION LEDGER</span>
          <strong>{shadow?.record?.status ?? "SHADOW"}</strong>
        </div>
        <div>
          <span>MODEL</span>
          <code>{shadow?.record?.modelVersion ?? "veto.parallax.football.v1"}</code>
        </div>
        <div>
          <span>STATE</span>
          <code>{shadow?.record?.stateId ?? "#18429"}</code>
        </div>
        <div className="parallaxShadowHash">
          <span>RECORD HASH</span>
          <code>
            {shadow?.record?.recordHash
              ? `${shadow.record.recordHash.slice(0, 12)}…${shadow.record.recordHash.slice(-8)}`
              : "pending…"}
          </code>
        </div>
        <div>
          <span>PERSISTENCE</span>
          <strong className="negative">
            {shadow?.persistence === "not-connected"
              ? "NOT PERSISTED"
              : "PREVIEW"}
          </strong>
        </div>
      </div>

      <div className="parallaxMethod">
        <span>METHOD / LIMITS</span>
        <p>{copy.method}</p>
        <code>veto.parallax.football.v1 · research-only</code>
      </div>
    </section>
  );
}

function WorldColumn({
  label,
  states,
  note,
}: {
  label: string;
  states: Array<{
    homeGoals: number;
    awayGoals: number;
    probability: number;
  }>;
  note: string;
}) {
  return (
    <section className="parallaxWorld">
      <div className="parallaxWorldHead">
        <span>{label}</span>
        <small>{note}</small>
      </div>
      <div className="parallaxWorldStates">
        {states.map((state, index) => (
          <div key={`${state.homeGoals}-${state.awayGoals}-${index}`}>
            <span>
              {state.homeGoals}:{state.awayGoals}
            </span>
            <i>
              <b style={{ width: `${Math.min(100, state.probability * 600)}%` }} />
            </i>
            <strong>{pct(state.probability)}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
