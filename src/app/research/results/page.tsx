import Link from "next/link";
import {VetoMark} from "@/components/VetoMark";
import {SportAppearanceToggle} from "@/components/SportAppearanceToggle";
import {fetchOpenLigaResults,openLeagues,resultsAttribution} from "@/lib/providers/openligadb-results";
import type {LeagueResults,PublicMatch} from "@/lib/providers/openligadb-results";
import "./results.css";
export const dynamic="force-dynamic";
export const metadata={
 title:"Реальные футбольные результаты — VETO Sport",
 description:"Завершённые матчи Бундеслиги с происхождением результата, без вымышленных коэффициентов и обещаний прибыли.",
};
const dateLabel=(iso:string)=>new Date(iso).toLocaleString("ru-RU",{
 timeZone:"Europe/Berlin",day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"
});
const dateUTC=(iso:string)=>new Date(iso).toLocaleDateString("ru-RU",{
 timeZone:"Europe/Berlin",day:"2-digit",month:"long",year:"numeric"
});
function MatchLine({match}:{match:PublicMatch}){
 const final=match.state==="finished-90";
 return <article className="vrsMatch">
   <div className="vrsMatchMeta">
    <span>{dateLabel(match.startsAt)}</span>
    <small>{final?"ЗАВЕРШЁН · 90′":match.state==="scheduled"?"ПО РАСПИСАНИЮ":"НЕ ПОДТВЕРЖДЕНО"}</small>
   </div>
   <div className="vrsParticipants">
    <div className="vrsTeam"><i aria-hidden/>{match.home}</div>
    <div className="vrsScore" aria-label={final?`Счёт ${match.homeScore} : ${match.awayScore}`:"Счёт неизвестен"}>
      {final?<><span>{match.homeScore}</span><b>:</b><span>{match.awayScore}</span></>:<strong>— : —</strong>}
    </div>
    <div className="vrsTeam away"><i aria-hidden/>{match.away}</div>
   </div>
   <div className="vrsProvenance">SOURCE: OPENLIGADB · {final?"AFTER 90 MINUTES":"NO CERTIFIED RESULT"}</div>
 </article>;
}
function LeagueSection({report}:{report:LeagueResults}){
 return <section className="vrsLeague" id={report.league} aria-labelledby={`vrs-title-${report.league}`}>
  <header className="vrsLeagueHead">
   <div><span className="vrsEyebrow">GERMANY / {report.league.toUpperCase()} / {report.season}–{report.season+1}</span>
    <h2 id={`vrs-title-${report.league}`}>{report.label}</h2>
    <p>Отдельный источник завершённых матчей. Это не подтверждение точности прогнозов VETO.</p>
   </div>
   <div className="vrsLeagueCount"><small>ИТОГО ЗА СЕЗОН</small><strong>{report.status==="available"?report.allSeasonCompleted:"—"}</strong><span>результатов с признаком 90′</span></div>
  </header>
  {report.status==="source-unavailable"?
   <div className="vrsUnavailable" role="status"><strong>Сейчас нет доступа к источнику.</strong><p>Не подставляем демонстрационные матчи и выдуманные результаты.</p></div>:
   <div className="vrsColumns">
    <div><h3>Последние результаты <span>{report.finished.length}</span></h3>
     {report.finished.length?report.finished.map(match=><MatchLine match={match} key={match.id}/>):
      <div className="vrsUnavailable">За выбранный период подтверждённых результатов нет.</div>}
    </div>
    <div className="vrsUpcoming"><h3>Ближайшие матчи <span>{report.upcoming.length}</span></h3>
     {report.upcoming.length?report.upcoming.map(match=><MatchLine match={match} key={match.id}/>):
      <div className="vrsUnavailable">Событий в ближайшие две недели не найдено.</div>}
    </div>
   </div>}
 </section>;
}
export default async function ResultsPage(){
 const [first,second]=await Promise.all(openLeagues.map(l=>fetchOpenLigaResults(l.id)));
 const shown=first.finished.length+second.finished.length;
 return <main className="vrsRoot">
  <nav className="vrsNav">
   <Link className="vrsBrand" href="/"><VetoMark size={30}/><strong>VETO <em>SPORT</em></strong></Link>
   <div><SportAppearanceToggle/><Link href="/research/discovery">← Исследования</Link></div>
  </nav>
  <div className="vrsHero">
   <span className="vrsEyebrow"><i/> VETO SPORT / INDEPENDENT RESULTS MONITOR</span>
   <h1>Результаты.<br/><em>Без выдуманных данных.</em></h1>
   <p>Проверяемый внешний источник настоящих футбольных результатов. Начинаем с двух немецких лиг — без API-ключа, без платного запроса и без подмены доказательств спортивными сигналами.</p>
   <div className="vrsHeroPills">
    <span><b>{shown}</b> отображённых завершённых матчей</span>
    <span><b>2</b> источника лиг</span>
    <span><b>0</b> подтверждённых прибыльных сигналов</span>
   </div>
   <div className="vrsHeroLinks"><a href="#bl1">Bundesliga ↗</a><a href="#bl2">2. Bundesliga ↗</a>
    <Link href="/research/discovery">Лаборатория VETO ↗</Link></div>
  </div>
  <section className="vrsTruth">
   <div><small>DATA INTEGRITY</small><h2>Почему это отдельная витрина?</h2></div>
   <p>Результаты сообщаются сообществом OpenLigaDB. Они не доказывают, что VETO наблюдал матч в реальном времени, что существовал доступный коэффициент или что стратегия была прибыльной. В нашу закрытую исследовательскую базу эти данные автоматически <b>не записываются</b>.</p>
  </section>
  <LeagueSection report={first}/>
  <LeagueSection report={second}/>
  <footer className="vrsFooter">
   <div><strong>ПРОИСХОЖДЕНИЕ ДАННЫХ</strong><p>Содержит информацию из <a href={resultsAttribution.sourceUrl} rel="noopener noreferrer" target="_blank">OpenLigaDB</a>, предоставляемую на условиях <a href={resultsAttribution.licenseUrl} rel="noopener noreferrer" target="_blank">Open Database License (ODbL) 1.0</a>. Источник поддерживается сообществом, а не официальными арбитрами соревнования.</p></div>
   <div><span>Срез: {dateUTC(new Date().toISOString())} · Обновление источника с кешированием до 1 часа</span>
    <Link href="/research/watchlist">Радар VETO ↗</Link></div>
  </footer>
 </main>;
}
