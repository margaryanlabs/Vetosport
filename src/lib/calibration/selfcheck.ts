import { badCalibration, healthyCalibration, smallCalibration } from "@/lib/calibration/sandbox";

export const runCalibrationDriftSelfCheck=()=>{
  const checks=[
    {name:"healthy calibration does not kill family",passed:healthyCalibration.status==="HEALTHY"&&!healthyCalibration.killSwitch},
    {name:"systematic overconfidence activates kill switch",passed:badCalibration.status==="KILL"&&badCalibration.killSwitch},
    {name:"small sample is watch not kill",passed:smallCalibration.status==="WATCH"&&!smallCalibration.killSwitch},
    {name:"bad calibration worsens ECE",passed:badCalibration.current.ece>healthyCalibration.current.ece},
    {name:"drift scores bounded",passed:[healthyCalibration,badCalibration,smallCalibration].every(x=>x.score>=0&&x.score<=1)},
  ];
  return{passed:checks.every(x=>x.passed),checks,sample:{healthy:healthyCalibration,bad:badCalibration,small:smallCalibration}};
};
