import type {MarketQuote} from "@/lib/domain/types";

/**
 * PostgREST bulk JSON insert requires every object to have identical top-level
 * keys. JSON.stringify drops undefined values, so mixed 1X2, handicap and
 * totals quotes previously produced HTTP 400 (PGRST102) on market_quotes.
 *
 * This contract intentionally matches existing veto_sport_market_quotes
 * columns: nullable fields are explicit null, never omitted from some rows.
 * Source values are preserved, not synthesized or made executable.
 */
export function toUniformMarketQuoteRows(eventId:string,quotes:MarketQuote[]){
 return quotes.map(quote=>({
  event_id:eventId,
  provider:quote.sourceProvider??"normalized",
  bookmaker:quote.bookmaker,
  market_key:quote.marketId,
  selection_key:quote.selection.id,
  selection_label:quote.selection.label,
  line:quote.selection.line??null,
  decimal_odds:quote.decimalOdds,
  captured_at:quote.capturedAt,
  provider_last_update:quote.providerLastUpdate??null,
  liquidity:quote.liquidity??null,
  suspended:quote.suspended??null,
  raw:quote.raw??null,
 }));
}

export function marketQuotePayloadSelfcheck(){
 const basic:MarketQuote={
  eventId:"synthetic-fixture",marketId:"api-football.live.1",
  selection:{id:"home",label:"Home"},
  bookmaker:"API-Football · bookmaker unknown",
  decimalOdds:2.11,capturedAt:"2026-10-14T12:30:00.000Z",
  sourceProvider:"api-football-live-odds",
 };
 const withLine:MarketQuote={
  ...basic,selection:{id:"over-2.5",label:"Over 2.5",line:2.5},
  providerLastUpdate:"2026-10-14T12:29:50.000Z",liquidity:0,
  suspended:false,raw:{source:"test only"},
 };
 const rows=toUniformMarketQuoteRows("synthetic-id",[basic,withLine]);
 const serialized=JSON.parse(JSON.stringify(rows)) as Array<Record<string,unknown>>;
 const expectedKeys=Object.keys(serialized[0]).sort().join("|");
 const checks=[
  {name:"Every quote has exactly the same keys after JSON serialization",passed:
   serialized.length===2&&serialized.every(row=>Object.keys(row).sort().join("|")===expectedKeys)},
  {name:"Undefined handicap becomes SQL null, not a missing JSON property",passed:
   Object.hasOwn(serialized[0],"line")&&serialized[0].line===null&&serialized[1].line===2.5},
  {name:"Missing provider timestamp remains null, never guessed",passed:
   serialized[0].provider_last_update===null&&
   serialized[1].provider_last_update===withLine.providerLastUpdate},
  {name:"Missing volume remains null, but real zero liquidity survives",passed:
   serialized[0].liquidity===null&&serialized[1].liquidity===0},
  {name:"Suspension is explicit, without inventing a bookmaker-open status",passed:
   serialized[0].suspended===null&&serialized[1].suspended===false},
  {name:"Provider metadata preserved without fabricating fields",passed:
   serialized[0].raw===null&&
   JSON.stringify(serialized[1].raw)===JSON.stringify(withLine.raw)},
  {name:"Actual exact odds and source are preserved",passed:
   serialized[0].decimal_odds===2.11&&
   serialized[1].provider==="api-football-live-odds"&&
   serialized[1].bookmaker===basic.bookmaker},
  {name:"No canonical event or money-market side effects",passed:
   rows.every(row=>row.event_id==="synthetic-id")&&
   !Object.hasOwn(rows[0],"betting_edge")},
 ];
 return {passed:checks.every(c=>c.passed),checks};
}
