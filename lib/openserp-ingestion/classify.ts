import type { OpenSerpRawResult } from "@/lib/openserp-async/types";
import type { OpenSerpClassifiedResult, OpenSerpClassificationLane, OpenSerpIngestionQuery } from "./types";
import {
  canonicalizeSourceUrl,
  extractCity,
  extractDistrict,
  extractDomain,
  mentionsTourismOrHospitality,
  normalizeText,
  parseBedrooms,
  parsePriceMad,
  parseSurfaceM2,
  redactSensitiveText,
  sha256,
  toPropertyType,
  toTransactionType,
  uniqueNormalizedText,
} from "./utils";
import { getListingUrlPatterns } from "./domain-registry";

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
  "service",
  "actualite",
  "blog",
  "guide",
];

// OPENSERP-CLASSIFY-OUT-OF-SCOPE-TOKEN-BOUNDARY-FIX-1: "mobilier" moved out
// of the plain-substring OUT_OF_SCOPE_TOKENS list above -- a bare
// `.includes("mobilier")` also matches "immobilier"/"immobiliere" (French
// for "real estate"/"real estate agency", itself one of REAL_ESTATE_TOKENS
// above), which is core, expected vocabulary for this domain, not a
// disqualifying one. Audited against a real Production run
// (openserp-github-cron-2026-07-20T08-23-27-764Z): 30/34 rejections that
// run carried exactly this token, including two domains whose name alone
// (kawtarimmobilier.com, limmobiliersansfrontieres.com) triggered it on
// every single result regardless of content. Matched with a strict word
// boundary instead, against the same already-normalized (lowercase,
// accent-stripped) text every other token checks -- normalizeText() only
// strips characters outside [a-z0-9\s/-], so \b correctly finds no
// boundary inside "immobilier" (no non-word character separates "im" from
// "mobilier") while still matching "mobilier" as its own word or compound
// ("mobilier de bureau", "meubles et mobilier").
const OUT_OF_SCOPE_WORD_BOUNDARY_TOKENS: RegExp[] = [/\bmobilier\b/];

const DISCOVERY_TOKENS = [
  "annonces immobilieres",
  "biens a vendre",
  "appartements a vendre",
  "appartements a louer",
  "villas a vendre",
  "agence immobiliere",
  "promoteur immobilier",
  "liste des biens",
  "resultats de recherche",
  "guide immobilier",
  "prix moyen",
  "tendances du marche",
  "plus de",
];

type PathRules = {
  forceReject?: RegExp[];
  forceDiscovery?: RegExp[];
};

