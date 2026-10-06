import { controlDiscovery } from "@/lib/discovery/engine";
import type { HypothesisTest } from "@/lib/discovery/types";

export const discoveryTests:HypothesisTest[]=[
  {id:"h1",family:"goal-market",pValue:.001,effect:.018},
  {id:"h2",family:"goal-market",pValue:.004,effect:.014},
  {id:"h3",family:"team-total",pValue:.012,effect:.011},
  {id:"h4",family:"team-total",pValue:.041,effect:.008},
  {id:"h5",family:"1x2",pValue:.08,effect:.005},
  {id:"h6",family:"tail",pValue:.19,effect:.021},
  {id:"h7",family:"tail",pValue:.33,effect:.017},
  {id:"h8",family:"player-prop",pValue:.44,effect:.012},
  {id:"h9",family:"player-prop",pValue:.62,effect:.006},
  {id:"h10",family:"noise",pValue:.91,effect:.001},
];

export const discoveryControl=controlDiscovery(discoveryTests,{q:.05,alphaBudget:.05,rho:.8});
