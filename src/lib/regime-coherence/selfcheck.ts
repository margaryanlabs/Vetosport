import {
  coherentRegimeGate,
  fastImminentGate,
  preRegimeGate,
  slowImminentGate,
  staleSnapshotGate,
} from "@/lib/regime-coherence/sandbox";

export const runRegimeCoherenceSelfCheck=()=>{
  const checks=[
    {
      name:"coherent current-regime signal preserves authority",
      passed:coherentRegimeGate.action==="PRESERVE"&&coherentRegimeGate.authorityMultiplier===1,
    },
    {
      name:"regime mismatch hard-abstains",
      passed:staleSnapshotGate.action==="ABSTAIN"&&!staleSnapshotGate.regimeMatches&&staleSnapshotGate.authorityMultiplier===0,
    },
    {
      name:"signal created before current regime hard-abstains",
      passed:preRegimeGate.action==="ABSTAIN"&&preRegimeGate.predatesRegime,
    },
    {
      name:"imminent transition plus slow adaptation caps to watch",
      passed:slowImminentGate.action==="CAP_TO_WATCH"&&slowImminentGate.transitionFragile&&slowImminentGate.authorityMultiplier>0&&slowImminentGate.authorityMultiplier<1,
    },
    {
      name:"fast adapting model survives imminent transition warning",
      passed:fastImminentGate.action==="PRESERVE"&&!fastImminentGate.transitionFragile,
    },
    {
      name:"authority multiplier remains bounded",
      passed:[coherentRegimeGate,staleSnapshotGate,preRegimeGate,slowImminentGate,fastImminentGate].every(x=>x.authorityMultiplier>=0&&x.authorityMultiplier<=1),
    },
  ];

  return{
    passed:checks.every(x=>x.passed),
    checks,
    sample:{
      coherent:coherentRegimeGate,
      stale:staleSnapshotGate,
      predates:preRegimeGate,
      slowImminent:slowImminentGate,
      fastImminent:fastImminentGate,
    },
  };
};
