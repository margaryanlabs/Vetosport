"use client";

import { useMemo, useState } from "react";
import { evaluateLateTail, type LateTailInput } from "@/lib/research/late-tail/engine";
import "./late-tail.css";

const initial: LateTailInput = {
  elapsedMinutes: 80,
  scoreHome: 1,
  scoreAway: 1,
  underLine: 3.5,
  decimalOdds: 1.05,
  hypotheticalStake: 200,
  baselineGoalRatePerMinute: 0.025,
};
const pct = (n: number) => (n * 100).toFixed(2) + "%";
const usd = (n: number) => (n < 0 ? "−" : n > 0 ? "+" : "") + "$" + Math.abs(n).toFixed(2);
const inputs: Array<{ key: keyof LateTailInput; label: string; step: number }> = [
  { key: "elapsedMinutes", label: "Минута матча", step: 1 },
  { key: "scoreHome", label: "Голы хозяев", step: 1 },
  { key: "scoreAway", label: "Голы гостей", step: 1 },
  { key: "underLine", label: "Тотал меньше", step: .5 },
  { key: "decimalOdds", label: "Коэффициент", step: .01 },
  { key: "hypotheticalStake", label: "Условная сумма ($)", step: 1 },
  { key: "baselineGoalRatePerMinute", label: "Условных голов в минуту", step: .001 },
];

export default function LateTailResearch() {
  const [input, setInput] = useState<LateTailInput>(initial);
  const calculation = useMemo(() => {
    try { return { result: evaluateLateTail(input), error: "" }; }
    catch (error) {
      return { result: null, error: error instanceof Error ? error.message : "Invalid parameters" };
    }
  }, [input]);
  const result = calculation.result;
  const onField = (key: keyof LateTailInput, raw: string) =>
    setInput(old => ({ ...old, [key]: Number(raw) }));
  return <main className="zeroS">
    <header className="zeroS-nav">
      <a href="/" className="zeroS-logo">VETO <span>/ SPORT</span></a>
      <span>PROJECT ZERO–S • MARGARYAN LABS</span>
      <a href="/">← Терминал</a>
    </header>
    <section className="zeroS-intro">
      <div className="zeroS-label">LAB 001 / CLOSING-TIME INTELLIGENCE <b>RESEARCH ONLY</b></div>
      <h1>Последние минуты.<br/><em>Настоящая цена риска.</em></h1>
      <p>Независимая лаборатория риска редких голов, дополнительного времени и маленьких коэффициентов. Математический симулятор, не реальный прогноз и не рекомендация делать ставку.</p>
    </section>
    <div className="zeroS-grid">
      <section className="zeroS-card">
        <div className="zeroS-heading"><small>01 / PARAMETERS</small><h2>Состояние матча</h2></div>
        <div className="zeroS-fields">
          {inputs.map(field => <label key={field.key}>
            <span>{field.label}</span>
            <input type="number" inputMode="decimal" step={field.step}
              value={input[field.key] ?? ""} onChange={e => onField(field.key, e.target.value)} />
          </label>)}
        </div>
        <p className="zeroS-muted">Интенсивность 0.025 и +3/+6/+10/+15 минут взяты только для демонстрации. Поля обрабатываются локально в браузере.</p>
        {calculation.error && <p role="alert" className="zeroS-error">{calculation.error}</p>}
      </section>
      <section className="zeroS-card">
        <div className="zeroS-heading">
          <small>02 / TAIL-RISK SURFACE</small><h2>Математика риска</h2>
          <strong className="zeroS-badge">PASS / NOT VALIDATED</strong>
        </div>
        {result ? <>
          <div className="zeroS-big"><span>Вероятность проигрыша по условной модели</span><strong>{pct(result.probabilityOfLoss)}</strong></div>
          <div className="zeroS-stats">
            <div><span>Условный шанс Under</span><b>{pct(result.probabilityUnder)}</b></div>
            <div><span>Порог безубыточности</span><b>{pct(result.breakEvenProbability)}</b></div>
            <div><span>Риск в стресс-сценарии</span><b>{pct(1 - result.scenarioUnderRange.low)}</b></div>
            <div><span>Голов до проигрыша</span><b>{result.goalsToLoseUnder}</b></div>
          </div>
          <div className="zeroS-stats zeroS-stats-three">
            <div><span>При выигрыше</span><b>{usd(result.hypotheticalProfitOnWin)}</b></div>
            <div><span>При проигрыше</span><b>{usd(-result.hypotheticalLossOnDefeat)}</b></div>
            <div><span>Условное ожидание</span><b>{usd(result.hypotheticalExpectedPnL)}</b></div>
          </div>
          <p className="zeroS-warning">Неоткалиброванная модель. Даже положительное условное ожидание НЕ является доказательством прибыльной ставки. Исполнимость цены и вероятность не проверены.</p>
        </> : <p className="zeroS-muted">Исправьте ввод, чтобы получить сценарный расчёт.</p>}
      </section>
    </div>
    {result && <section className="zeroS-card zeroS-chart">
      <div className="zeroS-heading"><small>03 / UNCERTAINTY MAP</small><h2>12 сценариев поздних голов</h2></div>
      <div className="zeroS-bars">
        {result.scenarios.map(row => <div className="zeroS-row" key={row.label}>
          <div><b>{row.label}</b><small>Осталось {row.remainingMinutes.toFixed(1)} мин</small></div>
          <div className="zeroS-track"><i style={{ width: (row.probabilityLose * 100) + "%" }} /></div>
          <strong>{pct(row.probabilityLose)}</strong>
        </div>)}
      </div>
      <p className="zeroS-muted">Диапазон сценариев не является доверительным интервалом. После 90-й минуты исключаются варианты, где матч уже должен был закончиться.</p>
    </section>}
    <section className="zeroS-card zeroS-bottom">
      <div><small>04 / EVIDENCE GAP</small><h2>Что нужно доказать</h2></div>
      <p>Калибровка на реальных лигах, точное фактическое время свистка, подтверждённые коэффициенты и timestamp, независимый будущий тест, Brier/log-loss и полная история отказов. До этого результат всегда <b>PASS_RESEARCH_ONLY</b>.</p>
    </section>
    <footer className="zeroS-foot">VETO SPORT / PROJECT ZERO-S / RESEARCH ENGINE v0.2</footer>
  </main>;
}
