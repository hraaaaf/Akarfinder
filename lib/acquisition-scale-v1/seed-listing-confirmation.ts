// SEED-LISTING-MASS-CONVERSION-V1
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

const URL_STOP_WORDS = new Set([
  "www", "http", "https", "html", "htm", "php", "index", "property", "properties",
  "annonce", "annonces", "immobilier", "real", "estate", "detail", "details", "fr", "en", "ar",
]);

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

export function buildSeedConfirmationQuery(seed: Pick<SeedConfirmationSeed, "canonical_url" | "source_domain">): string {
  const tokens = safeDecodedPath(seed.canonical_url)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !URL_STOP_WORDS.has(token))
    .slice(-10);

  // Keep the domain explicit inside q because the native OpenSERP HTTP client
  // does not expose a separate site= parameter. Search engines may ignore the
  // operator, but exact canonical matching below remains authoritative.
  const terms = tokens.length >= 2 ? tokens.join(" ") : `"${seed.canonical_url}"`;
  return `site:${seed.source_domain} ${terms}`;
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

  // No query-context fallback is allowed in this lane. These three values must
  // be explicit in the engine result/URL itself, otherwise the seed remains
  // seed_only and is retried later rather than promoted on inference.
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
    query_family: "seed_confirmation",
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

export function selectBalancedSeedBatch(seeds: SeedConfirmationSeed[], batchSize: number): SeedConfirmationSeed[] {
  const size = Math.max(1, Math.min(Math.trunc(batchSize), 100));
  const byDomain = new Map<string, SeedConfirmationSeed[]>();
  for (const seed of seeds) {
    const bucket = byDomain.get(seed.source_domain) ?? [];
    bucket.push(seed);
    byDomain.set(seed.source_domain, bucket);
  }
  for (const bucket of byDomain.values()) {
    bucket.sort((a, b) => geoPriority(a.canonical_url) - geoPriority(b.canonical_url) || a.updated_at.localeCompare(b.updated_at));
  }

  const domains = [...byDomain.keys()].sort((a, b) => {
    const aFirst = byDomain.get(a)?.[0];
    const bFirst = byDomain.get(b)?.[0];
    return geoPriority(aFirst?.canonical_url ?? "") - geoPriority(bFirst?.canonical_url ?? "") || a.localeCompare(b);
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
