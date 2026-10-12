"use client";

type ResearchItem = {
  id: string;
  title: string;
  description: string;
  evidence: string;
  limitation: string;
  action: string;
  target?: string;
  status: "available" | "research";
};

const items: ResearchItem[] = [
  {
    id: "parallax",
    title: "Parallax",
    description: "Поверхность вероятностей и расхождение между моделью и ценой.",
    evidence: "Расчётная поверхность выбранного события",
    limitation: "Не является подтверждением преимущества без источника и проверки.",
    action: "Открыть поверхность",
    target: "parallax-lab",
    status: "available",
  },
  {
    id: "market",
    title: "Market Surface",
    description: "Сравнение рынков, линий и вероятностных сценариев.",
    evidence: "Модельная поверхность и сохранённые параметры",
    limitation: "Доступность котировок зависит от входящего источника.",
    action: "Открыть рынки",
    target: "market-surface",
    status: "available",
  },
  {
    id: "validation",
    title: "Replay & Validation",
    description: "Леджер решений, бэктест и проверка модели после события.",
    evidence: "Версионированные расчёты и логика контроля",
    limitation: "Историческая частота не равна текущему прогнозу.",
    action: "Открыть проверку",
    target: "validation",
    status: "available",
  },
  {
    id: "zero-s",
    title: "ZERO-S / High-Hit",
    description: "Изолированная серия экспериментальных исследований и наблюдений.",
    evidence: "Работа ведётся отдельно от текущей production-ветки",
    limitation: "Не опубликовано в этом интерфейсе до независимой проверки.",
    action: "Статус: исследование",
    status: "research",
  },
];

export function ResearchDesk({ onJump }: { onJump: (target: string) => void }) {
  return (
    <section className="researchDesk" aria-labelledby="research-desk-title">
      <div className="researchDeskHead">
        <div>
          <span>КАТАЛОГ ИССЛЕДОВАНИЙ</span>
          <h2 id="research-desk-title">Начните с вопроса, а не с инструмента.</h2>
        </div>
        <p>Каждый модуль отделяет наблюдение, историческое свидетельство и текущую валидацию.</p>
      </div>
      <div className="researchDeskGrid">
        {items.map((item) => {
          const target = item.target;
          return (
          <article className={`researchDeskCard ${item.status}`} key={item.id}>
            <div className="researchDeskCardTop">
              <span>{item.status === "available" ? "ДОСТУПНО" : "ИССЛЕДОВАНИЕ"}</span>
              <i aria-hidden />
            </div>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
            <dl>
              <div><dt>ОСНОВА</dt><dd>{item.evidence}</dd></div>
              <div><dt>ОГРАНИЧЕНИЕ</dt><dd>{item.limitation}</dd></div>
            </dl>
            {target ? (
              <button onClick={() => onJump(target)} type="button">{item.action} <span>→</span></button>
            ) : (
              <span className="researchDeskDisabled">{item.action}</span>
            )}
          </article>
          );
        })}
      </div>
    </section>
  );
}
