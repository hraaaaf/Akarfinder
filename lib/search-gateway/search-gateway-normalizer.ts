// SEARCH-GATEWAY-MULTISOURCE-SERP-1A
// Normalize raw Search API results to safe SearchGatewayNormalizedResult

import type {
  SearchGatewayRawResult,
  SearchGatewayNormalizedResult,
} from "./search-gateway-types";
import { getSearchGatewaySourceById } from "./search-gateway-sources";
import { isRealEstateGatewayResult } from "./search-gateway-real-estate-filter";

// SERP-RESULT-QUALITY-DEGROUPING-1 — external snippets must never carry a
// claim that could read as an AkarFinder-issued validation. If found, the
// snippet is replaced with a neutral, non-committal sentence rather than
// risk showing "verified"/"certified"/"confidence" style marketing copy.
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

  // Title is mandatory
  const title = (raw.title ?? "").trim();
  if (!title) return null;

  // Original URL is mandatory
  const originalUrl = (raw.link ?? raw.url ?? "").trim();
  if (!originalUrl) return null;

  // Verify URL belongs to the source domain
  try {
    const url = new URL(originalUrl);
    if (!url.hostname.includes(sourceConfig.domain)) {
      return null;
    }
  } catch {
    return null;
  }

  // Real-estate-only filter — reject vehicle listings (Avito cars, etc.)
  const snippet = (raw.snippet ?? "").trim();
  if (!isRealEstateGatewayResult(title, snippet || undefined, originalUrl)) {
    return null;
  }

  // Display URL (host + path)
  let displayUrl = originalUrl;
  try {
    const url = new URL(originalUrl);
    displayUrl = url.hostname + (url.pathname.length > 1 ? url.pathname : "");
  } catch {
    // fallback to original URL
  }

  // Generate unique ID from URL hash
  const id = `gateway_${sourceId}_${hashString(originalUrl)}`;

  // Thumbnails — provider-served (Google-cached) images from Serper.
  // Gated by: feature flag + source thumbnail_risk_accepted + non-empty imageUrl.
  // Never downloaded/cached/proxied — raw remote URL only.
  const thumbnailsEnabled =
    process.env.NEXT_PUBLIC_SEARCH_GATEWAY_THUMBNAILS_ENABLED === "true";
  const rawThumbnail = (raw.imageUrl ?? "").trim();
  const canShowThumbnail =
    thumbnailsEnabled && sourceConfig.thumbnail_risk_accepted && !!rawThumbnail;
  const thumbnailUrl = canShowThumbnail ? rawThumbnail : undefined;

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
    production_allowed: true, // TODO: read from env flags
    can_show_result: true,
    can_show_thumbnail: canShowThumbnail,
    can_show_contact: false, // Always false for external sources
    can_show_gallery: false, // Always false for external sources
    can_cache_thumbnail: false, // Never cache third-party images
    can_download_thumbnail: false, // Never download third-party images
    primary_cta: "view_original",
    primary_cta_label: `Voir sur ${sourceConfig.source_name}`,
    result_attribution_label: "Résultat web externe",
    thumbnail_url: thumbnailUrl,
    thumbnail_provider_name: undefined,
    thumbnail_risk_accepted: sourceConfig.thumbnail_risk_accepted,
  };
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}
