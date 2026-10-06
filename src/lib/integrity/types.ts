export type SensorValue = number | string | boolean;

export interface SensorObservation {
  id: string;
  providerId: string;
  dependencyGroup: string;
  field: string;
  value: SensorValue;
  receivedAtMs: number;
  sourceAgeMs: number;
  uncertainty: number;
  providerReliability: number;
}

export interface FusedField {
  field: string;
  value: SensorValue | null;
  confidence: number;
  independentGroups: number;
  observations: number;
  disagreement: number;
  freshness: number;
  status: "HEALTHY" | "DEGRADED" | "CONFLICT" | "MISSING";
}

export interface LatentDimensionSpec {
  id: string;
  label: string;
  requiredFields: string[];
  minimumIndependentGroups: number;
  minimumFieldConfidence: number;
}

export interface IdentifiabilityDimension {
  id: string;
  label: string;
  score: number;
  identifiable: boolean;
  missingFields: string[];
  weakFields: string[];
  independentGroups: number;
}

export interface SensorIntegrityAnalysis {
  fields: FusedField[];
  dimensions: IdentifiabilityDimension[];
  integrityScore: number;
  identifiabilityScore: number;
  independentEvidenceRatio: number;
  overallStatus: "HEALTHY" | "DEGRADED" | "CONFLICT" | "UNIDENTIFIED";
  hardBlock: boolean;
  reasons: string[];
}
