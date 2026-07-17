// AKARFINDER-OPENSERP-AUTOMATED-INGESTION-30MIN-1 — section 12.
// A discovered result may only ever become a public listing if its source
// domain is explicitly present here with an admitting status. Any domain not
// found defaults to "unclassified" and is structurally blocked from
// admission (see national-admission.ts) — never silently allowed through.

import { readFileSync } from "node:fs";
import { join } from "node:path";

export type SourceDomainStatus =
  | "approved_discovery"
  | "partner"
  | "authorized_static"
  | "blocked"
  | "rejected_non_real_estate"
  | "unclassified";

export type SourceDomainEntry = {
  domain: string;
  status: SourceDomainStatus;
  listing_url_patterns: string[];
  blocked_url_patterns: string[];
  source_type: string;
  external_web_result: boolean;
  compliance_note: string;
  reviewed_at: string;
};

export type SourceDomainRegistry = {
  registry_version: string;
  generated_at: string;
  note: string;
  domains: SourceDomainEntry[];
};

// Statuses that permit a result to become a public, admitted listing.
// "unclassified"/"blocked"/"rejected_non_real_estate" never admit.
const ADMITTING_STATUSES: ReadonlySet<SourceDomainStatus> = new Set([
  "approved_discovery",
  "partner",
  "authorized_static",
]);

let cachedRegistry: SourceDomainRegistry | null = null;

export function loadSourceDomainRegistry(path?: string): SourceDomainRegistry {
  if (cachedRegistry && !path) return cachedRegistry;
  const registryPath = path ?? join(process.cwd(), "data/openserp/source-domain-registry.json");
  const parsed = JSON.parse(readFileSync(registryPath, "utf8")) as SourceDomainRegistry;
  if (!path) cachedRegistry = parsed;
  return parsed;
}

export function getDomainEntry(domain: string, registry?: SourceDomainRegistry): SourceDomainEntry | null {
  const reg = registry ?? loadSourceDomainRegistry();
  const normalized = domain.toLowerCase().trim();
  return reg.domains.find((entry) => entry.domain === normalized) ?? null;
}

export function getDomainStatus(domain: string, registry?: SourceDomainRegistry): SourceDomainStatus {
  return getDomainEntry(domain, registry)?.status ?? "unclassified";
}

export function isDomainAdmissible(domain: string, registry?: SourceDomainRegistry): boolean {
  return ADMITTING_STATUSES.has(getDomainStatus(domain, registry));
}

export function isDomainExternalWebResult(domain: string, registry?: SourceDomainRegistry): boolean {
  return getDomainEntry(domain, registry)?.external_web_result ?? false;
}
