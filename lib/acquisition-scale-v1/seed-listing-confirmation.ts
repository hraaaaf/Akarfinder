// SEED-LISTING-MASS-CONVERSION-V1
// SEED-CONFIRMATION-QUERY-V2
// BULK-SEED-CONFIRMATION-V1
// Pure helpers for turning sitemap/Common-Crawl URL seeds into targeted search
// confirmation queries. A seed is never trusted by itself: only an exact
// canonical-URL search-engine hit with explicit city + transaction + property
// type can be passed to the existing national admission gate.

import type { OpenSerpRawResult } from "@/lib/openserp-async/types";
import type { OpenSerpIngestionQuery } from "@/lib/openserp-ingestion/types";
import { extractCityNational, extractDistrictNational } from "@/lib/openserp-ingestion/national-utils";
import {
  canonicalizeSourceUrl,
  normalizeText,
  sha256,
  toPropertyType,
  toTransactionType,
} from "@/lib/openserp-ingestion/utils";

export type SeedConfirmationSeed = {
  id: string;
  canonical_url: string;
  source_domain: string;
  metadata: Record<string, unknown> | null;
  updated_at: string;
};

export type SeedConfirmationDimensions = {
  city: string;
  transaction_type: "sale" | "rent";
  property_type: string;
};

export type SeedConfirmationGroup = {
  group_key: string;
  mode: "bulk" | "individual";
  source_domain: string;
  query_text: string;
  dimensions: SeedConfirmationDimensions | null;
  seeds: SeedConfirmationSeed[];
};

const URL_STOP_WORDS = new Set([
  "www", "http", "https", "html", "htm", "php", "index", "property", "properties",
  "annonce", "annonces", "immobilier", "real", "estate", "detail", "details", "fr", "en", "ar",
]);

const PROPERTY_QUERY_LABELS: Record<string, string> = {
  apartment: "appartement",
  villa: "villa",
  studio: "studio",
  house: "maison",
  land: "terrain",
  office: "bureau",
  commercial: "commerce",
};

function safeDecodedPath(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    try {
      return decodeURIComponent(pathname);
    } catch {
      return pathname;
    }
  } catch {
    return url;
  }
}

export function extractStableSeedIdentifier(url: string): string | null {
  const path = safeDecodedPath(url).toLowerCase();
  const explicitRef = path.match(/(?:^|[^a-z0-9])(?:ref|reference)[-_ ]?(\d{3,})(?:[^a-z0-9]|$)/i);
  if (explicitRef?.[1]) return explicitRef[1];

  const alphaNumericCode = path.match(/(?:^|\/)([a-z]{2,10}-\d{3,})(?:\/|$)/i);
  if (alphaNumericCode?.[1]) return alphaNumericCode[1];

  const segments = path.split("/").filter(Boolean);
  for (let i = segments.length - 1; i >= 0; i -= 1) {
    const clean = segments[i].replace(/\.(?:html?|php)$/i, "");
    if (/^\d{5,}$/.test(clean)) return clean;
  }
  return null;
}

export function isClearlyOutOfScopeSeedUrl(url: string): boolean {
  const normalized = normalizeText(safeDecodedPath(url));
  return (
    /\b(?:location|locations)\b.{0,28}\b(?:vacances|vacation|holiday|saisonniere|saisonnier)\b/.test(normalized)
    || /\b(?:vacances|vacation|holiday)\b.{0,28}\b(?:location|locations|rental)\b/.test(normalized)
  );
}

export function buildSeedConfirmationQuery(seed: Pick<SeedConfirmationSeed, "canonical_url" | "source_domain">): string {
  const stableIdentifier = extractStableSeedIdentifier(seed.canonical_url);
  if (stableIdentifier) return `site:${seed.source_domain} "${stableIdentifier}"`;

  const tokens = safeDecodedPath(seed.canonical_url)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !URL_STOP_WORDS.has(token))
    .slice(-6);

  const terms = tokens.length >= 2 ? tokens.join(" ") : `"${seed.canonical_url}"`;
  return `site:${seed.source_domain} ${terms}`;
}

export function extractSeedConfirmationDimensions(
  seed: Pick<SeedConfirmationSeed, "canonical_url">,
): SeedConfirmationDimensions | null {
  // URL slugs commonly encode intent with separators (e.g. appartement-a-vendre).
  // Normalize separators ONLY for grouping inference; final admission still uses
  // exact SERP evidence and the canonical high-confidence gate.
  const path = safeDecodedPath(seed.canonical_url).replace(/[-_]+/g, " ");
  const city = extractCityNational(path);
  const transaction = toTransactionType(path);
  const propertyType = toPropertyType(path);
  if (!city || !transaction || !propertyType) return null;
  return { city, transaction_type: transaction, property_type: propertyType };
}

export function buildBulkSeedConfirmationQuery(
  sourceDomain: string,
  dimensions: SeedConfirmationDimensions,
): string {
  const transactionLabel = dimensions.transaction_type === "sale" ? "vente" : "location";
  const propertyLabel = PROPERTY_QUERY_LABELS[dimensions.property_type] ?? dimensions.property_type;
  return `site:${sourceDomain} "${dimensions.city}" ${transactionLabel} ${propertyLabel}`;
}

