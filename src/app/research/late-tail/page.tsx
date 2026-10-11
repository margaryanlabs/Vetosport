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
  const [matchLabel, setMatchLabel] = useState("");
  const [quoteSource, setQuoteSource] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const calculation = useMemo(() => {
    try { return { result: evaluateLateTail(input), error: "" }; }
    catch (error) {
      return { result: null, error: error instanceof Error ? error.message : "Invalid parameters" };
    }
  }, [input]);
  const result = calculation.result;
  const chatHandoff = [
    "VETO SPORT · ZERO-S / CASE FOR CHATGPT",
    "Режим: исследование, без рекомендации реальной ставки.",
    "Матч / лига: " + (matchLabel.trim() || "не указан"),
    "Счёт: " + input.scoreHome + ":" + input.scoreAway,
    "Минута: " + input.elapsedMinutes,
    "Рынок: Under " + input.underLine,
    "Наблюдаемый коэффициент: " + input.decimalOdds,
    "Источник котировки: " + (quoteSource.trim() || "НЕ УКАЗАН / НЕ ПОДТВЕРЖДЁН"),
    "Условная сумма: $" + input.hypotheticalStake + " (PAPER ONLY)",
    "Условная интенсивность: " + input.baselineGoalRatePerMinute + " голов/мин",
    "Порог безубыточности: " + (100/input.decimalOdds).toFixed(2) + "%",
    "Вывод модели: " + (result ? result.verdict : "INPUT_ERROR"),
    "Запрос: проверь точный контракт рынка, источники, динамику минут, добавленное время, сценарии и риски; отделяй подтверждённые факты от допущений.",
    "ВАЖНО: результаты модели ZERO-S не откалиброваны, и в чате нельзя утверждать наличие преимущества или гарантированного дохода.",
  ].join("\n");
  const copyCase = async () => {
    try {
      await navigator.clipboard.writeText(chatHandoff);
      setCopyStatus("Структурированный кейс скопирован. Можно вставить его в чат.");
    } catch {
      setCopyStatus("Автокопирование заблокировано браузером. Выделите текст в поле ниже и скопируйте вручную.");
    }
  };
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
    <div style={{display:"flex",flexWrap:"wrap",gap:12,marginBottom:24}}>
      <a href="/research/goal-cascade" style={{color:"#b4cedd",border:"1px solid rgba(180,206,221,.2)",padding:"12px 15px",textDecoration:"none",fontSize:12}}>LAB 002 → Проверка гипотезы Goal Cascade</a>
      <a href="/research/shadow-journal" style={{color:"#b4cedd",border:"1px solid rgba(180,206,221,.2)",padding:"12px 15px",textDecoration:"none",fontSize:12}}>LAB 003 → Paper Journal</a>
      <a href="/research/high-hit" style={{color:"#b4cedd",border:"1px solid rgba(180,206,221,.2)",padding:"12px 15px",textDecoration:"none",fontSize:12}}>LAB 004 → 90%+ Cross-Sport Research</a>
    </div>
    <div className="zeroS-grid">
      <section className="zeroS-card">
        <div className="zeroS-heading"><small>01 / PARAMETERS</small><h2>Состояние матча</h2></div>
        <div style={{marginBottom:17,display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <label style={{display:"flex",flexDirection:"column",gap:9,color:"#98b0c0",fontSize:11}}>Матч / лига
            <input type="text" value={matchLabel} onChange={e=>setMatchLabel(e.target.value)} placeholder="Команда А — Команда Б" maxLength={180} style={{background:"#0c141c",color:"#e6f1f8",padding:12,border:"1px solid #344858",width:"100%"}} />
          </label>
          <label style={{display:"flex",flexDirection:"column",gap:9,color:"#98b0c0",fontSize:11}}>Источник котировки
            <input type="text" value={quoteSource} onChange={e=>setQuoteSource(e.target.value)} placeholder="Источник / ручной ввод" maxLength={120} style={{background:"#0c141c",color:"#e6f1f8",padding:12,border:"1px solid #344858",width:"100%"}} />
          </label>
        </div>
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
          <section style={{padding:"20px 0",borderTop:"1px solid rgba(161,184,204,.14)"}}>
            <small style={{color:"#9ebbd0",letterSpacing:".12em"}}>CHAT BRIDGE / NO OPENAI API</small>
            <h3 style={{fontSize:16,margin:"12px 0"}}>Передать исследование в ChatGPT</h3>
            <p className="zeroS-muted">Без API ключа передача происходит через копирование текста: автоматического фонового чата или live-потока здесь нет.</p>
            <textarea aria-label="Структурированный кейс для ChatGPT" readOnly value={chatHandoff} style={{width:"100%",minHeight:155,resize:"vertical",background:"#0b151e",border:"1px solid #314654",padding:13,color:"#d3e1e9",fontSize:11,lineHeight:1.7}} />
            <button type="button" onClick={copyCase} style={{background:"#c6d9e5",color:"#101b23",padding:"11px 15px",fontWeight:750,border:0,cursor:"pointer",marginTop:12}}>Скопировать кейс для ChatGPT</button>
            {copyStatus&&<p role="status" className="zeroS-muted">{copyStatus}</p>}
          </section>
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
