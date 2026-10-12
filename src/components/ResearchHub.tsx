"use client";

export function ResearchHub({
  sourceLabel,
  onJump,
}: {
  sourceLabel: string;
  onJump: (target: string) => void;
}) {
  const cards = [
    { id: "market-surface", title: "Поверхность вероятности", copy: "Как модель распределяет исходы и какие рынки затронуты.", status: "АНАЛИЗ МОДЕЛИ" },
    { id: "models", title: "Совет моделей", copy: "Независимость, согласие и расхождение моделей до вывода.", status: "ПРОВЕРКА СОГЛАСИЯ" },
    { id: "ledger", title: "Evidence & Ledger", copy: "Связь причины, снимка данных и решения без задней подгонки.", status: "ДОКАЗАТЕЛЬСТВА" },
    { id: "validation", title: "Валидация", copy: "Бэктест и управление версиями — не обещание доходности.", status: "ИССЛЕДОВАНИЕ" },
  ];

  return (
    <>
      <header className="researchHero">
        <div><span>VETO SPORT · ЛАБОРАТОРИЯ</span><h1>Глубина — по запросу.<br />Доказательства — <em>до вывода.</em></h1></div>
        <p>{sourceLabel} Все числа ниже относятся к выбранному контексту и сохраняют исходные ограничения данных.</p>
      </header>
      <section className="researchHubGrid" aria-label="Разделы лаборатории">
        {cards.map((card, index) => (
          <button key={card.id} onClick={() => onJump(card.id)} type="button">
            <span>{String(index + 1).padStart(2, "0")} · {card.status}</span>
            <strong>{card.title}</strong><p>{card.copy}</p><em>Открыть <b>→</b></em>
          </button>
        ))}
      </section>
    </>
  );
}
