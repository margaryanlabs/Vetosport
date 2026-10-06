export interface SemanticSnapshot {
  providerId:string;
  versionId:string;
  sport:string;
  effectiveFrom:string;
  schema:Record<string,string>;
  rules:Record<string,string|number|boolean>;
  aliases:Record<string,string>;
}

export interface SemanticChange {
  path:string;
  before:unknown;
  after:unknown;
  severity:"INFO"|"WARNING"|"BREAKING";
  category:"SCHEMA"|"RULE"|"ALIAS";
}

export interface SemanticDriftResult {
  providerId:string;
  fromVersion:string;
  toVersion:string;
  driftScore:number;
  breaking:boolean;
  freezeRequired:boolean;
  changes:SemanticChange[];
  affectedFamilies:string[];
  actions:string[];
}
