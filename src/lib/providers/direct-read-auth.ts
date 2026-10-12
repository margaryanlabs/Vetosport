/**
 * Internal direct-provider reads consume paid/limited API quota.
 * Only the server operator with INGESTION_SECRET can invoke them.
 * Public UI must use persisted, cached read-only endpoints instead.
 */
export function isAuthorizedProviderRead(request: Request): boolean {
 const secret=process.env.INGESTION_SECRET;
 const received=request.headers.get("x-veto-ingestion-secret");
 return typeof secret==="string" && secret.length>=12 && received===secret;
}

export const protectedProviderHeaders = {"Cache-Control":"no-store"};
