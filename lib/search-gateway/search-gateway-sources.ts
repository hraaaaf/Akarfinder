// SEARCH-GATEWAY-MULTISOURCE-SERP-1A
// Source configuration for Search Gateway

import type { SearchGatewaySourceConfig } from "./search-gateway-types";

const SEARCH_GATEWAY_SOURCES: Record<string, SearchGatewaySourceConfig> = {
  avito: {
    source_id: "avito",
    source_name: "Avito",
    domain: "avito.ma",
    enabled: true,
    query_mode: "search_api_only",
    default_result_origin: "search_api",
    default_display_mode: "thin_indexed_result",
    source_badge: "external_indexed",
    original_link_required: true,
    thumbnail_policy: "provider_optional",
    thumbnail_risk_accepted: false,
    notes: "Direct crawl blocked (403). Search API only for market intelligence.",
  },
  sarouty: {
    source_id: "sarouty",
    source_name: "Sarouty",
    domain: "sarouty.ma",
    enabled: true,
    query_mode: "search_api_only",
    default_result_origin: "search_api",
    default_display_mode: "thin_indexed_result",
    source_badge: "external_indexed",
    original_link_required: true,
    thumbnail_policy: "provider_optional",
    thumbnail_risk_accepted: false,
    notes: "Platform-independent listings aggregation.",
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
    thumbnail_risk_accepted: false,
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
    thumbnail_risk_accepted: false,
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
    thumbnail_risk_accepted: false,
    notes: "Integrated real estate search platform.",
  },
  mubawab: {
    source_id: "mubawab",
    source_name: "Mubawab",
    domain: "mubawab.ma",
    enabled: true,
    query_mode: "db_primary_search_api_complement",
    default_result_origin: "search_api",
    default_display_mode: "thin_indexed_result",
    source_badge: "public_indexed",
    original_link_required: true,
    thumbnail_policy: "provider_optional",
    thumbnail_risk_accepted: false,
    notes: "DB structured results remain primary. Search API for complementary coverage.",
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
