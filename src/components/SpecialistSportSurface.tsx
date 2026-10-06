"use client";

import type { LiveWorkspace } from "@/lib/sandbox/workspaces";

const pct = (value: number) => `${(value * 100).toFixed(1)}%`;

export function SpecialistSportSurface({
  workspace,
}: {
  workspace: LiveWorkspace;
}) {
  if (workspace.sport === "football") return null;

  return (
    <section className="specialistSurface" id="market-surface">
      <div className="specialistSurfaceHead">
        <div>
          <span className="panelIndex">05</span>
          <div>
            <h2>{workspace.specialistTitle}</h2>
            <p>{workspace.specialistSubtitle}</p>
          </div>
        </div>
        <span className="specialistSportBadge">{workspace.sportLabel}</span>
      </div>

      <div className="specialistMetrics">
        {workspace.specialistMetrics.map((metric) => (
          <div className="specialistMetric" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <div className="specialistMetricLane">
              <i style={{ width: `${metric.strength}%` }} />
            </div>
            <small>{metric.note}</small>
          </div>
        ))}
      </div>

      <div className="specialistPricingHead" id="pricing">
        <div>
          <span className="panelIndex">06</span>
          <div>
            <h2>LIVE PRICING BOARD</h2>
            <p>Fair price · market price · VETO decision</p>
          </div>
        </div>
      </div>

      <div className="specialistMarketGrid">
        {workspace.specialistMarkets.map((market) => {
          const marketProbability = 1 / market.marketOdds;
          const gap = market.probability - marketProbability;

          return (
            <article className="specialistMarketCard" key={market.label}>
              <div className="specialistMarketTop">
                <span>{market.label}</span>
                <em className={market.decision.toLowerCase()}>{market.decision}</em>
              </div>
              <strong>{pct(market.probability)}</strong>
              <div className="specialistMarketLane">
                <span style={{ width: `${market.probability * 100}%` }} />
                <i style={{ left: `${market.probability * 100}%` }} />
              </div>
              <div className="specialistMarketBottom">
                <span>FAIR <b>{market.fairOdds.toFixed(2)}</b></span>
                <span>MARKET <b>{market.marketOdds.toFixed(2)}</b></span>
                <span>GAP <b className={gap > 0 ? "positive" : "negative"}>{gap >= 0 ? "+" : ""}{(gap * 100).toFixed(1)} pp</b></span>
              </div>
            </article>
          );
        })}
      </div>

      <div className="specialistStateBand">
        <div>
          <span className="panelIndex">07</span>
          <div>
            <h2>STATE INTERPRETATION</h2>
            <p>What the specialist engine is seeing right now</p>
          </div>
        </div>
        <p>{workspace.reasonSummary}</p>
        <strong>{workspace.invalidation}</strong>
      </div>
    </section>
  );
}
