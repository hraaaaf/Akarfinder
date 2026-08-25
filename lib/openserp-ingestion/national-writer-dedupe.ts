// OPENSERP-PROPERTY-LISTINGS-BATCH-DEDUPE-1
// PostgreSQL INSERT .. ON CONFLICT DO UPDATE cannot target the same row twice
// in one statement. National ingestion may admit the same canonical URL via
// multiple queries/engines, so collapse rows on the exact UNIQUE key used by
// property_listings before batching. Last occurrence wins, matching the
// discovery-candidate writer's within-run refresh semantics.

export function dedupeByCanonicalFingerprint<T extends { canonical_fingerprint: string }>(values: T[]): T[] {
  return [...new Map(values.map((value) => [value.canonical_fingerprint, value])).values()];
}
