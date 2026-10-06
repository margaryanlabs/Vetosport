import { runRegimeHysteresis } from "@/lib/regime-hysteresis/engine";
import type { RegimeMachineInput } from "@/lib/regime-hysteresis/types";
import type { RegimeLabel } from "@/lib/regime/types";

const frame=(i:number,regime:RegimeLabel,p:number):RegimeMachineInput=>({
  timeMs:i*1000,
  regime,
  changeProbability:p,
});

export const stableMachine=runRegimeHysteresis(
  Array.from({length:18},(_,i)=>frame(i,"STABLE_CONTROL",.08+(i%4)*.02))
);

export const noiseHoldMachine=runRegimeHysteresis([
  frame(0,"STABLE_CONTROL",.08),
  frame(1,"STABLE_CONTROL",.10),
  frame(2,"OPEN_TRANSITION",.79),
  frame(3,"OPEN_TRANSITION",.84),
  frame(4,"OPEN_TRANSITION",.88),
  frame(5,"OPEN_TRANSITION",.91),
  frame(6,"OPEN_TRANSITION",.89),
  frame(7,"STABLE_CONTROL",.18),
  frame(8,"OPEN_TRANSITION",.87),
  frame(9,"OPEN_TRANSITION",.86),
]);

export const recoveryMachine=runRegimeHysteresis([
  frame(0,"STABLE_CONTROL",.09),
  frame(1,"OPEN_TRANSITION",.80),
  frame(2,"OPEN_TRANSITION",.84),
  frame(3,"OPEN_TRANSITION",.88),
  frame(4,"OPEN_TRANSITION",.91),
  frame(5,"OPEN_TRANSITION",.90),
  frame(6,"OPEN_TRANSITION",.86),
  frame(7,"STABLE_CONTROL",.22),
  frame(8,"STABLE_CONTROL",.20),
  frame(9,"STABLE_CONTROL",.16),
]);

export const chatterMachine=runRegimeHysteresis([
  frame(0,"STABLE_CONTROL",.10),
  frame(1,"OPEN_TRANSITION",.82),
  frame(2,"OPEN_TRANSITION",.85),
  frame(3,"OPEN_TRANSITION",.88),
  frame(4,"OPEN_TRANSITION",.89),
  frame(5,"PRESSURE_SIEGE",.83),
  frame(6,"OPEN_TRANSITION",.81),
  frame(7,"PRESSURE_SIEGE",.84),
  frame(8,"OPEN_TRANSITION",.82),
  frame(9,"PRESSURE_SIEGE",.86),
  frame(10,"OPEN_TRANSITION",.85),
]);

export const switchMachine=runRegimeHysteresis([
  frame(0,"STABLE_CONTROL",.10),
  frame(1,"OPEN_TRANSITION",.82),
  frame(2,"OPEN_TRANSITION",.85),
  frame(3,"OPEN_TRANSITION",.88),
  frame(4,"OPEN_TRANSITION",.90),
  frame(5,"OPEN_TRANSITION",.88),
  frame(6,"PRESSURE_SIEGE",.84),
  frame(7,"PRESSURE_SIEGE",.87),
  frame(8,"PRESSURE_SIEGE",.90),
  frame(9,"PRESSURE_SIEGE",.91),
]);
