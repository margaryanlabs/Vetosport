"use client";

import { useMemo, useState } from "react";
import type { Locale } from "@/lib/domain/types";
import type {
  FootballMarketProbability,
  FootballProbabilitySurface,
} from "@/lib/models/football/types";
import { diffFootballSurfaces } from "@/lib/models/football/diff";

type Family = "1x2" | "totals" | "btts" | "team" | "handicap";

const families: Array<{ id: Family; ru: string; en: string; hy: string }> = [
  { id: "1x2", ru: "1X2", en: "1X2", hy: "1X2" },
  { id: "totals", ru: "Тоталы", en: "Totals", hy: "Տոտալներ" },
  { id: "btts", ru: "Обе забьют", en: "BTTS", hy: "Երկուսն էլ գոլ" },
  { id: "team", ru: "Командные", en: "Team totals", hy: "Թիմային" },
  { id: "handicap", ru: "Форы", en: "Handicaps", hy: "Ֆորաներ" },
];

const familyFor = (market: FootballMarketProbability): Family | null => {
  if (market.marketId === "football.1x2") return "1x2";
  if (market.marketId === "football.total_goals") return "totals";
  if (market.marketId === "football.btts") return "btts";
  if (market.marketId === "football.team_total") return "team";
  if (market.marketId === "football.handicap") return "handicap";
  return null;
};

const displayLabel = (
  market: FootballMarketProbability,
  locale: Locale,
) => {
  const side = market.side;
  const line = market.line;

  if (market.marketId === "football.1x2") {
    if (side === "home") return locale === "ru" ? "Победа хозяев" : locale === "hy" ? "Տանտերերի հաղթանակ" : "Home win";
    if (side === "draw") return locale === "ru" ? "Ничья" : locale === "hy" ? "Ոչ-ոքի" : "Draw";
    return locale === "ru" ? "Победа гостей" : locale === "hy" ? "Հյուրերի հաղթանակ" : "Away win";
  }

  if (market.marketId === "football.total_goals") {
    const prefix = side === "over"
      ? locale === "ru" ? "Больше" : locale === "hy" ? "Ավելի" : "Over"
      : locale === "ru" ? "Меньше" : locale === "hy" ? "Պակաս" : "Under";
    return `${prefix} ${line}`;
  }

  if (market.marketId === "football.btts") {
    const yes = side === "yes";
    if (locale === "ru") return yes ? "Обе забьют · Да" : "Обе забьют · Нет";
    if (locale === "hy") return yes ? "Երկուսն էլ գոլ · Այո" : "Երկուսն էլ գոլ · Ոչ";
    return yes ? "BTTS · Yes" : "BTTS · No";
  }

  if (market.marketId === "football.team_total") {
    const home = market.selectionId.startsWith("home");
    const over = side === "over";
    if (locale === "ru") return `${home ? "Хозяева" : "Гости"} · ${over ? "Б" : "М"} ${line}`;
    if (locale === "hy") return `${home ? "Տանտերեր" : "Հյուրեր"} · ${over ? "Ավելի" : "Պակաս"} ${line}`;
    return `${home ? "Home" : "Away"} · ${over ? "Over" : "Under"} ${line}`;
  }

  if (market.marketId === "football.handicap") {
    const home = side === "home";
    const signed = line != null && line > 0 ? `+${line}` : String(line);
    if (locale === "ru") return `${home ? "Хозяева" : "Гости"} ${signed}`;
    if (locale === "hy") return `${home ? "Տանտերեր" : "Հյուրեր"} ${signed}`;
    return `${home ? "Home" : "Away"} ${signed}`;
  }

  return market.label;
};

const pct = (value: number) => `${(value * 100).toFixed(1)}%`;
const pp = (value: number) =>
  `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)} pp`;

const marketState = (probability: number) => {
  if (probability >= 0.9995) return "guaranteed" as const;
  if (probability <= 0.0005) return "impossible" as const;
  return "open" as const;
};

