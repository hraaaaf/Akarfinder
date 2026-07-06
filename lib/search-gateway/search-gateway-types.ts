// SEARCH-GATEWAY-MULTISOURCE-SERP-1A
// Type definitions for multi-source Search Gateway

export type SearchGatewaySourceConfig = {
  source_id: string;
  source_name: string;
  domain: string;
  enabled: boolean;
  query_mode: "search_api_only" | "db_primary_search_api_complement";
  default_result_origin: "search_api";
  default_display_mode: "thin_indexed_result";
  source_badge: "external_indexed" | "public_indexed";
  original_link_required: true;
  thumbnail_policy: "provider_optional";
  thumbnail_risk_accepted: boolean;
  notes: string;
};

export type SearchGatewayQueryInput = {
  q?: string;
  city?: string;
  property_type?: string;
  intent?: string;
  sources?: string[];
  max_results_per_source?: number;
};

export type SearchGatewayQuery = {
  source_id: string;
  query: string;
  max_results: number;
};

export type SearchGatewayRawResult = {
  title?: string;
  snippet?: string;
  link?: string;
  url?: string;
  displayLink?: string;
  display_url?: string;
  // Serper organic results include a provider-served thumbnail (Google-cached).
  // Use only when thumbnail_risk_accepted=true and the feature flag is enabled.
  imageUrl?: string;
};

export type SearchGatewayNormalizedResult = {
  id: string;
  title: string;
  snippet?: string;
  original_url: string;
  display_url: string;
  source_id: string;
  source_name: string;
  domain: string;
  result_origin: "search_api";
  search_result_display_mode: string;
  source_badge: string;
  production_allowed: boolean;
  can_show_result: boolean;
  can_show_thumbnail: boolean;
  can_show_contact: boolean;
  can_show_gallery: boolean;
  can_cache_thumbnail: false;
  can_download_thumbnail: false;
  primary_cta: "view_original";
  primary_cta_label: string;
  result_attribution_label: string;
  thumbnail_url?: string;
  thumbnail_provider_name?: string;
  thumbnail_risk_accepted: boolean;
};

export type SearchGatewayRouteResponse = {
  ok: boolean;
  degraded: boolean;
  reason?: string;
  provider?: string;
  sources_queried: string[];
  results_count: number;
  results: SearchGatewayNormalizedResult[];
  cache?: {
    status: "hit" | "miss" | "stale" | "bypass" | "error";
    provider: string;
    age_seconds?: number;
    provider_issue_classification?:
      | "zero_results"
      | "provider_error"
      | "quota_or_auth_possible"
      | "parser_empty"
      | "unknown";
  };
};
