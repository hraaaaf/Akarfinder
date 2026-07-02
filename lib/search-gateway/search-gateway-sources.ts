// SEARCH-GATEWAY-MULTISOURCE-SERP-1A
// Source configuration for Search Gateway

import type { SearchGatewaySourceConfig } from "./search-gateway-types";

const SEARCH_GATEWAY_SOURCES: Record<string, SearchGatewaySourceConfig> = {
  avito_serper: {
    source_id: "avito_serper",
    source_name: "Avito",
    domain: "avito.ma",
    enabled: true,
    query_mode: "search_api_only",
    default_result_origin: "search_api",
    default_display_mode: "thin_indexed_result",
    source_badge: "external_indexed",
    original_link_required: true,
    thumbnail_policy: "provider_optional",
    thumbnail_risk_accepted: true,
    notes: "Direct crawl blocked (403). Search API only for market intelligence.",
  },
  sarouty_serper: {
    source_id: "sarouty_serper",
    source_name: "Sarouty",
    domain: "sarouty.ma",
    enabled: true,
    query_mode: "search_api_only",
    default_result_origin: "search_api",
    default_display_mode: "thin_indexed_result",
    source_badge: "external_indexed",
    original_link_required: true,
    thumbnail_policy: "provider_optional",
    thumbnail_risk_accepted: true,
    notes: "Search API only for market intelligence. DB legacy data remains frozen.",
  },
  yakeey: {
    source_id: "yakeey",
    source_name: "Yakeey",
    domain: "yakeey.com",
    enabled: true,
    query_mode: "search_api_only",
    default_result_origin: "search_api",
    default_display_mode: "thin_indexed_result",
    source_badge: "external_indexed",
    original_link_required: true,
    thumbnail_policy: "provider_optional",
    thumbnail_risk_accepted: true,
    notes: "Challenge-platform detected in direct audit. Search API only.",
  },
  agenz: {
    source_id: "agenz",
    source_name: "Agenz",
    domain: "agenz.ma",
    enabled: true,
    query_mode: "search_api_only",
    default_result_origin: "search_api",
    default_display_mode: "thin_indexed_result",
    source_badge: "external_indexed",
    original_link_required: true,
    thumbnail_policy: "provider_optional",
    thumbnail_risk_accepted: true,
    notes: "Policy review required for production full indexed mode.",
  },
  "logic-immo": {
    source_id: "logic-immo",
    source_name: "Logic-Immo",
    domain: "logic-immo.ma",
    enabled: true,
    query_mode: "search_api_only",
    default_result_origin: "search_api",
    default_display_mode: "thin_indexed_result",
    source_badge: "external_indexed",
    original_link_required: true,
    thumbnail_policy: "provider_optional",
    thumbnail_risk_accepted: true,
    notes: "Integrated real estate search platform.",
  },
  mubawab_serper: {
    source_id: "mubawab_serper",
    source_name: "Mubawab",
    domain: "mubawab.ma",
    enabled: true,
    query_mode: "search_api_only",
    default_result_origin: "search_api",
    default_display_mode: "thin_indexed_result",
    source_badge: "public_indexed",
    original_link_required: true,
    thumbnail_policy: "provider_optional",
    thumbnail_risk_accepted: true,
    notes: "Search API only for market intelligence. DB legacy data remains frozen.",
  },
};

export function getSearchGatewaySources(): Record<
  string,
  SearchGatewaySourceConfig
> {
  return SEARCH_GATEWAY_SOURCES;
}

export function getEnabledSearchGatewaySources(): SearchGatewaySourceConfig[] {
  return Object.values(SEARCH_GATEWAY_SOURCES).filter((s) => s.enabled);
}

export function getSearchGatewaySourceById(
  sourceId: string
): SearchGatewaySourceConfig | null {
  return SEARCH_GATEWAY_SOURCES[sourceId.toLowerCase()] ?? null;
}
