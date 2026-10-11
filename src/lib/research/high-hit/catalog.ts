/**
 * Multi-sport research catalogue: possible high-frequency outcomes ≠ approved bets.
 * Never show a claimed 90%+ current win chance for an unverified sport.
 */
export type HighHitSport="football"|"baseball"|"basketball"|"tennis"|"hockey"|"volleyball";
export type EvidenceState="HISTORICAL_MATCH_LEVEL"|"OFFICIAL_AGGREGATE"|"HYPOTHESIS_NO_RATE";
export interface HighHitIdea {
 id:string; sport:HighHitSport; sportLabel:string; selection:string;
 state:string; risk:string; marketSemantics:string; observed?:{
 wins:number;losses:number;period:string;source:string;
 }; source?:string; referenceRate?:number; evidence:EvidenceState;
}
export const HIGH_HIT_CATALOG:HighHitIdea[]=[
 {
  id:"football-late-under-35",sport:"football",sportLabel:"Футбол",
  selection:"Total Under 3.5",state:"1:1 после записанной 80-й минуты",
  risk:"За 10+ минут и дополнительное время могут случиться два гола; старые данные не учитывают современную продолжительность.",
  marketSemantics:"Финальный счёт за основное время и компенсированное время; тотал 3.5 без возврата.",
  observed:{wins:964,losses:67,period:"2012–2015",source:"AndrewKinsman/Football-Goal-Time-Analysis"},
  evidence:"HISTORICAL_MATCH_LEVEL"
 },
 {
  id:"football-late-under-45",sport:"football",sportLabel:"Футбол",
  selection:"Total Under 4.5",state:"1:1 после записанной 80-й минуты",
  risk:"Три новых гола редки исторически, но длинное добавленное время, травмы и смена тактики делают прошлую частоту неточной; цена почти всегда очень низкая.",
  marketSemantics:"Финальный тотал <4.5, нет возврата для половинчатого тотала.",
  observed:{wins:1023,losses:8,period:"2012–2015",source:"AndrewKinsman/Football-Goal-Time-Analysis"},
  evidence:"HISTORICAL_MATCH_LEVEL"
 },
 {
  id:"football-late-under-55",sport:"football",sportLabel:"Футбол",
  selection:"Total Under 5.5",state:"1:1 после записанной 80-й минуты",
  risk:"4+ дополнительных гола — редкий исторический хвост, но у этого контракта часто нет полезной или доступной живой цены. 1 редкое событие в данных не ограничивает современный риск.",
  marketSemantics:"Финальный тотал <5.5 с компенсированным временем.",
  observed:{wins:1030,losses:1,period:"2012–2015",source:"AndrewKinsman/Football-Goal-Time-Analysis"},
  evidence:"HISTORICAL_MATCH_LEVEL"
 },
 {
  id:"baseball-late-ml",sport:"baseball",sportLabel:"Бейсбол",
  selection:"Home team moneyline (иллюстрация MLB)",
  state:"7-й иннинг, хозяева +4 рана, 2 аута, бегун на 3-й базе",
  risk:"Смена питчера, состояние баз/аутов, несыгранные иннинги и возможные экстра-иннинги. Контракт должен включать все предусмотренные условия расчёта.",
  marketSemantics:"Победитель матча, с уточнением экстра-иннингов и правил букмекера.",
  source:"https://baseballsavant.mlb.com/game-strategy-explorer?type=winexp",
  referenceRate:.97,evidence:"OFFICIAL_AGGREGATE"
 },
 {
  id:"basketball-late-winner",sport:"basketball",sportLabel:"Баскетбол",
  selection:"Match winner / moneyline near final whistle",
  state:"Большой перевес при небольшом остатке времени, только для независимой проверки",
  risk:"Фолы в последние секунды, трёхочковые, штрафные, дополнительное время, задержка счёта и блокировки live-рынка.",
  marketSemantics:"Включено ли дополнительное время, должен определить конкретный контракт.",
  evidence:"HYPOTHESIS_NO_RATE"
 },
 {
  id:"tennis-late-set",sport:"tennis",sportLabel:"Теннис",
  selection:"Winner of nearly finished set",
  state:"Сильное преимущество в текущем сете, учитывая подачу и очки",
  risk:"Перелом хода сета, тай-брейк, травма, отказ и различающиеся правила возвратов.",
  marketSemantics:"Только конкретный сет; проверять как рассчитывается отказ от игры.",
  source:"https://support.pinnacle.com/hc/en-us/articles/46732813299601-How-does-Pinnacle-grade-tennis-matches-in-the-event-of-retirement-or-disqualification",
  evidence:"HYPOTHESIS_NO_RATE"
 },
 {
  id:"hockey-late-winner",sport:"hockey",sportLabel:"Хоккей",
  selection:"Late match winner / moneyline",
  state:"Преимущество в конце 3-го периода",
  risk:"Снятие вратаря, голы в пустые ворота, большинство, овертайм/буллиты и правила рынка.",
  marketSemantics:"Победитель в основное время или включая ОТ/буллиты — это РАЗНЫЕ рынки.",
  evidence:"HYPOTHESIS_NO_RATE"
 },
 {
  id:"volleyball-set",sport:"volleyball",sportLabel:"Волейбол",
  selection:"Set winner with advanced set score",
  state:"Одной стороне осталось 1–2 очка до окончания сета",
  risk:"Обязательная разница минимум 2 очка, продолжение до 26:24, 27:25 и т. д.; качество подач и ротаций.",
  marketSemantics:"Исход именно сета; нужно учитывать тай-брейк и формат соревнования.",
  source:"https://www.fivb.com/wp-content/uploads/2025/01/FIVB-Volleyball_Rules2025_2028-EN.pdf",
  evidence:"HYPOTHESIS_NO_RATE"
 }
];
