import { evaluateLeakageControls } from "@/lib/leakage/engine";
import type { NegativeControlTest } from "@/lib/leakage/types";

export const cleanControls:NegativeControlTest[]=[
  {id:"placebo-color",label:"Random kit-color placebo",family:"PLACEBO_FEATURE",observedEffect:.0004,expectedMaxAbsEffect:.002,pValue:.61,qValue:.78},
  {id:"shuffle",label:"Shuffled-label challenger",family:"SHUFFLED_LABEL",observedEffect:.0008,expectedMaxAbsEffect:.002,pValue:.48,qValue:.66},
  {id:"temporal-ok",label:"Feature availability audit",family:"TEMPORAL_AVAILABILITY",observedEffect:0,expectedMaxAbsEffect:.001,pValue:1,qValue:1,featureAvailableAtMs:980,decisionAtMs:1000},
];

export const leakingControls:NegativeControlTest[]=[
  ...cleanControls,
  {id:"future-close",label:"Closing-price future proxy",family:"FUTURE_PROXY",observedEffect:.012,expectedMaxAbsEffect:.002,pValue:.001,qValue:.006,featureAvailableAtMs:1450,decisionAtMs:1000},
];

export const warningControls:NegativeControlTest[]=[
  ...cleanControls,
  {id:"placebo-venue-code",label:"Venue-code placebo",family:"PLACEBO_FEATURE",observedEffect:.0027,expectedMaxAbsEffect:.002,pValue:.04,qValue:.084},
];

export const cleanLeakageMonitor=evaluateLeakageControls(cleanControls);
export const leakingLeakageMonitor=evaluateLeakageControls(leakingControls);
export const warningLeakageMonitor=evaluateLeakageControls(warningControls);
