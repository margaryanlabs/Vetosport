import type { ChangePointFrame, RegimeLabel } from "@/lib/regime/types";

export type RegimeMachinePhase =
  | "STABLE"
  | "ENTERING"
  | "ACTIVE"
  | "RECOVERING"
  | "SWITCHING";

export type RegimeTransitionType =
  | "ENTER"
  | "RECOVERY_START"
  | "RECOVERY_CANCEL"
  | "EXIT"
  | "SWITCH_ARM"
  | "SWITCH";

export interface RegimeMachineConfig {
  enterProbability:number;
  enterFrames:number;
  exitProbability:number;
  recoveryFrames:number;
  minDwellFrames:number;
  switchProbability:number;
  switchFrames:number;
}

export interface RegimeMachineFrame {
  timeMs:number;
  rawRegime:RegimeLabel;
  rawChangeProbability:number;
  activeRegime:RegimeLabel;
  phase:RegimeMachinePhase;
  dwellFrames:number;
  enterCount:number;
  recoveryCount:number;
  switchCount:number;
  candidateRegime:RegimeLabel | null;
}

export interface RegimeTransition {
  timeMs:number;
  type:RegimeTransitionType;
  from:RegimeLabel;
  to:RegimeLabel;
  evidenceFrames:number;
  changeProbability:number;
}

export interface RegimeHysteresisResult {
  config:RegimeMachineConfig;
  frames:RegimeMachineFrame[];
  transitions:RegimeTransition[];
  activeRegime:RegimeLabel;
  phase:RegimeMachinePhase;
  rawFlipCount:number;
  governedFlipCount:number;
  noiseSuppressed:number;
  stable:boolean;
}

export type RegimeMachineInput = Pick<
  ChangePointFrame,
  "timeMs" | "regime" | "changeProbability"
>;
