import {
  calibratedEnvelope,
  driftEnvelope,
  severeEnvelope,
  sparseEnvelope,
} from "@/lib/conformal/sandbox";

export const runConformalSelfCheck=()=>{
  const checks=[
    {
      name:"healthy regime-specific envelope stays calibrated",
      passed:calibratedEnvelope.status==="CALIBRATED"&&!calibratedEnvelope.hardBlock&&calibratedEnvelope.source==="REGIME",
    },
    {
      name:"coverage drift widens uncertainty",
      passed:driftEnvelope.status==="WIDEN"&&driftEnvelope.adaptiveRadius>driftEnvelope.baseRadius,
    },
    {
      name:"severe uncertainty forces abstention",
      passed:severeEnvelope.status==="ABSTAIN"&&severeEnvelope.hardBlock,
    },
    {
      name:"sparse regime falls back to pooled calibration",
      passed:sparseEnvelope.source==="POOLED"&&sparseEnvelope.status==="WIDEN",
    },
    {
      name:"intervals remain probability bounded",
      passed:[calibratedEnvelope,driftEnvelope,severeEnvelope,sparseEnvelope].every(x=>x.lower>=0&&x.upper<=1&&x.lower<=x.upper),
    },
    {
      name:"adaptive radius never shrinks under broken coverage",
      passed:driftEnvelope.adaptiveRadius>=driftEnvelope.baseRadius&&severeEnvelope.adaptiveRadius>=severeEnvelope.baseRadius,
    },
  ];

  return{
    passed:checks.every(x=>x.passed),
    checks,
    sample:{
      calibrated:calibratedEnvelope,
      drift:driftEnvelope,
      severe:severeEnvelope,
      sparse:sparseEnvelope,
    },
  };
};