// OPENSERP-REGISTRY-PATTERN-SOURCE-OF-TRUTH-1: strongIndividual entries
// (the per-domain "does this URL path look like one specific listing"
// regexes) have moved out of this hardcoded map into
// data/openserp/source-domain-registry.json's listing_url_patterns,
// which is now the single functionally-enforced source of truth --
// see getListingUrlPatterns() in domain-registry.ts and its use in
// detectUrlSignals() below. forceReject/forceDiscovery stay here: they
// are not listing_url_patterns (they identify category/discovery/
// rejected pages, not individual listings) and the registry has no
// field for them.
//
// Domains that had ONLY a strongIndividual entry (1immo.ma,
// barnes-marrakech.com, kawtarimmobilier.com, limmobiliersansfrontieres.com,
// marrakechrealty.com) no longer appear in this map at all -- their
// patterns now live exclusively in the registry.
const DOMAIN_RULES: Record<string, PathRules> = {
  "mubawab.ma": {
    forceDiscovery: [/\/(?:fr|en)?\/?(?:sd|cd|sc)\//, /\/immobilier-a-(?:vendre|louer)\b/, /\/appartements-a-(?:vendre|louer)\b/, /\/villas-et-maisons-de-luxe-a-vendre\b/],
  },
  "agenz.ma": {
    forceDiscovery: [/\/(?:fr|en)\/(?:acheter|louer)\//],
  },
  "sarouty.ma": {
    forceDiscovery: [/\/acheter\/[^/]+\/[^/]+\/(?:appartements|villas|proprietes|immobilier-neuf).*/, /\/acheter\/[^/]+\/(?:villas-a-vendre|proprietes-a-vendre)$/, /\/louer\/[^/]+\/(?:appartements-a-louer|proprietes-a-louer).*$/],
  },
  "avito.ma": {
    forceDiscovery: [/\/sp\/immobilier\//, /\/fr\/.+\/(?:appartements|villas|terrains|bureaux).+_vendre$/, /\/fr\/.+\/(?:appartements|villas|terrains|bureaux).+_louer$/],
  },
  "immobilier.trovit.ma": {
    forceDiscovery: [/.*/],
  },
  "nuroa.ma": {
    forceDiscovery: [/.*/],
  },
  "immo.mitula.ma": {
    forceDiscovery: [/.*/],
  },
  "yakeey.com": {
    forceReject: [/.*/],
  },
  "marocannonces.com": {
    forceDiscovery: [/\/maroc\/.+-b\d+-t\d+\.html/i, /\/categorie\//],
  },
  "mouldar.com": {
    forceDiscovery: [/\/(?:fr|en)\/(?:achat|location|rent|buy)\/[^/]+\/[^/]+\/[^/]+$/i],
  },
};

function getResultUrl(result: OpenSerpRawResult): string {
  return (result.url ?? result.link ?? "").trim();
}

function getAbsoluteRank(result: OpenSerpRawResult, fallback: number): number {
  return result.position?.absolute ?? result.rank ?? fallback;
}

function detectUrlSignals(domain: string, canonicalUrl: string): {
  forceReject: boolean;
  forceDiscovery: boolean;
  strongIndividual: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  const pathname = (() => {
    try {
      return new URL(canonicalUrl).pathname;
    } catch {
      return canonicalUrl;
    }
  })();
  const rules = DOMAIN_RULES[domain];
  const forceReject = rules?.forceReject?.some((pattern) => pattern.test(pathname)) ?? false;
  const forceDiscovery = rules?.forceDiscovery?.some((pattern) => pattern.test(pathname)) ?? false;
  // OPENSERP-REGISTRY-PATTERN-SOURCE-OF-TRUTH-1: strongIndividual now comes
  // exclusively from source-domain-registry.json's listing_url_patterns
  // (via getListingUrlPatterns), not from this file's own DOMAIN_RULES --
  // called unconditionally, independent of whether `rules` exists above,
  // since a domain can have listing_url_patterns with no forceReject/
  // forceDiscovery entry at all (e.g. 1immo.ma, kawtarimmobilier.com).
  const strongIndividual = getListingUrlPatterns(domain).some((pattern) => pattern.test(pathname));

  if (forceReject) reasons.push("force_reject_path");
  if (forceDiscovery) reasons.push("discovery_path");
  if (strongIndividual) reasons.push("strong_individual_path");

  return { forceReject, forceDiscovery, strongIndividual, reasons };
}

// AKARFINDER-OPENSERP-AUTOMATED-INGESTION-30MIN-1 — injectable city/district
// extractors, defaulting to the original 3-city functions so every existing
// caller (the pilot path) keeps its exact prior behavior unchanged. The
// national admission module passes a nationally-aware pair covering all 16
// recognized cities + 65 districts (see national-utils.ts) without this file
// needing to know anything about the wider taxonomy itself.
export type CityExtractor = (value: string) => string | null;
export type DistrictExtractor = (value: string) => { city: string; district: string } | null;

function classifyLane(input: {
  text: string;
  title: string;
  snippet: string;
  canonicalUrl: string;
  domain: string;
  query: OpenSerpIngestionQuery;
  extractCityFn?: CityExtractor;
  extractDistrictFn?: DistrictExtractor;
}): {
  lane: OpenSerpClassificationLane;
  reasons: string[];
} {
  const extractCityFn = input.extractCityFn ?? extractCity;
  const extractDistrictFn = input.extractDistrictFn ?? extractDistrict;
  const reasons: string[] = [];
  const urlSignals = detectUrlSignals(input.domain, input.canonicalUrl);
  reasons.push(...urlSignals.reasons);

  if (!REAL_ESTATE_TOKENS.some((token) => input.text.includes(token))) {
    return { lane: "reject_out_of_scope", reasons: ["missing_real_estate_signal"] };
  }

  if (
    OUT_OF_SCOPE_TOKENS.some((token) => input.text.includes(token)) ||
    OUT_OF_SCOPE_WORD_BOUNDARY_TOKENS.some((pattern) => pattern.test(input.text))
  ) {
    return { lane: "reject_out_of_scope", reasons: ["out_of_scope_token"] };
  }

  if (mentionsTourismOrHospitality(input.text)) {
    return { lane: "reject_out_of_scope", reasons: ["tourism_or_hospitality"] };
  }

  if (urlSignals.forceReject) {
    return { lane: "reject_out_of_scope", reasons };
  }

  const hasPrice = parsePriceMad([input.title, input.snippet].filter(Boolean).join(" ")) != null;
  const hasSurface = parseSurfaceM2([input.title, input.snippet].filter(Boolean).join(" ")) != null;
  const hasBedrooms = parseBedrooms([input.title, input.snippet].filter(Boolean).join(" ")) != null;
  const hasTransaction = toTransactionType([input.title, input.snippet].join(" ")) != null;
  const hasPropertyType = toPropertyType([input.title, input.snippet].join(" ")) != null;
  const explicitCity = extractCityFn([input.title, input.snippet, input.canonicalUrl].join(" "));
  const explicitDistrict = extractDistrictFn([input.title, input.snippet, input.canonicalUrl].join(" "));
  const hasPluralCountPattern = /\b\d{2,5}\s+(?:annonces?|appartements?|villas?|biens?|studios?)\b/.test(input.text);
  const hasDiscoveryToken = DISCOVERY_TOKENS.some((token) => input.text.includes(token));
  const detailLanguage = /\b(superficie|chambres?|terrasse|residence|situe|idealement|magnifique|visite|plain-pied)\b/.test(input.text);

  if (hasPluralCountPattern) reasons.push("plural_count_pattern");
  if (hasDiscoveryToken) reasons.push("discovery_token");
  if (explicitCity) reasons.push("explicit_city");
  if (explicitDistrict) reasons.push("explicit_district");
  if (hasPrice) reasons.push("price_signal");
  if (hasSurface) reasons.push("surface_signal");
  if (hasBedrooms) reasons.push("bedroom_signal");

  const detailSignalCount = [hasPrice, hasSurface, hasBedrooms, detailLanguage].filter(Boolean).length;
  const explicitLocationMatchesQuery =
    (!explicitCity || explicitCity === input.query.city) &&
    (!explicitDistrict || explicitDistrict.city === input.query.city);

  if (
    urlSignals.strongIndividual &&
    hasPropertyType &&
    hasTransaction &&
    explicitLocationMatchesQuery
  ) {
    return { lane: "individual_listing", reasons };
  }

  if (urlSignals.forceDiscovery || hasPluralCountPattern || hasDiscoveryToken) {
    return { lane: "discovery_page", reasons };
  }

  if (hasPropertyType && hasTransaction && explicitLocationMatchesQuery && detailSignalCount >= 2) {
    return { lane: "individual_listing", reasons: [...reasons, "textual_detail_signals"] };
  }

  if (hasPropertyType && hasTransaction) {
    return { lane: "quarantine", reasons: [...reasons, "insufficient_detail_signals"] };
  }

  return { lane: "discovery_page", reasons: reasons.length > 0 ? reasons : ["weak_listing_signals"] };
}

function extractAttributes(input: {
  title: string;
  snippet: string | null;
  canonicalUrl: string;
  query: OpenSerpIngestionQuery;
  extractCityFn?: CityExtractor;
  extractDistrictFn?: DistrictExtractor;
}) {
  const extractCityFn = input.extractCityFn ?? extractCity;
  const extractDistrictFn = input.extractDistrictFn ?? extractDistrict;
  const combinedText = uniqueNormalizedText([
    input.title,
    input.snippet,
    input.canonicalUrl,
  ]);
  const explicitDistrict = extractDistrictFn(combinedText);
  const explicitCity = extractCityFn(combinedText);
  const extractedCity = explicitDistrict?.city ?? explicitCity ?? input.query.city;
  const extractedDistrict =
    explicitDistrict?.district ??
    (explicitCity === input.query.city ? input.query.district : null);

  const transactionFromContent = toTransactionType([input.title, input.snippet, input.canonicalUrl].filter(Boolean).join(" "));
  const propertyTypeFromContent = toPropertyType([input.title, input.snippet, input.canonicalUrl].filter(Boolean).join(" "));
  const price = parsePriceMad([input.title, input.snippet].filter(Boolean).join(" "));
  const surface = parseSurfaceM2([input.title, input.snippet].filter(Boolean).join(" "));

  return {
    title: input.title,
    short_description: input.snippet,
    city: extractedCity,
    district: extractedDistrict,
    transaction_type: transactionFromContent ?? input.query.transaction_type,
    // input.query.property_type is a free-form query label (widened for the
    // national planner, e.g. "riad"/"duplex"/"terrain") — only fall back to
    // it here if it happens to already be one of the known extracted-attribute
    // categories; toPropertyType() re-derives from the raw label otherwise so
    // we never emit a property_type value outside OpenSerpExtractedAttributes'
    // strict union (never invent a new DB-facing category).
    property_type: propertyTypeFromContent ?? toPropertyType(input.query.property_type),
    price_mad: price,
    currency: price ? ("MAD" as const) : null,
    surface_m2: surface,
    bedrooms_count: parseBedrooms([input.title, input.snippet].filter(Boolean).join(" ")),
  };
}

export function classifyOpenSerpResult(input: {
  result: OpenSerpRawResult;
  query: OpenSerpIngestionQuery;
  // OPENSERP-YANDEX-DUAL-DISCOVERY-LANE-1: "searxng_yandex" added so a
  // Yandex-only-sourced result (never seen by OpenSERP for this query) can
  // still be classified through this exact same, unmodified function --
  // purely a provenance label carried into OpenSerpClassifiedResult.engine,
  // never used to gate or branch classification logic below.
  engine: "bing" | "ecosia" | "duckduckgo" | "searxng_yandex";
  discovered_at: string;
  fallbackRank: number;
  // Optional national-geography override — see CityExtractor/DistrictExtractor
  // above. Omitted entirely by every existing (3-city pilot) caller, so this
  // parameter changes nothing for code that does not pass it.
  extractCityFn?: CityExtractor;
  extractDistrictFn?: DistrictExtractor;
}): OpenSerpClassifiedResult | null {
  const originalUrl = getResultUrl(input.result);
  const canonicalSourceUrl = canonicalizeSourceUrl(originalUrl);
  if (!canonicalSourceUrl) return null;

  const sourceDomain = extractDomain(canonicalSourceUrl);
  if (!sourceDomain) return null;

  const safeTitle = redactSensitiveText(input.result.title ?? "");
  const safeSnippet = redactSensitiveText(input.result.snippet ?? "");
  const normalizedText = uniqueNormalizedText([safeTitle.value ?? "", safeSnippet.value ?? "", canonicalSourceUrl]);

  const attributes = extractAttributes({
    title: safeTitle.value ?? "Resultat OpenSERP",
    snippet: safeSnippet.value,
    canonicalUrl: canonicalSourceUrl,
    query: input.query,
    extractCityFn: input.extractCityFn,
    extractDistrictFn: input.extractDistrictFn,
  });

  const { lane, reasons } = classifyLane({
    text: normalizedText,
    title: attributes.title,
    snippet: attributes.short_description ?? "",
    canonicalUrl: canonicalSourceUrl,
    domain: sourceDomain,
    query: input.query,
    extractCityFn: input.extractCityFn,
    extractDistrictFn: input.extractDistrictFn,
  });

  return {
    query_id: input.query.query_id,
    engine: input.engine,
    rank: getAbsoluteRank(input.result, input.fallbackRank),
    original_url: originalUrl,
    canonical_source_url: canonicalSourceUrl,
    source_domain: sourceDomain,
    classification_lane: lane,
    classification_reasons: reasons,
    extracted: attributes,
    title: attributes.title,
    snippet: attributes.short_description,
    discovered_at: input.discovered_at,
    raw_result_hash: sha256(JSON.stringify(input.result)),
    provider_result_id: input.result.id ?? null,
    external_id: input.result.id ?? null,
  };
}
