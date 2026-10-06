"use client";

import { useMemo, useState } from "react";
import type { Locale } from "@/lib/domain/types";
import type { FootballProbabilitySurface } from "@/lib/models/football/types";
import {
  priceAsianHandicap,
  priceAsianTotal,
  type AsianSettlementDistribution,
} from "@/lib/models/football/asian";

type Mode = "totals" | "handicap";

const pct = (value: number) => `${(value * 100).toFixed(1)}%`;
const price = (value: number | null) => (value == null ? "—" : value.toFixed(2));

const settlementHint = (distribution: AsianSettlementDistribution) => {
  const parts = [
    distribution.halfWin > 0.005 ? `½W ${pct(distribution.halfWin)}` : null,
    distribution.push > 0.005 ? `P ${pct(distribution.push)}` : null,
    distribution.halfLoss > 0.005 ? `½L ${pct(distribution.halfLoss)}` : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" · ") : "FULL SETTLEMENT";
};

export function AsianLinesBoard({
  surface,
  locale,
}: {
  surface: FootballProbabilitySurface;
  locale: Locale;
}) {
  const [mode, setMode] = useState<Mode>("totals");

  const totalRows = useMemo(
    () =>
      [2.25, 2.5, 2.75, 3, 3.25, 3.5, 3.75, 4].map((line) => ({
        line,
        left: priceAsianTotal(surface.scorelines, "over", line),
        right: priceAsianTotal(surface.scorelines, "under", line),
      })),
    [surface],
  );

  const handicapRows = useMemo(
    () =>
      [-1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1].map((line) => ({
        line,
        left: priceAsianHandicap(surface.scorelines, "home", line),
        right: priceAsianHandicap(surface.scorelines, "away", -line),
      })),
    [surface],
  );

  const rows = mode === "totals" ? totalRows : handicapRows;

  const copy =
    locale === "ru"
      ? {
          title: "ASIAN LINES",
          subtitle: "Fair price с учётом push / half-win / half-loss",
          totals: "Азиатский тотал",
          handicap: "Азиатская фора",
          left: mode === "totals" ? "БОЛЬШЕ" : "ХОЗЯЕВА",
          right: mode === "totals" ? "МЕНЬШЕ" : "ГОСТИ",
        }
      : locale === "hy"
        ? {
            title: "ASIAN LINES",
            subtitle: "Fair price՝ push / half-win / half-loss հաշվարկով",
            totals: "Ասիական տոտալ",
            handicap: "Ասիական ֆորա",
            left: mode === "totals" ? "ԱՎԵԼԻ" : "ՏԱՆՏԵՐԵՐ",
            right: mode === "totals" ? "ՊԱԿԱՍ" : "ՀՅՈՒՐԵՐ",
          }
        : {
            title: "ASIAN LINES",
            subtitle: "Fair price with push / half-win / half-loss settlement",
            totals: "Asian total",
            handicap: "Asian handicap",
            left: mode === "totals" ? "OVER" : "HOME",
            right: mode === "totals" ? "UNDER" : "AWAY",
          };

  return (
    <section className="panel asianBoard">
      <div className="panelHeader">
        <div>
          <span className="panelIndex">06</span>
          <div>
            <h2>{copy.title}</h2>
            <p>{copy.subtitle}</p>
          </div>
        </div>
        <div className="segmented">
          <button
            type="button"
            className={mode === "totals" ? "active" : ""}
            onClick={() => setMode("totals")}
          >
            {copy.totals}
          </button>
          <button
            type="button"
            className={mode === "handicap" ? "active" : ""}
            onClick={() => setMode("handicap")}
          >
            {copy.handicap}
          </button>
        </div>
      </div>

      <div className="asianTable">
        <div className="asianRow asianHead">
          <span>{copy.left}</span>
          <span>FAIR</span>
          <strong>LINE</strong>
          <span>FAIR</span>
          <span>{copy.right}</span>
        </div>

        {rows.map((row) => (
          <div className="asianRow" key={row.line}>
            <div className="asianSide left">
              <strong>{price(row.left.fairOdds)}</strong>
              <small>{settlementHint(row.left)}</small>
            </div>
            <span className="asianWinMass">{pct(row.left.win + row.left.halfWin * 0.5)}</span>
            <strong className="asianLine">
              {mode === "handicap" && row.line > 0 ? "+" : ""}
              {row.line}
            </strong>
            <span className="asianWinMass">{pct(row.right.win + row.right.halfWin * 0.5)}</span>
            <div className="asianSide right">
              <strong>{price(row.right.fairOdds)}</strong>
              <small>{settlementHint(row.right)}</small>
            </div>
          </div>
        ))}
      </div>

      <div className="asianFootnote">
        <span>FAIR ≠ GUARANTEE</span>
        <p>
          {locale === "ru"
            ? "Для четвертных линий VETO решает цену через ожидаемый payout, а не через 1 / probability."
            : locale === "hy"
              ? "Քառորդ գծերի համար VETO-ն գինը հաշվում է սպասվող payout-ով, ոչ թե 1 / probability բանաձևով։"
              : "Quarter lines are priced from expected payout, not a naive 1 / probability transform."}
        </p>
      </div>
    </section>
  );
}
