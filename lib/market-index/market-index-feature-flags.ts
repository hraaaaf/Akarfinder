// AKARFINDER-MARKET-INDEX-FOUNDATION-1 — feature flags, all false by default.
// Mirrors the existing project convention (lib/listings/persisted-openserp-feature.ts):
// an explicit "true" string enables a flag, anything else (absent, "false", malformed) is false.
//
// MARKET_INDEX_CLUSTERING_ENABLED carries an additional hard rule: this mission's own code
// never reads it as anything other than false in production code paths — isClusteringEnabled()
// exists so a future, separately-authorized mission can flip it, but nothing in this codebase
// calls it with the expectation of getting `true` today.

function parseBooleanEnv(value: string | undefined | null): boolean | null {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function readFlag(name: string, env: NodeJS.ProcessEnv): boolean {
  const parsed = parseBooleanEnv(env[name]);
  return parsed ?? false;
}

export function isMarketIndexWriteEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return readFlag("MARKET_INDEX_WRITE_ENABLED", env);
}

export function isMarketIndexReadEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return readFlag("MARKET_INDEX_READ_ENABLED", env);
}

export function isMarketIndexObservationsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return readFlag("MARKET_INDEX_OBSERVATIONS_ENABLED", env);
}

export function isMarketIndexClusteringEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return readFlag("MARKET_INDEX_CLUSTERING_ENABLED", env);
}

export const MARKET_INDEX_FEATURE_FLAG_NAMES = [
  "MARKET_INDEX_WRITE_ENABLED",
  "MARKET_INDEX_READ_ENABLED",
  "MARKET_INDEX_OBSERVATIONS_ENABLED",
  "MARKET_INDEX_CLUSTERING_ENABLED",
] as const;
