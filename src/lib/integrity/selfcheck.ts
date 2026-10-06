import { analyzeSensorIntegrity } from "@/lib/integrity/engine";
import { conflictIntegrity, healthyIntegrity, healthySensors, integrityDimensions, missingIntegrity } from "@/lib/integrity/sandbox";

export const runSensorIntegritySelfCheck=()=>{
  const cloned=analyzeSensorIntegrity({
    observations:healthySensors.concat(
      healthySensors
        .filter(x=>x.dependencyGroup==="odds-upstream")
        .map((x,i)=>({...x,id:`clone-${i}`,providerId:`clone-${i}`}))
    ),
    dimensions:integrityDimensions,
  });

  const scoreConflict=conflictIntegrity.fields.find(x=>x.field==="score");

  const checks=[
    {name:"healthy multi-sensor state is not hard-blocked",passed:!healthyIntegrity.hardBlock&&healthyIntegrity.overallStatus==="HEALTHY"},
    {name:"independent score conflict is detected",passed:scoreConflict?.status==="CONFLICT"&&conflictIntegrity.hardBlock},
    {name:"missing lineup state reduces identifiability",passed:missingIntegrity.identifiabilityScore<healthyIntegrity.identifiabilityScore&&missingIntegrity.overallStatus!=="HEALTHY"},
    {name:"cloned upstream source does not create independent evidence",passed:cloned.independentEvidenceRatio<=healthyIntegrity.independentEvidenceRatio+.02},
    {name:"scores remain bounded",passed:[healthyIntegrity,conflictIntegrity,missingIntegrity].every(x=>x.integrityScore>=0&&x.integrityScore<=1&&x.identifiabilityScore>=0&&x.identifiabilityScore<=1)},
    {name:"healthy critical dimensions identifiable",passed:healthyIntegrity.dimensions.every(x=>x.identifiable)},
  ];

  return{passed:checks.every(x=>x.passed),checks,sample:{healthy:healthyIntegrity,conflict:conflictIntegrity,missing:missingIntegrity,cloned}};
};