export function buildSeedConfirmationGroups(
  seeds: SeedConfirmationSeed[],
  maxSeedsPerGroup = 25,
): SeedConfirmationGroup[] {
  const groupSize = Math.max(2, Math.min(Math.trunc(maxSeedsPerGroup), 50));
  const bulkBuckets = new Map<string, { source_domain: string; dimensions: SeedConfirmationDimensions; seeds: SeedConfirmationSeed[] }>();
  const individual: SeedConfirmationGroup[] = [];

  for (const seed of seeds) {
    const dimensions = extractSeedConfirmationDimensions(seed);
    if (!dimensions) {
      individual.push({
        group_key: `individual:${seed.id}`,
        mode: "individual",
        source_domain: seed.source_domain,
        query_text: buildSeedConfirmationQuery(seed),
        dimensions: null,
        seeds: [seed],
      });
      continue;
    }
    const key = [seed.source_domain, dimensions.city, dimensions.transaction_type, dimensions.property_type].join("|");
    const bucket = bulkBuckets.get(key) ?? { source_domain: seed.source_domain, dimensions, seeds: [] };
    bucket.seeds.push(seed);
    bulkBuckets.set(key, bucket);
  }

  const bulk: SeedConfirmationGroup[] = [];
  for (const [key, bucket] of bulkBuckets) {
    for (let offset = 0; offset < bucket.seeds.length; offset += groupSize) {
      const chunk = bucket.seeds.slice(offset, offset + groupSize);
      if (chunk.length === 1) {
        const seed = chunk[0];
        individual.push({
          group_key: `individual:${seed.id}`,
          mode: "individual",
          source_domain: seed.source_domain,
          query_text: buildSeedConfirmationQuery(seed),
          dimensions: null,
          seeds: [seed],
        });
        continue;
      }
      bulk.push({
        group_key: `${key}|${Math.floor(offset / groupSize)}`,
        mode: "bulk",
        source_domain: bucket.source_domain,
        query_text: buildBulkSeedConfirmationQuery(bucket.source_domain, bucket.dimensions),
        dimensions: bucket.dimensions,
        seeds: chunk,
      });
    }
  }

  // Bulk groups deliberately run first: they maximize seeds examined per engine
  // request. Individual high-precision fallbacks consume only remaining query budget.
  return [...bulk, ...individual];
}

export function findExactSeedResult(
  seedCanonicalUrl: string,
  results: Array<Pick<OpenSerpRawResult, "url" | "link" | "title" | "snippet" | "rank">>,
): OpenSerpRawResult | null {
  const seedCanonical = canonicalizeSourceUrl(seedCanonicalUrl);
  if (!seedCanonical) return null;
  for (const result of results) {
    const url = result.url ?? result.link;
    if (!url) continue;
    if (canonicalizeSourceUrl(url) === seedCanonical) return result as OpenSerpRawResult;
  }
  return null;
}

export function buildExplicitSeedAdmissionQuery(input: {
  seed: Pick<SeedConfirmationSeed, "canonical_url" | "source_domain">;
  result: Pick<OpenSerpRawResult, "url" | "link" | "title" | "snippet">;
}): OpenSerpIngestionQuery | null {
  const resultUrl = input.result.url ?? input.result.link ?? input.seed.canonical_url;
  const combined = [input.result.title ?? "", input.result.snippet ?? "", resultUrl].filter(Boolean).join(" ");
  const city = extractCityNational(combined);
  const district = extractDistrictNational(combined);
  const transaction = toTransactionType(combined);
  const propertyType = toPropertyType(combined);

  if (!city || !transaction || !propertyType) return null;
  if (district && district.city !== city) return null;

  const canonical = canonicalizeSourceUrl(input.seed.canonical_url);
  if (!canonical) return null;
  return {
    query_id: `seed_confirmation_${sha256(canonical).slice(0, 20)}`,
    city,
    district: district?.district ?? "",
    transaction_type: transaction,
    property_type: propertyType,
    query_text: buildSeedConfirmationQuery(input.seed),
    priority: "high",
    target_domain: input.seed.source_domain,
    query_family: "general",
  };
}

function geoPriority(url: string): number {
  const normalized = normalizeText(url);
  if (/\b(casablanca|casa)\b/.test(normalized)) return 0;
  if (/\b(rabat|tanger|tangier)\b/.test(normalized)) return 1;
  if (/\b(marrakech|marrakesh)\b/.test(normalized)) return 2;
  if (/\b(agadir)\b/.test(normalized)) return 3;
  return 4;
}

function identifierPriority(url: string): number {
  return extractStableSeedIdentifier(url) ? 0 : 1;
}

export function selectBalancedSeedBatch(seeds: SeedConfirmationSeed[], batchSize: number): SeedConfirmationSeed[] {
  const size = Math.max(1, Math.min(Math.trunc(batchSize), 500));
  const byDomain = new Map<string, SeedConfirmationSeed[]>();
  for (const seed of seeds) {
    if (isClearlyOutOfScopeSeedUrl(seed.canonical_url)) continue;
    const bucket = byDomain.get(seed.source_domain) ?? [];
    bucket.push(seed);
    byDomain.set(seed.source_domain, bucket);
  }
  for (const bucket of byDomain.values()) {
    bucket.sort((a, b) =>
      geoPriority(a.canonical_url) - geoPriority(b.canonical_url)
      || identifierPriority(a.canonical_url) - identifierPriority(b.canonical_url)
      || a.updated_at.localeCompare(b.updated_at),
    );
  }

  const domains = [...byDomain.keys()].sort((a, b) => {
    const aFirst = byDomain.get(a)?.[0];
    const bFirst = byDomain.get(b)?.[0];
    return geoPriority(aFirst?.canonical_url ?? "") - geoPriority(bFirst?.canonical_url ?? "")
      || identifierPriority(aFirst?.canonical_url ?? "") - identifierPriority(bFirst?.canonical_url ?? "")
      || a.localeCompare(b);
  });

  const out: SeedConfirmationSeed[] = [];
  let progressed = true;
  while (out.length < size && progressed) {
    progressed = false;
    for (const domain of domains) {
      const next = byDomain.get(domain)?.shift();
      if (!next) continue;
      out.push(next);
      progressed = true;
      if (out.length >= size) break;
    }
  }
  return out;
}
