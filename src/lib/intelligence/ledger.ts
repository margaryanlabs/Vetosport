import type { DecisionLedgerEntry } from "@/lib/domain/types";

export const ledgerFingerprint = (entry: DecisionLedgerEntry) => {
  const canonical = [
    entry.id,
    entry.eventId,
    entry.marketId,
    entry.selectionId,
    entry.capturedAt,
    entry.decision,
    entry.modelVersionSet.join(","),
    entry.featureSnapshotId,
    entry.marketOdds.toFixed(6),
    entry.fairProbability.toFixed(8),
    entry.opportunityScore.toString(),
  ].join("|");

  // Non-cryptographic deterministic fingerprint for local identity.
  // Replace with SHA-256 at persistence boundary when the DB layer lands.
  let hash = 2166136261;
  for (let i = 0; i < canonical.length; i += 1) {
    hash ^= canonical.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
};

export const closeLedgerEntry = (
  entry: DecisionLedgerEntry,
  closingOdds: number,
  outcome: NonNullable<DecisionLedgerEntry["outcome"]>,
): DecisionLedgerEntry => ({
  ...entry,
  closingOdds,
  outcome,
});
