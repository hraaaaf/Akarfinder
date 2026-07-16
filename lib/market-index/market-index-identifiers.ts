// AKARFINDER-MARKET-INDEX-FOUNDATION-1 — idempotency key computation.
// See docs/MARKET_INDEX_DATA_MODEL.md "Comment evite-t-on les doublons
// techniques" for the rationale behind each key. These functions only ever
// COMPUTE a key from inputs already at hand -- they never fetch a URL, never
// call a network resource, never invent a value when the input is missing.

import { createHash } from "node:crypto";

function sha256(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

// Strips common tracking params and the fragment so the same listing found
// via two different marketing links normalizes to one canonical form.
const TRACKING_PARAM_PREFIXES = ["utm_", "fbclid", "gclid", "ref", "source"];

export function canonicalizeUrl(rawUrl: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }
  const params = new URLSearchParams(parsed.search);
  for (const key of [...params.keys()]) {
    if (TRACKING_PARAM_PREFIXES.some((prefix) => key.toLowerCase().startsWith(prefix))) {
      params.delete(key);
    }
  }
  parsed.hash = "";
  const sortedParams = new URLSearchParams([...params.entries()].sort(([a], [b]) => a.localeCompare(b)));
  const query = sortedParams.toString();
  return `${parsed.origin}${parsed.pathname}${query ? `?${query}` : ""}`;
}

export function computeCanonicalUrlHash(rawUrl: string): string | null {
  const canonical = canonicalizeUrl(rawUrl);
  if (!canonical) return null;
  return sha256(canonical.toLowerCase());
}

export function computeQueryHash(provider: string, query: string | null | undefined): string {
  return sha256(`${provider}::${(query ?? "").trim().toLowerCase()}`);
}

export function computeDiscoveryCandidateIdempotencyKey(input: {
  provider: string;
  queryHash: string;
  canonicalUrl: string | null;
}): string | null {
  if (!input.canonicalUrl) return null;
  return sha256(`${input.provider}::${input.queryHash}::${input.canonicalUrl.toLowerCase()}`);
}

export function computeSourceOfferIdentity(input: {
  sourceName: string;
  sourceOfferKey: string | null;
  sourceUrl: string;
}): { key: string; basis: "source_offer_key" | "canonical_url_hash" } {
  const sourceName = input.sourceName.toLowerCase().trim();
  if (input.sourceOfferKey) {
    return { key: `${sourceName}::${input.sourceOfferKey}`, basis: "source_offer_key" };
  }
  const hash = computeCanonicalUrlHash(input.sourceUrl) ?? sha256(input.sourceUrl.toLowerCase());
  return { key: `${sourceName}::${hash}`, basis: "canonical_url_hash" };
}

export function computeContentFingerprint(title: string | null, description: string | null): string {
  const normalized = `${(title ?? "").trim().toLowerCase()}::${(description ?? "").trim().toLowerCase()}`;
  return sha256(normalized);
}

// Truncates an ISO timestamp to the hour, matching the DB's
// observed_at_bucket generated column (date_trunc('hour', observed_at)).
export function computeObservedAtBucket(observedAtIso: string): string {
  const date = new Date(observedAtIso);
  date.setUTCMinutes(0, 0, 0);
  return date.toISOString();
}

export function computeObservationIdempotencyKey(input: {
  sourceOfferId: number;
  observedAtIso: string;
  contentFingerprint: string;
}): string {
  const bucket = computeObservedAtBucket(input.observedAtIso);
  return sha256(`${input.sourceOfferId}::${bucket}::${input.contentFingerprint}`);
}
