import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

type FlagState = "true" | "false";

export type ThirdPartyIngestionGuardOptions = {
  scriptName: string;
  requireNightlyFlag?: boolean;
  requireMubawabExpansionFlag?: boolean;
};

export type ThirdPartyIngestionGuardResult = {
  blocked: boolean;
  message: string;
  thirdPartyEnabled: boolean;
  nightlyEnabled: boolean;
  mubawabExpansionEnabled: boolean;
};

let didLoadLocalEnv = false;

export function loadLocalEnvOnce(): void {
  if (didLoadLocalEnv) return;
  didLoadLocalEnv = true;

  const envFile = join(process.cwd(), ".env.local");
  if (!existsSync(envFile)) return;

  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const match = line.match(/^([^#\s][^=]*)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim();
    }
  }
}

function readFlag(name: string, defaultState: FlagState = "false"): boolean {
  loadLocalEnvOnce();
  const value = process.env[name];
  if (value == null || value === "") return defaultState === "true";
  return value === "true";
}

export function isThirdPartyDbIngestionEnabled(): boolean {
  return readFlag("THIRD_PARTY_DB_INGESTION_ENABLED", "false");
}

export function isNightlyIngestionEnabled(): boolean {
  return readFlag("NIGHTLY_INGESTION_ENABLED", "false");
}

export function isMubawabExpansionEnabled(): boolean {
  return readFlag("MUBAWAB_EXPANSION_ENABLED", "false");
}

export function getThirdPartyIngestionGuard(
  options: ThirdPartyIngestionGuardOptions
): ThirdPartyIngestionGuardResult {
  const thirdPartyEnabled = isThirdPartyDbIngestionEnabled();
  const nightlyEnabled = isNightlyIngestionEnabled();
  const mubawabExpansionEnabled = isMubawabExpansionEnabled();

  const requiredFlags = ["THIRD_PARTY_DB_INGESTION_ENABLED=true"];
  if (options.requireNightlyFlag) requiredFlags.push("NIGHTLY_INGESTION_ENABLED=true");
  if (options.requireMubawabExpansionFlag) {
    requiredFlags.push("MUBAWAB_EXPANSION_ENABLED=true");
  }

  let blocked = !thirdPartyEnabled;
  if (options.requireNightlyFlag) blocked = blocked || !nightlyEnabled;
  if (options.requireMubawabExpansionFlag) blocked = blocked || !mubawabExpansionEnabled;

  return {
    blocked,
    message: blocked
      ? `blocked by motor purity / third-party ingestion disabled (${options.scriptName}; requires ${requiredFlags.join(", ")})`
      : `[motor-purity] ${options.scriptName} explicitly allowed`,
    thirdPartyEnabled,
    nightlyEnabled,
    mubawabExpansionEnabled,
  };
}

export function printBlockedSummary(): void {
  console.log("  0 listing created");
  console.log("  0 listing updated");
  console.log("  0 sync launched");
}
