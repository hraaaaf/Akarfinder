import type { OpenSerpEngine } from "./types";

export const DEFAULT_ALLOWED_OPEN_SERP_ENGINES = ["bing", "ecosia"] as const;

export function normalizeAllowedOpenSerpEngines(value?: string | null): OpenSerpEngine[] {
  const allowed = (value ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  if (allowed.length === 0) return [...DEFAULT_ALLOWED_OPEN_SERP_ENGINES];

  return allowed.filter((engine): engine is Exclude<OpenSerpEngine, "google"> => engine === "bing" || engine === "ecosia");
}

export function isOpenSerpEngineAllowed(
  engine: string,
  allowedEngines: readonly OpenSerpEngine[] = DEFAULT_ALLOWED_OPEN_SERP_ENGINES,
): engine is Exclude<OpenSerpEngine, "google"> {
  return (engine === "bing" || engine === "ecosia") && allowedEngines.includes(engine as Exclude<OpenSerpEngine, "google">);
}

export function isOpenSerpAsyncFeederEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return (
    env.PUBLIC_INDEX_POC_ENABLED === "true" &&
    env.OPENSERP_ASYNC_FEEDER_ENABLED === "true" &&
    typeof env.OPENSERP_LOCAL_URL === "string" &&
    env.OPENSERP_LOCAL_URL.trim().length > 0
  );
}

export function canCallOpenSerpAsync(env: NodeJS.ProcessEnv = process.env, engine?: string): boolean {
  if (!isOpenSerpAsyncFeederEnabled(env)) return false;
  const allowed = normalizeAllowedOpenSerpEngines(env.OPENSERP_ALLOWED_ENGINES);
  if (!engine) return false;
  return isOpenSerpEngineAllowed(engine, allowed);
}

export function assertOpenSerpEngineAllowed(engine: string, env: NodeJS.ProcessEnv = process.env): void {
  if (engine === "google") {
    throw new Error("Google is disabled for OpenSERP async POC V1");
  }
  if (!canCallOpenSerpAsync(env, engine)) {
    throw new Error(`OpenSERP async is disabled for engine: ${engine}`);
  }
}
