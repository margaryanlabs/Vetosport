import {
  highRiskFastAuthority,
  highRiskSlowAuthority,
  lowRiskAuthority,
  sparseAuthority,
  staleAuthority,
} from "@/lib/transition-authority/sandbox";

export const runTransitionAuthoritySelfCheck=()=>{
  const checks=[
    {
      name:"low calibrated transition risk preserves authority",
      passed:lowRiskAuthority.action==="PRESERVE"&&lowRiskAuthority.calibrationTrusted,
    },
    {
      name:"high calibrated risk plus slow adaptation hard-abstains",
      passed:highRiskSlowAuthority.action==="ABSTAIN"&&highRiskSlowAuthority.adaptationRisk>.5,
    },
    {
      name:"fast adapting model survives high calibrated transition risk",
      passed:highRiskFastAuthority.action==="PRESERVE"&&highRiskFastAuthority.adaptationRisk<.1,
    },
    {
      name:"pooled sparse-regime calibration cannot preserve full authority",
      passed:sparseAuthority.action==="CAP_TO_WATCH"&&!sparseAuthority.calibrationTrusted,
    },
    {
      name:"stale regime snapshot abstains regardless of calibration",
      passed:staleAuthority.action==="ABSTAIN",
    },
    {
      name:"authority multiplier remains bounded",
      passed:[lowRiskAuthority,highRiskSlowAuthority,highRiskFastAuthority,sparseAuthority,staleAuthority].every(x=>x.authorityMultiplier>=0&&x.authorityMultiplier<=1),
    },
  ];

  return{
    passed:checks.every(x=>x.passed),
    checks,
    sample:{
      low:lowRiskAuthority,
      highSlow:highRiskSlowAuthority,
      highFast:highRiskFastAuthority,
      sparse:sparseAuthority,
      stale:staleAuthority,
    },
  };
};
