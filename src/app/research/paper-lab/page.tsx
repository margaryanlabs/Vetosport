import Link from "next/link";
import {VetoMark} from "@/components/VetoMark";
import {SportAppearanceToggle} from "@/components/SportAppearanceToggle";
import {DailyPaperResearchPanel} from "@/components/DailyPaperResearchPanel";
import {AutonomousReplayPanel} from "@/components/AutonomousReplayPanel";
import "./paper-lab.css";
export const metadata={
 title:"Daily Paper Research — VETO Sport",
 description:"Shared server-side $200 virtual bankroll with timestamped research observations and verified FT outcomes.",
};
export default function PaperLabPage(){
 return <main className="paperLabPage">
  <nav className="paperLabNav">
   <Link href="/" className="paperLabBrand"><VetoMark size={28}/>VETO <em>SPORT</em></Link>
   <div><span>RESEARCH / AUTOMATIC PAPER LAB</span><SportAppearanceToggle/>
    <Link href="/research/discovery">Исследования ↗</Link></div>
  </nav>
  <header className="paperLabHero">
   <div><small>VETO SPORT · SCIENTIFIC PAPER INVESTIGATIONS / NO REAL MONEY</small>
    <h1>Каждый день.<br/><em>Новые гипотезы.</em><br/>Реальный результат.</h1>
    <p>Виртуальный исследовательский счёт со стартом $200, дневным лимитом и журналом всех проверяемых выборов. VETO фиксирует только наблюдения, которые действительно существовали до финального результата.</p>
   </div>
   <aside><span>INITIAL VIRTUAL BANK</span><strong>$200<span>.00</span></strong>
    <small>0 реальных долларов в риске.<br/>0 букмекерских интеграций для исполнения.</small>
   </aside>
  </header>
  <div className="paperLabContent">
   <DailyPaperResearchPanel/>
   <AutonomousReplayPanel/>
  </div>
  <footer className="paperLabFooter"><span>VETO SCIENCE · OBSERVE → TEST → CERTIFY → AUDIT</span>
   <Link href="/">Вернуться в VETO Sport ↗</Link>
  </footer>
 </main>;
}
