import type { SearchGatewayCacheContext, SearchGatewayCachePolicy } from "./types";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export const DEFAULT_SEARCH_GATEWAY_CACHE_TTL_MS = 12 * HOUR_MS;
export const DEFAULT_SEARCH_GATEWAY_CACHE_STALE_MAX_AGE_MS = 7 * DAY_MS;

export function getSearchGatewayCachePolicy(
  _context: SearchGatewayCacheContext,
): SearchGatewayCachePolicy {
  return {
    ttl_ms: DEFAULT_SEARCH_GATEWAY_CACHE_TTL_MS,
    stale_max_age_ms: DEFAULT_SEARCH_GATEWAY_CACHE_STALE_MAX_AGE_MS,
  };
}

export function buildSearchGatewayCacheExpiry(
  now: Date,
  policy: SearchGatewayCachePolicy,
): { expiresAt: Date; staleUntil: Date } {
  return {
    expiresAt: new Date(now.getTime() + policy.ttl_ms),
    staleUntil: new Date(now.getTime() + policy.stale_max_age_ms),
  };
}
