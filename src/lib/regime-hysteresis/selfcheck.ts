import {
  chatterMachine,
  noiseHoldMachine,
  recoveryMachine,
  stableMachine,
  switchMachine,
} from "@/lib/regime-hysteresis/sandbox";

export const runRegimeHysteresisSelfCheck=()=>{
  const recoveryExit=recoveryMachine.transitions.find(x=>x.type==="EXIT");
  const switchEvent=switchMachine.transitions.find(x=>x.type==="SWITCH");

  const checks=[
    {
      name:"stable stream never enters a latent regime",
      passed:stableMachine.activeRegime==="STABLE_CONTROL"&&stableMachine.governedFlipCount===0,
    },
    {
      name:"single recovery frame does not eject active regime",
      passed:noiseHoldMachine.activeRegime==="OPEN_TRANSITION"&&!noiseHoldMachine.transitions.some(x=>x.type==="EXIT"),
    },
    {
      name:"confirmed recovery exits only after required evidence",
      passed:recoveryMachine.activeRegime==="STABLE_CONTROL"&&Boolean(recoveryExit)&&recoveryExit?.evidenceFrames===recoveryMachine.config.recoveryFrames,
    },
    {
      name:"alternating raw regimes do not create switch chatter",
      passed:chatterMachine.activeRegime==="OPEN_TRANSITION"&&!chatterMachine.transitions.some(x=>x.type==="SWITCH"),
    },
    {
      name:"persistent new regime produces governed switch",
      passed:switchMachine.activeRegime==="PRESSURE_SIEGE"&&Boolean(switchEvent)&&switchEvent?.evidenceFrames===switchMachine.config.switchFrames,
    },
    {
      name:"governed state flips no more often than raw classifier",
      passed:[stableMachine,noiseHoldMachine,recoveryMachine,chatterMachine,switchMachine].every(x=>x.governedFlipCount<=x.rawFlipCount),
    },
    {
      name:"hysteresis suppresses at least one noisy raw flip",
      passed:chatterMachine.noiseSuppressed>0,
    },
  ];

  return{
    passed:checks.every(x=>x.passed),
    checks,
    sample:{
      stable:stableMachine,
      noiseHold:noiseHoldMachine,
      recovery:recoveryMachine,
      chatter:chatterMachine,
      switch:switchMachine,
    },
  };
};
