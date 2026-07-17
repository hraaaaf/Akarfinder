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

// AKARFINDER-MARKET-INDEX-CONTROLLED-BACKFILL-1 — deterministic UUIDv5 (RFC
// 4122) generation for legacy backfill IDs. Same run-id/property_listing_id
// input always produces the same UUID -- no randomness, no invented value.
// Namespace: the standard RFC 4122 "DNS" namespace UUID
// (6ba7b810-9dad-11d1-80b4-00c04fd430c8), used generically since this project
// does not maintain its own registered UUID namespace. The version string is
// folded into the "name" component passed to the hash, per the mission's own
// example notation (UUIDv5("market-index-legacy-cluster-v1:" + id)).
const RFC4122_DNS_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

function uuidv5(name: string, namespaceUuid: string = RFC4122_DNS_NAMESPACE): string {
  const namespaceBytes = Buffer.from(namespaceUuid.replace(/-/g, ""), "hex");
  const nameBytes = Buffer.from(name, "utf8");
  const hash = createHash("sha1").update(Buffer.concat([namespaceBytes, nameBytes])).digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant RFC 4122
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export const MARKET_INDEX_LEGACY_CLUSTER_NAMESPACE_VERSION = "market-index-legacy-cluster-v1";
export const MARKET_INDEX_LEGACY_MEMBERSHIP_NAMESPACE_VERSION = "market-index-legacy-membership-v1";

export function computeLegacyClusterId(propertyListingId: number): string {
  return uuidv5(`${MARKET_INDEX_LEGACY_CLUSTER_NAMESPACE_VERSION}:${propertyListingId}`);
}

export function computeLegacyMembershipId(listingSourceId: number): string {
  return uuidv5(`${MARKET_INDEX_LEGACY_MEMBERSHIP_NAMESPACE_VERSION}:${listingSourceId}`);
}
