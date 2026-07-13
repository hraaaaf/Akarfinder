import { inferPublicPropertyIndexAttributes } from "@/lib/public-property-index/normalize-index-record";
import type { OpenSerpRawResult } from "@/lib/openserp-async/types";
import type { OpenSerpClassifiedResult, OpenSerpClassificationLane, OpenSerpIngestionQuery } from "./types";
import {
  canonicalizeSourceUrl,
  extractDomain,
  normalizeText,
  parseBedrooms,
  parsePriceMad,
  parseSurfaceM2,
  redactSensitiveText,
  sha256,
  toPropertyType,
  toTransactionType,
} from "./utils";

const REAL_ESTATE_TOKENS = [
  "appartement",
  "apartment",
  "villa",
  "studio",
  "terrain",
  "bureau",
  "maison",
  "local commercial",
  "immobilier",
  "property",
];

const OUT_OF_SCOPE_TOKENS = [
  "voiture",
  "emploi",
  "hotel",
  "riad touristique",
  "vacances",
  "mobilier",
  "service",
  "actualite",
  "blog",
  "guide",
];

const DISCOVERY_TOKENS = [
  "annonces immobilieres",
  "biens a vendre",
  "appartements a vendre",
  "appartements a louer",
  "villas a vendre",
  "agence immobiliere",
  "immobilier a",
  "page 2",
  "search",
  "category",
  "listing list",
  "plateforme de vente et d achat",
];

function getResultUrl(result: OpenSerpRawResult): string {
  return (result.url ?? result.link ?? "").trim();
}

function getAbsoluteRank(result: OpenSerpRawResult, fallback: number): number {
  return result.position?.absolute ?? result.rank ?? fallback;
}

function classifyLane(text: string, canonicalUrl: string): {
  lane: OpenSerpClassificationLane;
  reasons: string[];
} {
  const reasons: string[] = [];

  if (!REAL_ESTATE_TOKENS.some((token) => text.includes(token))) {
    return { lane: "reject_out_of_scope", reasons: ["missing_real_estate_signal"] };
  }

  if (OUT_OF_SCOPE_TOKENS.some((token) => text.includes(token)) && !text.includes("immobilier")) {
    return { lane: "reject_out_of_scope", reasons: ["out_of_scope_token"] };
  }

  const isDiscovery = DISCOVERY_TOKENS.some((token) => text.includes(token));
  if (isDiscovery) reasons.push("discovery_token");
  if (/\/sp\/immobilier\//.test(canonicalUrl)) reasons.push("search_hub_path");
  if (/\/(?:vente|location)-(?:appartements|villas|bureaux)/.test(canonicalUrl)) reasons.push("category_path");
  if (/\/immobilier-a-vendre\b/.test(canonicalUrl)) reasons.push("category_path");
  if (/\/sp\//.test(canonicalUrl)) reasons.push("search_hub_path");

  const hasPrice = /\b\d[\d\s.,]{2,}\s*(?:dh|mad)\b/i.test(text);
  const hasSurface = /\b\d[\d\s.,]{1,}\s*(?:m2|m²|sqm)\b/i.test(text);
  const hasSingularListingTitle = /\b(appartement|villa|studio|terrain|bureau|maison|local commercial)\b/.test(text);
  const hasTransaction = /\b(a vendre|a louer|vente|location|sale|rent)\b/.test(text);
  const hasDetailLanguage = /\b(decouvrez|je vous propose|situe|compose de|superficie|chambres|terrasse|residence)\b/.test(text);
  const hasPluralCountPattern = /\b\d{2,5}\s+(?:annonces?|appartements?|villas?|biens?)\b/.test(text);
  if (hasPluralCountPattern) reasons.push("plural_count_pattern");

  if (!isDiscovery && !hasPluralCountPattern && hasSingularListingTitle && hasTransaction && (hasPrice || hasSurface || hasDetailLanguage)) {
    return { lane: "individual_listing", reasons: ["strong_listing_signals"] };
  }

  if (!isDiscovery && !hasPluralCountPattern && hasSingularListingTitle && hasTransaction) {
    return { lane: "quarantine", reasons: ["insufficient_detail_signals"] };
  }

  return { lane: "discovery_page", reasons: reasons.length > 0 ? reasons : ["weak_listing_signals"] };
}

export function classifyOpenSerpResult(input: {
  result: OpenSerpRawResult;
  query: OpenSerpIngestionQuery;
  engine: "bing" | "ecosia";
  discovered_at: string;
  fallbackRank: number;
}): OpenSerpClassifiedResult | null {
  const originalUrl = getResultUrl(input.result);
  const canonicalSourceUrl = canonicalizeSourceUrl(originalUrl);
  if (!canonicalSourceUrl) return null;

  const sourceDomain = extractDomain(canonicalSourceUrl);
  if (!sourceDomain) return null;

  const safeTitle = redactSensitiveText(input.result.title ?? "");
  const safeSnippet = redactSensitiveText(input.result.snippet ?? "");
  const normalizedText = normalizeText(
    [safeTitle.value ?? "", safeSnippet.value ?? "", canonicalSourceUrl].join(" "),
  );

  const { lane, reasons } = classifyLane(normalizedText, canonicalSourceUrl);
  const inferred = inferPublicPropertyIndexAttributes({
    title: safeTitle.value ?? undefined,
    short_snippet: safeSnippet.value ?? undefined,
    source_url: canonicalSourceUrl,
  });
  const parsedPrice =
    parsePriceMad([safeTitle.value, safeSnippet.value].filter(Boolean).join(" ")) ??
    ((inferred.public_price ?? 0) >= 1000 ? inferred.public_price ?? null : null);
  const parsedSurface =
    parseSurfaceM2([safeTitle.value, safeSnippet.value].filter(Boolean).join(" ")) ??
    inferred.public_surface ??
    null;

  return {
    query_id: input.query.query_id,
    engine: input.engine,
    rank: getAbsoluteRank(input.result, input.fallbackRank),
    original_url: originalUrl,
    canonical_source_url: canonicalSourceUrl,
    source_domain: sourceDomain,
    classification_lane: lane,
    classification_reasons: reasons,
    extracted: {
      title: safeTitle.value ?? "Resultat OpenSERP",
      short_description: safeSnippet.value,
      city: inferred.inferred_city ?? input.query.city,
      district: inferred.inferred_neighborhood ?? input.query.district,
      transaction_type:
        toTransactionType(
          [safeTitle.value, safeSnippet.value, input.query.query_text].filter(Boolean).join(" "),
        ) ?? input.query.transaction_type,
      property_type:
        toPropertyType(
          [safeTitle.value, safeSnippet.value, input.query.query_text].filter(Boolean).join(" "),
        ) ?? input.query.property_type,
      price_mad: parsedPrice,
      currency: parsedPrice ? "MAD" : null,
      surface_m2: parsedSurface,
      bedrooms_count: parseBedrooms([safeTitle.value, safeSnippet.value].filter(Boolean).join(" ")),
    },
    title: safeTitle.value ?? "Resultat OpenSERP",
    snippet: safeSnippet.value,
    discovered_at: input.discovered_at,
    raw_result_hash: sha256(JSON.stringify(input.result)),
    provider_result_id: input.result.id ?? null,
    external_id: input.result.id ?? null,
  };
}
