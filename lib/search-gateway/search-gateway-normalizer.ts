// SEARCH-GATEWAY-MULTISOURCE-SERP-1A
// Normalize raw Search API results to safe SearchGatewayNormalizedResult
// REAL-LISTINGS-ONLY-1: live provider observation never grants publication.

import type {
  SearchGatewayRawResult,
  SearchGatewayNormalizedResult,
} from "./search-gateway-types";
import { getSearchGatewaySourceById } from "./search-gateway-sources";
import { isRealEstateGatewayResult } from "./search-gateway-real-estate-filter";

const RISKY_SNIPPET_CLAIMS: ReadonlyArray<string> = [
  "verified",
  "confidence",
  "exclusive listing",
  "certified",
  "official",
  "vérifié",
  "vérifiée",
  "certifié",
  "certifiée",
  "fiable",
];

const NEUTRAL_SNIPPET =
  "Aperçu limité. Consultez la source originale pour vérifier les informations.";

export function neutralizeRiskySnippet(
  snippet: string | undefined
): string | undefined {
  if (!snippet) return snippet;
  const lower = snippet.toLowerCase();
  const hasRiskyClaim = RISKY_SNIPPET_CLAIMS.some((term) => lower.includes(term));
  return hasRiskyClaim ? NEUTRAL_SNIPPET : snippet;
}

export function normalizeSearchGatewayResult(
  raw: SearchGatewayRawResult,
  sourceId: string
): SearchGatewayNormalizedResult | null {
  const sourceConfig = getSearchGatewaySourceById(sourceId);
  if (!sourceConfig) return null;

  const title = (raw.title ?? "").trim();
  if (!title) return null;

  const originalUrl = (raw.link ?? raw.url ?? "").trim();
  if (!originalUrl) return null;

  try {
    const url = new URL(originalUrl);
    if (!url.hostname.includes(sourceConfig.domain)) return null;
  } catch {
    return null;
  }

  const snippet = (raw.snippet ?? "").trim();
  if (!isRealEstateGatewayResult(title, snippet || undefined, originalUrl)) return null;

  let displayUrl = originalUrl;
  try {
    const url = new URL(originalUrl);
    displayUrl = url.hostname + (url.pathname.length > 1 ? url.pathname : "");
  } catch {
    // Keep original URL for attribution only.
  }

  const id = `gateway_${sourceId}_${hashString(originalUrl)}`;

  // Search-provider observations remain intelligence-only until the live Source
  // Policy Registry explicitly authorizes their public display. Thumbnails are
  // therefore also fail-closed here.
  return {
    id,
    title,
    snippet: neutralizeRiskySnippet(snippet || undefined),
    original_url: originalUrl,
    display_url: displayUrl,
    source_id: sourceConfig.source_id,
    source_name: sourceConfig.source_name,
    domain: sourceConfig.domain,
    result_origin: "search_api",
    search_result_display_mode: "thin_indexed_result",
    source_badge: sourceConfig.source_badge,
    production_allowed: false,
    can_show_result: false,
    can_show_thumbnail: false,
    can_show_contact: false,
    can_show_gallery: false,
    can_cache_thumbnail: false,
    can_download_thumbnail: false,
    primary_cta: "view_original",
    primary_cta_label: `Voir sur ${sourceConfig.source_name}`,
    result_attribution_label: "Signal web externe — non publié",
    thumbnail_url: undefined,
    thumbnail_provider_name: undefined,
    thumbnail_risk_accepted: false,
  };
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}