const fairLabel = (market: FootballMarketProbability) => {
  const state = marketState(market.probability);
  if (state === "guaranteed") return "LOCKED";
  if (state === "impossible") return "—";
  return market.fairOdds.toFixed(2);
};

export function MarketSurfaceExplorer({
  current,
  previous,
  locale,
}: {
  current: FootballProbabilitySurface;
  previous: FootballProbabilitySurface;
  locale: Locale;
}) {
  const [family, setFamily] = useState<Family>("totals");

  const shifts = useMemo(() => {
    const map = new Map<string, number>();
    for (const shift of diffFootballSurfaces(previous, current)) {
      map.set(`${shift.marketId}::${shift.selectionId}`, shift.probabilityShift);
    }
    return map;
  }, [current, previous]);

  const markets = current.markets
    .filter((market) => familyFor(market) === family)
    .sort((a, b) => {
      const stateRank = (market: FootballMarketProbability) =>
        marketState(market.probability) === "open" ? 0 : 1;
      const stateDiff = stateRank(a) - stateRank(b);
      return stateDiff !== 0 ? stateDiff : b.probability - a.probability;
    });

  const familyLabel = (item: (typeof families)[number]) =>
    locale === "ru" ? item.ru : locale === "hy" ? item.hy : item.en;

  return (
    <section className="panel surfaceExplorer">
      <div className="panelHeader">
        <div>
          <span className="panelIndex">05</span>
          <div>
            <h2>PROBABILITY SURFACE</h2>
            <p>
              {locale === "ru"
                ? "Весь матч как единая карта рынков"
                : locale === "hy"
                  ? "Ամբողջ խաղը՝ որպես շուկաների միասնական քարտեզ"
                  : "The whole match as one coherent market map"}
            </p>
          </div>
        </div>
        <div className="surfaceFamilyTabs">
          {families.map((item) => (
            <button
              key={item.id}
              type="button"
              className={family === item.id ? "active" : ""}
              onClick={() => setFamily(item.id)}
            >
              {familyLabel(item)}
            </button>
          ))}
        </div>
      </div>

      <div className="surfaceMarketGrid">
        {markets.map((market) => {
          const shift =
            shifts.get(`${market.marketId}::${market.selectionId}`) ?? 0;
          const state = marketState(market.probability);
          return (
            <article
              className={`surfaceMarketCard ${state !== "open" ? "lockedMarket" : ""}`}
              key={`${market.marketId}-${market.selectionId}`}
            >
              <div className="surfaceMarketTop">
                <span>{displayLabel(market, locale)}</span>
                <i className={Math.abs(shift) < 0.001 ? "flat" : shift > 0 ? "up" : "down"}>
                  {pp(shift)}
                </i>
              </div>
              <strong>{pct(market.probability)}</strong>
              <div className="surfaceProbTrack">
                <i style={{ width: `${market.probability * 100}%` }} />
                <span
                  className="surfaceProbDot"
                  style={{ left: `${market.probability * 100}%` }}
                />
              </div>
              <div className="surfaceMarketBottom">
                <span>{state === "open" ? "FAIR" : state === "guaranteed" ? "STATE" : "STATE"}</span>
                <b className={state === "impossible" ? "negative" : state === "guaranteed" ? "positive" : ""}>
                  {state === "impossible"
                    ? locale === "ru"
                      ? "НЕВОЗМОЖНО"
                      : locale === "hy"
                        ? "ԱՆՀՆԱՐ"
                        : "IMPOSSIBLE"
                    : fairLabel(market)}
                </b>
              </div>
            </article>
          );
        })}
      </div>

      <div className="surfaceExplorerFooter">
        <span>
          λ REMAINING <b>{current.remainingGoals.total.toFixed(2)}</b>
        </span>
        <span>
          HOME <b>{current.remainingGoals.home.toFixed(2)}</b>
        </span>
        <span>
          AWAY <b>{current.remainingGoals.away.toFixed(2)}</b>
        </span>
        <span>
          MATRIX MASS <b>{(current.matrixMass * 100).toFixed(3)}%</b>
        </span>
      </div>
    </section>
  );
}
