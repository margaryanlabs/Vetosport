import {
  highHazardEstimate,
  lowHazardEstimate,
  openModel1,
  openModel3,
  openModel5,
  sparseHazardEstimate,
} from "@/lib/hazard-calibration/sandbox";

const monotone=(xs:number[])=>xs.every((x,i)=>i===0||x+1e-12>=xs[i-1]);

export const runHazardCalibrationSelfCheck=()=>{
  const checks=[
    {
      name:"regime calibration models have enough sample and acceptable status",
      passed:[openModel1,openModel3,openModel5].every(x=>x.sampleSize>=80&&x.status!=="UNTRUSTED"),
    },
    {
      name:"calibrated bin probabilities are monotone in hazard score",
      passed:[openModel1,openModel3,openModel5].every(model=>monotone(model.bins.map(x=>x.calibratedRate))),
    },
    {
      name:"high hazard implies larger transition probability than low hazard",
      passed:highHazardEstimate.p1>lowHazardEstimate.p1&&highHazardEstimate.p3>lowHazardEstimate.p3&&highHazardEstimate.p5>lowHazardEstimate.p5,
    },
    {
      name:"transition horizons are probability ordered",
      passed:[lowHazardEstimate,highHazardEstimate,sparseHazardEstimate].every(x=>x.p1<=x.p3&&x.p3<=x.p5),
    },
    {
      name:"sparse regime falls back to pooled calibration",
      passed:sparseHazardEstimate.source==="POOLED",
    },
    {
      name:"probabilities stay bounded",
      passed:[lowHazardEstimate,highHazardEstimate,sparseHazardEstimate].every(x=>[x.p1,x.p3,x.p5].every(p=>p>=0&&p<=1)),
    },
    {
      name:"brier scores remain bounded",
      passed:[openModel1,openModel3,openModel5].every(x=>x.brier>=0&&x.brier<=1),
    },
  ];

  return{
    passed:checks.every(x=>x.passed),
    checks,
    sample:{
      low:lowHazardEstimate,
      high:highHazardEstimate,
      sparse:sparseHazardEstimate,
      models:{h1:openModel1,h3:openModel3,h5:openModel5},
    },
  };
};
