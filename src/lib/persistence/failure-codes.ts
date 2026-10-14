/**
 * Safe categorization of server-only persistence failures.
 *
 * Never surface exception messages, SQL, provider payloads, keys, table rows,
 * endpoint URLs, or bridge internals in public source-health diagnostics.
 */
export type StorageFailureClass=
 "STORAGE_AUTH"|"STORAGE_SCHEMA"|"STORAGE_CONFLICT"|
 "STORAGE_FOREIGN_KEY"|"STORAGE_CONSTRAINT"|"STORAGE_TIMEOUT"|
 "STORAGE_UNAVAILABLE"|"STORAGE_UNKNOWN";

export function classifyStorageFailure(error:unknown):StorageFailureClass{
 const message=error instanceof Error?error.message:"";
 const sqlState=/\\?"code\\?"\s*:\s*\\?"([A-Z0-9]{5,12})/i.exec(message)?.[1]?.toUpperCase();
 // PostgreSQL and PostgREST codes are matched only by fixed allowlist.
 if(sqlState==="42501"||/^PGRST30[0-3]$/.test(sqlState??""))
  return "STORAGE_AUTH";
 if(sqlState==="42P01"||sqlState==="42703"||
  sqlState==="PGRST204"||sqlState==="PGRST205")
  return "STORAGE_SCHEMA";
 if(sqlState==="23505")return "STORAGE_CONFLICT";
 if(sqlState==="23503")return "STORAGE_FOREIGN_KEY";
 if(["23502","23514","22P02","22001","22003"].includes(sqlState??""))
  return "STORAGE_CONSTRAINT";
 const status=/\bSupabase persistence\s+(\d{3}):/.exec(message)?.[1];
 if(status==="401"||status==="403")return "STORAGE_AUTH";
 if(status==="404")return "STORAGE_SCHEMA";
 if(status==="409")return "STORAGE_CONFLICT";
 if(status==="408"||status==="429"||status==="504")
  return "STORAGE_TIMEOUT";
 if(status==="500"||status==="502"||status==="503")
  return "STORAGE_UNAVAILABLE";
 if(error instanceof Error&&
  (error.name==="AbortError"||error.name==="TimeoutError"))
  return "STORAGE_TIMEOUT";
 return "STORAGE_UNKNOWN";
}

export function storageFailureSelfcheck(){
 const check=(input:unknown,expected:StorageFailureClass)=>
  classifyStorageFailure(input)===expected;
 const cases=[
  {name:"Forbidden server-side write reported as role failure, no raw error",
   passed:check(Error('Supabase persistence 403: {"message":"secret"}'),"STORAGE_AUTH")},
  {name:"Missing market table diagnosed as schema mismatch",
   passed:check(Error('Supabase persistence 404: {"code":"PGRST205","details":"secret"}'),"STORAGE_SCHEMA")},
  {name:"Missing journal column diagnosed without reporting its name",
   passed:check(Error('Supabase persistence 400: {"code":"PGRST204"}'),"STORAGE_SCHEMA")},
  {name:"Foreign-key errors separated from provider quote issues",
   passed:check(Error('Supabase persistence 400: {"code":"23503"}'),"STORAGE_FOREIGN_KEY")},
  {name:"Constraint errors separated from duplicate quote",
   passed:check(Error('Supabase persistence 400: {"code":"23514"}'),"STORAGE_CONSTRAINT")},
  {name:"Conflicting immutable evidence hash is not assumed successful",
   passed:check(Error('Supabase persistence 409: {"code":"23505"}'),"STORAGE_CONFLICT")},
  {name:"Temporary storage bridge errors classified",
   passed:check(Error("Supabase persistence 503: proxy unavailable"),"STORAGE_UNAVAILABLE")},
  {name:"Timeout classified",
   passed:check(Object.assign(Error("deadline"),{name:"TimeoutError"}),"STORAGE_TIMEOUT")},
  {name:"Raw private response text cannot become public status code",
   passed:!classifyStorageFailure(Error('secret token xyz')).includes("secret")},
 ];
 return{passed:cases.every(c=>c.passed),checks:cases};
}
