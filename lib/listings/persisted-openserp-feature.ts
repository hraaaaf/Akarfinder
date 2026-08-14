// REAL-LISTINGS-ONLY-1
// Persisted OpenSERP rows are real observed URLs, but observation is not
// publication authorization. The live Source Policy Registry is authoritative.
// Until the public read-model is bridged to that Registry at request time,
// persisted third-party rows must fail closed on public Search surfaces.

export function isPersistedOpenSerpListingsEnabled(
  _env: NodeJS.ProcessEnv = process.env,
): boolean {
  return false;
}
