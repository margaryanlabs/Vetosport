import Link from "next/link";
import {VetoMark} from "@/components/VetoMark";
import {SportAppearanceToggle} from "@/components/SportAppearanceToggle";
import {HighOddsLabPanel} from "@/components/HighOddsLabPanel";
import "../paper-lab/paper-lab.css";
import "./high-odds.css";
export const metadata={
 title:"High Odds Research — VETO Sport",
 description:"Separate forward-only 10–20×, 20–50×, 50×+ hypothetical paper parlay experiments and verified FT evidence.",
};
export default function HighOddsPage(){
 return <main className="paperLabPage highOddsPage">
  <nav className="paperLabNav">
   <Link href="/" className="paperLabBrand"><VetoMark size={28}/>VETO <em>SPORT</em></Link>
   <div><span>RESEARCH / HIGH ODDS LAB</span><SportAppearanceToggle/>
    <Link href="/research/paper-lab">Daily Paper ↗</Link>
    <Link href="/research/discovery">Исследования ↗</Link></div>
  </nav>
  <div className="paperLabContent"><HighOddsLabPanel/></div>
  <footer className="paperLabFooter"><span>VETO / MATHEMATICAL EXPERIMENTS / NO EXECUTION</span>
   <Link href="/research/paper-lab">Обычная лаборатория ↗</Link>
  </footer>
 </main>;
}
