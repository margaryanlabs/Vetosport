import type {
  RegimeHysteresisResult,
  RegimeMachineConfig,
  RegimeMachineFrame,
  RegimeMachineInput,
  RegimeMachinePhase,
  RegimeTransition,
} from "@/lib/regime-hysteresis/types";
import type { RegimeLabel } from "@/lib/regime/types";

const defaults:RegimeMachineConfig={
  enterProbability:.72,
  enterFrames:3,
  exitProbability:.30,
  recoveryFrames:3,
  minDwellFrames:4,
  switchProbability:.78,
  switchFrames:3,
};

export const runRegimeHysteresis=(
  input:RegimeMachineInput[],
  overrides:Partial<RegimeMachineConfig>={}
):RegimeHysteresisResult=>{
  const config={...defaults,...overrides};
  let activeRegime:RegimeLabel="STABLE_CONTROL";
  let phase:RegimeMachinePhase="STABLE";
  let dwellFrames=0;
  let enterCandidate:RegimeLabel|null=null;
  let enterCount=0;
  let recoveryCount=0;
  let switchCandidate:RegimeLabel|null=null;
  let switchCount=0;
  const transitions:RegimeTransition[]=[];
  const frames:RegimeMachineFrame[]=[];

  let rawFlipCount=0;
  let lastRaw:RegimeLabel|null=null;

  const emit=(
    row:RegimeMachineInput,
    type:RegimeTransition["type"],
    from:RegimeLabel,
    to:RegimeLabel,
    evidenceFrames:number,
  )=>{
    transitions.push({
      timeMs:row.timeMs,
      type,
      from,
      to,
      evidenceFrames,
      changeProbability:row.changeProbability,
    });
  };

  for(const row of input){
    if(lastRaw!==null&&lastRaw!==row.regime)rawFlipCount+=1;
    lastRaw=row.regime;

    if(activeRegime==="STABLE_CONTROL"){
      dwellFrames=0;
      recoveryCount=0;
      switchCandidate=null;
      switchCount=0;

      const enterEligible=
        row.regime!=="STABLE_CONTROL"&&
        row.changeProbability>=config.enterProbability;

      if(enterEligible){
        if(enterCandidate===row.regime){
          enterCount+=1;
        }else{
          enterCandidate=row.regime;
          enterCount=1;
        }
        phase="ENTERING";

        if(enterCount>=config.enterFrames){
          const from=activeRegime;
          activeRegime=row.regime;
          phase="ACTIVE";
          dwellFrames=1;
          emit(row,"ENTER",from,activeRegime,enterCount);
          enterCandidate=null;
          enterCount=0;
        }
      }else{
        enterCandidate=null;
        enterCount=0;
        phase="STABLE";
      }
    }else{
      dwellFrames+=1;

      const sameActive=
        row.regime===activeRegime&&
        row.changeProbability>=config.exitProbability;

      if(sameActive){
        if(phase==="RECOVERING"){
          emit(row,"RECOVERY_CANCEL",activeRegime,activeRegime,recoveryCount);
        }
        phase="ACTIVE";
        recoveryCount=0;
        switchCandidate=null;
        switchCount=0;
      }else{
        const switchEligible=
          dwellFrames>=config.minDwellFrames&&
          row.regime!=="STABLE_CONTROL"&&
          row.regime!==activeRegime&&
          row.changeProbability>=config.switchProbability;

        const recoveryEligible=
          dwellFrames>=config.minDwellFrames&&
          row.regime==="STABLE_CONTROL"&&
          row.changeProbability<=config.exitProbability;

        if(switchEligible){
          recoveryCount=0;
          if(switchCandidate===row.regime){
            switchCount+=1;
          }else{
            switchCandidate=row.regime;
            switchCount=1;
            emit(row,"SWITCH_ARM",activeRegime,row.regime,1);
          }
          phase="SWITCHING";

          if(switchCount>=config.switchFrames){
            const from=activeRegime;
            activeRegime=row.regime;
            phase="ACTIVE";
            dwellFrames=1;
            emit(row,"SWITCH",from,activeRegime,switchCount);
            switchCandidate=null;
            switchCount=0;
          }
        }else if(recoveryEligible){
          switchCandidate=null;
          switchCount=0;
          recoveryCount+=1;
          if(recoveryCount===1){
            emit(row,"RECOVERY_START",activeRegime,"STABLE_CONTROL",1);
          }
          phase="RECOVERING";

          if(recoveryCount>=config.recoveryFrames){
            const from=activeRegime;
            activeRegime="STABLE_CONTROL";
            phase="STABLE";
            dwellFrames=0;
            emit(row,"EXIT",from,activeRegime,recoveryCount);
            recoveryCount=0;
          }
        }else{
          // Ambiguous evidence is deliberately sticky: do not switch state.
          if(phase==="RECOVERING"&&recoveryCount>0){
            emit(row,"RECOVERY_CANCEL",activeRegime,activeRegime,recoveryCount);
          }
          phase="ACTIVE";
          recoveryCount=0;
          switchCandidate=null;
          switchCount=0;
        }
      }
    }

    frames.push({
      timeMs:row.timeMs,
      rawRegime:row.regime,
      rawChangeProbability:row.changeProbability,
      activeRegime,
      phase,
      dwellFrames,
      enterCount,
      recoveryCount,
      switchCount,
      candidateRegime:enterCandidate??switchCandidate,
    });
  }

  const governedFlips=frames.reduce((count,row,index)=>{
    if(index===0)return count;
    return count+(frames[index-1].activeRegime!==row.activeRegime?1:0);
  },0);

  return{
    config,
    frames,
    transitions,
    activeRegime,
    phase,
    rawFlipCount,
    governedFlipCount:governedFlips,
    noiseSuppressed:Math.max(0,rawFlipCount-governedFlips),
    stable:activeRegime==="STABLE_CONTROL"&&phase==="STABLE",
  };
};
