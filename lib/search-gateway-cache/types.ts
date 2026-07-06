import type { SearchGatewayNormalizedResult, SearchGatewayRouteResponse } from "@/lib/search-gateway/search-gateway-types";

export const SEARCH_GATEWAY_CACHE_VERSION = "v1";
export const SEARCH_GATEWAY_CACHE_PROVIDER = "serper";

export type SearchGatewayCacheStatus =
  | "hit"
  | "miss"
  | "stale"
  | "bypass"
  | "error";

export type SearchGatewayProviderIssueClassification =
  | "zero_results"
  | "provider_error"
  | "quota_or_auth_possible"
  | "parser_empty"
  | "unknown";

export interface SearchGatewayCachePolicy {
  ttl_ms: number;
  stale_max_age_ms: number;
}

export interface SearchGatewayCacheContext {
  provider: string;
  query?: string;
  city?: string;
  property_type?: string;
  transaction_type?: string;
  page?: number;
  locale?: string;
}

export interface SearchGatewayCachedResult
  extends Omit<
    SearchGatewayNormalizedResult,
    "thumbnail_url" | "thumbnail_provider_name"
  > {
  source_host: string;
  normalized_city?: string;
  normalized_property_type?: string;
  normalized_transaction_type?: string;
}

export interface SearchGatewayCachedResponse
  extends Omit<SearchGatewayRouteResponse, "results"> {
  results: SearchGatewayCachedResult[];
}

export interface SearchGatewayCacheEntry {
  cache_key: string;
  query: string;
  provider: string;
  request_hash: string;
  response_json: SearchGatewayCachedResponse;
  result_count: number;
  created_at: string;
  expires_at: string;
  stale_until: string;
  last_hit_at?: string | null;
  hit_count: number;
}

export interface SearchGatewayCacheHit {
  status: "hit";
  entry: SearchGatewayCacheEntry;
  age_seconds: number;
}

export interface SearchGatewayCacheMiss {
  status: "miss";
}

export interface SearchGatewayCacheStale {
  status: "stale";
  entry: SearchGatewayCacheEntry;
  age_seconds: number;
}

export interface SearchGatewayCacheBypass {
  status: "bypass";
  reason: string;
}

export interface SearchGatewayCacheError {
  status: "error";
  reason: string;
}

export type SearchGatewayCacheLookupResult =
  | SearchGatewayCacheHit
  | SearchGatewayCacheMiss
  | SearchGatewayCacheStale
  | SearchGatewayCacheBypass
  | SearchGatewayCacheError;

export interface SearchGatewayCacheStore {
  readFresh(cacheKey: string, now?: Date): Promise<SearchGatewayCacheLookupResult>;
  readStale(cacheKey: string, now?: Date): Promise<SearchGatewayCacheLookupResult>;
  write(entry: SearchGatewayCacheEntry): Promise<void>;
  recordHit(entry: SearchGatewayCacheEntry, hitAt?: Date): Promise<void>;
}

export interface SearchGatewayCacheMetadata {
  status: SearchGatewayCacheStatus;
  provider: string;
  age_seconds?: number;
  provider_issue_classification?: SearchGatewayProviderIssueClassification;
}
