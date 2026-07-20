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

// OPENSERP-REGISTRY-PATTERN-SOURCE-OF-TRUTH-1: a pattern entry stays a
// plain string for the common case (case-sensitive, matching every
// existing domain's classify.ts behavior at migration time except the two
// noted below). A small number of domains' classify.ts DOMAIN_RULES used
// a case-insensitive regex (the /i flag) -- since a bare JSON string
// cannot carry regex flags, those specific entries use the object form
// instead, to migrate the exact prior behavior with zero drift rather
// than silently making every pattern case-insensitive (which could admit
// URLs a domain's original, deliberately case-sensitive pattern never
// would have).
export type ListingUrlPatternEntry = string | { pattern: string; case_insensitive?: boolean };

export type SourceDomainEntry = {
  domain: string;
  status: SourceDomainStatus;
  listing_url_patterns: ListingUrlPatternEntry[];
  blocked_url_patterns: string[];
  source_type: string;
  external_web_result: boolean;
  compliance_note: string;
  reviewed_at: string;
  // OPENSERP-QUERY-UNIVERSE-REGIONAL-DOMAIN-CITY-SCOPING-1: null/absent =
  // national (site:<domain> queries generated for every TIER_1_CITIES
  // city, the existing behavior). A non-empty list restricts site:<domain>
  // query generation to exactly these cities instead -- may contain a city
  // outside TIER_1_CITIES (e.g. "Essaouira"), consumed as-is by
  // build-query-universe.ts with no membership check against TIER_1_CITIES.
  // Read only by the query-universe builder; does not affect admission,
  // classify.ts, or any other domain-registry consumer.
  coverage_cities?: string[] | null;
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

// OPENSERP-REGISTRY-PATTERN-SOURCE-OF-TRUTH-1 — makes source-domain-
// registry.json's listing_url_patterns the single, functionally-enforced
// source of truth for "does this URL path look like an individual
// listing on this domain", replacing the parallel hardcoded copies that
// used to live in classify.ts's DOMAIN_RULES[domain].strongIndividual.
//
// Compiled RegExp objects are cached per (domain, exact pattern list)
// so a hot classification path never re-parses the same regex source on
// every call, while a genuine registry edit (different pattern list)
// naturally invalidates the cache via its own cache key.
const compiledPatternCache = new Map<string, RegExp[]>();

function compilePatternEntry(entry: ListingUrlPatternEntry): RegExp {
  if (typeof entry === "string") return new RegExp(entry);
  return new RegExp(entry.pattern, entry.case_insensitive ? "i" : undefined);
}

// Fail-closed by construction:
//   - unknown domain (no registry entry at all) -> [] -- strongIndividual
//     can never be true for a domain this registry has never heard of,
//     exactly like every other admission gate in this codebase (an
//     unrecognized domain defaults to "unclassified", never auto-approved).
//   - known domain with no configured patterns -> [] -- same effect.
//   - an individual pattern that fails to compile (invalid regex source)
//     is skipped and logged, never thrown -- one bad entry in the JSON
//     file can never crash a cron run, and can never silently degrade
//     into "match everything" (an empty/skipped pattern simply never
//     matches, it does not fall back to `.*`).
export function getListingUrlPatterns(domain: string, registry?: SourceDomainRegistry): RegExp[] {
  const entry = getDomainEntry(domain, registry);
  if (!entry || entry.listing_url_patterns.length === 0) return [];

  const cacheKey = `${entry.domain}::${JSON.stringify(entry.listing_url_patterns)}`;
  const cached = compiledPatternCache.get(cacheKey);
  if (cached) return cached;

  const compiled: RegExp[] = [];
  for (const raw of entry.listing_url_patterns) {
    try {
      compiled.push(compilePatternEntry(raw));
    } catch (error) {
      console.error(
        `[domain-registry] invalid listing_url_pattern for "${entry.domain}": ${JSON.stringify(raw)} -- ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  compiledPatternCache.set(cacheKey, compiled);
  return compiled;
}
