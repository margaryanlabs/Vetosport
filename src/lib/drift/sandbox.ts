import { detectSemanticDrift } from "@/lib/drift/engine";
import type { SemanticSnapshot } from "@/lib/drift/types";

export const baseSemantic:SemanticSnapshot={
  providerId:"book-a",
  versionId:"2026.09",
  sport:"football",
  effectiveFrom:"2026-09-01T00:00:00Z",
  schema:{marketId:"string",selection:"string",line:"number",odds:"number"},
  rules:{overtimeIncluded:false,period:"REGULATION",voidRule:"80m",settlementModel:"asian-standard",pushRule:"refund"},
  aliases:{match_total:"total_goals",asian_total:"total_goals"},
};

export const stableSemantic:SemanticSnapshot={
  ...baseSemantic,
  versionId:"2026.10a",
  aliases:{...baseSemantic.aliases,totals:"total_goals"},
};

export const breakingSemantic:SemanticSnapshot={
  ...baseSemantic,
  versionId:"2026.10b",
  schema:{marketId:"string",selection:"string",line:"string",odds:"number"},
  rules:{...baseSemantic.rules,overtimeIncluded:true,period:"FULL_GAME"},
};

export const stableDrift=detectSemanticDrift(baseSemantic,stableSemantic);
export const breakingDrift=detectSemanticDrift(baseSemantic,breakingSemantic);
