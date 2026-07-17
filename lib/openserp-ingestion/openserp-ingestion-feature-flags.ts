// AKARFINDER-OPENSERP-AUTOMATED-INGESTION-30MIN-1 — section 18.
// Mirrors lib/market-index/market-index-feature-flags.ts's convention:
// only the literal string "true" enables a flag; anything else (absent,
// "false", malformed) is false. Three independent, least-privilege flags —
// the writer requires BOTH *_ENABLED and *_WRITE_ENABLED; the cron schedule
// requires all three, gated separately so a human always flips WRITE before
// CRON can ever fire unattended.

function parseBooleanEnv(value: string | undefined | null): boolean | null {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function readFlag(name: string, env: NodeJS.ProcessEnv): boolean {
  return parseBooleanEnv(env[name]) ?? false;
}

export function isOpenSerpAutomatedIngestionEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return readFlag("OPENSERP_AUTOMATED_INGESTION_ENABLED", env);
}

export function isOpenSerpIngestionWriteEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return readFlag("OPENSERP_INGESTION_WRITE_ENABLED", env);
}

export function isOpenSerpIngestionCronEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return readFlag("OPENSERP_INGESTION_CRON_ENABLED", env);
}

// The writer may run (bootstrap script or cron handler) only when BOTH the
// master switch and the write-specific switch are true. Never derives this
// from CRON_ENABLED alone -- a manual bootstrap run must work with CRON off.
export function isOpenSerpIngestionWriteAuthorized(env: NodeJS.ProcessEnv = process.env): boolean {
  return isOpenSerpAutomatedIngestionEnabled(env) && isOpenSerpIngestionWriteEnabled(env);
}

// The unattended 30-minute schedule may fire only when all three are true.
export function isOpenSerpIngestionCronAuthorized(env: NodeJS.ProcessEnv = process.env): boolean {
  return isOpenSerpIngestionWriteAuthorized(env) && isOpenSerpIngestionCronEnabled(env);
}

export const OPENSERP_INGESTION_FEATURE_FLAG_NAMES = [
  "OPENSERP_AUTOMATED_INGESTION_ENABLED",
  "OPENSERP_INGESTION_WRITE_ENABLED",
  "OPENSERP_INGESTION_CRON_ENABLED",
] as const;
