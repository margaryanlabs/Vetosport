import { analyzeSensorIntegrity } from "@/lib/integrity/engine";
import type { LatentDimensionSpec, SensorObservation } from "@/lib/integrity/types";

export const integrityDimensions:LatentDimensionSpec[]=[
  {id:"observable",label:"Observable Match State",requiredFields:["score","clock","possession"],minimumIndependentGroups:2,minimumFieldConfidence:.65},
  {id:"hazard",label:"Goal Hazard State",requiredFields:["score","clock","shot_pressure","tempo"],minimumIndependentGroups:2,minimumFieldConfidence:.6},
  {id:"lineup",label:"Lineup / Tactical State",requiredFields:["lineup","formation"],minimumIndependentGroups:2,minimumFieldConfidence:.58},
];

export const healthySensors:SensorObservation[]=[
  {id:"1",providerId:"official",dependencyGroup:"official",field:"score",value:"1-1",receivedAtMs:1000,sourceAgeMs:180,uncertainty:.02,providerReliability:.99},
  {id:"2",providerId:"oddsfeed-a",dependencyGroup:"odds-upstream",field:"score",value:"1-1",receivedAtMs:1050,sourceAgeMs:240,uncertainty:.04,providerReliability:.94},
  {id:"3",providerId:"official",dependencyGroup:"official",field:"clock",value:3858,receivedAtMs:1000,sourceAgeMs:180,uncertainty:.02,providerReliability:.99},
  {id:"4",providerId:"event-b",dependencyGroup:"event-b",field:"clock",value:3856,receivedAtMs:1090,sourceAgeMs:320,uncertainty:.05,providerReliability:.9},
  {id:"5",providerId:"event-b",dependencyGroup:"event-b",field:"possession",value:"ARS",receivedAtMs:1100,sourceAgeMs:300,uncertainty:.08,providerReliability:.88},
  {id:"6",providerId:"tracking",dependencyGroup:"tracking",field:"possession",value:"ARS",receivedAtMs:1110,sourceAgeMs:260,uncertainty:.06,providerReliability:.93},
  {id:"7",providerId:"tracking",dependencyGroup:"tracking",field:"shot_pressure",value:0.42,receivedAtMs:1120,sourceAgeMs:250,uncertainty:.12,providerReliability:.9},
  {id:"8",providerId:"event-b",dependencyGroup:"event-b",field:"shot_pressure",value:0.43,receivedAtMs:1140,sourceAgeMs:330,uncertainty:.14,providerReliability:.86},
  {id:"9",providerId:"tracking",dependencyGroup:"tracking",field:"tempo",value:0.61,receivedAtMs:1150,sourceAgeMs:280,uncertainty:.1,providerReliability:.9},
  {id:"10",providerId:"event-b",dependencyGroup:"event-b",field:"tempo",value:0.60,receivedAtMs:1160,sourceAgeMs:360,uncertainty:.12,providerReliability:.85},
  {id:"11",providerId:"official",dependencyGroup:"official",field:"lineup",value:"ars-v4",receivedAtMs:1170,sourceAgeMs:800,uncertainty:.02,providerReliability:.99},
  {id:"12",providerId:"news-a",dependencyGroup:"news",field:"lineup",value:"ars-v4",receivedAtMs:1180,sourceAgeMs:900,uncertainty:.1,providerReliability:.8},
  {id:"13",providerId:"tracking",dependencyGroup:"tracking",field:"formation",value:"4-4-2",receivedAtMs:1190,sourceAgeMs:500,uncertainty:.15,providerReliability:.86},
  {id:"14",providerId:"event-b",dependencyGroup:"event-b",field:"formation",value:"4-4-2",receivedAtMs:1200,sourceAgeMs:600,uncertainty:.18,providerReliability:.8},
];

export const healthyIntegrity=analyzeSensorIntegrity({observations:healthySensors,dimensions:integrityDimensions});

export const conflictIntegrity=analyzeSensorIntegrity({
  observations:healthySensors.map(x=>x).concat([
    {id:"conflict-score",providerId:"provider-x",dependencyGroup:"independent-x",field:"score",value:"2-1",receivedAtMs:1210,sourceAgeMs:200,uncertainty:.02,providerReliability:.97},
  ]),
  dimensions:integrityDimensions,
});

export const missingIntegrity=analyzeSensorIntegrity({
  observations:healthySensors.filter(x=>!["lineup","formation"].includes(x.field)),
  dimensions:integrityDimensions,
});
