import type { OpenSerpRawResult } from "@/lib/openserp-async/types";
import type { OpenSerpClassifiedResult, OpenSerpClassificationLane, OpenSerpIngestionQuery } from "./types";
import {
  canonicalizeSourceUrl,
  extractCity,
  extractDistrict,
  extractDomain,
  mentionsTourismOrHospitality,
  parseBedrooms,
  parsePriceMad,
  parseSurfaceM2,
  redactSensitiveText,
  sha256,
  toPropertyType,
  toTransactionType,
} from "./utils";
import { getListingUrlPatterns } from "./domain-registry";
import { PROPERTY_TYPE_ARABIC_NAMES } from "./national-geography";

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

const ARABIC_REAL_ESTATE_TOKENS = [
  ...Object.values(PROPERTY_TYPE_ARABIC_NAMES),
  "عقار",
  "عقارات",
  "للبيع",
  "للإيجار",
  "للكراء",
  "الكراء",
  "بيع",
  "إيجار",
];

const OUT_OF_SCOPE_TOKENS = [
  "voiture",
  "emploi",
  "service",
  "actualite",
  "blog",
  "guide",
];

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

const ARABIC_DISCOVERY_TOKENS = ["إعلانات", "اعلانات", "قائمة العقارات", "نتائج البحث"];

type PathRules = {
  forceReject?: RegExp[];
  forceDiscovery?: RegExp[];
};

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
  "immobilier.trovit.ma": { forceDiscovery: [/.*/] },
  "nuroa.ma": { forceDiscovery: [/.*/] },
  "immo.mitula.ma": { forceDiscovery: [/.*/] },
  "yakeey.com": { forceReject: [/.*/] },
  "marocannonces.com": {
    forceDiscovery: [/\/maroc\/.+-b\d+-t\d+\.html/i, /\/categorie\//],
  },
  "mouldar.com": {
    forceDiscovery: [/\/(?:fr|en)\/(?:achat|location|rent|buy)\/[^/]+\/[^/]+\/[^/]+$/i],
  },
};

function normalizeClassificationText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s/-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasArabicRealEstateSignal(value: string): boolean {
  return ARABIC_REAL_ESTATE_TOKENS.some((token) => value.includes(token));
}

function hasArabicPropertyType(value: string): boolean {
  return Object.values(PROPERTY_TYPE_ARABIC_NAMES).some((token) => value.includes(token));
}

function hasArabicTransaction(value: string): boolean {
  return ["للبيع", "بيع", "للإيجار", "للايجار", "إيجار", "ايجار", "للكراء", "الكراء", "كراء"].some((token) => value.includes(token));
}

function hasExplicitVacationIntent(value: string): boolean {
  return /\b(vacances?|vacation|saisonnier|saisonniere|airbnb|appart[- ]hotel|riad touristique)\b/.test(value) ||
    ["عطلة", "العطل", "يومي", "سياحي"].some((token) => value.includes(token));
}

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
  const strongIndividual = getListingUrlPatterns(domain).some((pattern) => pattern.test(pathname));

  if (forceReject) reasons.push("force_reject_path");
  if (forceDiscovery) reasons.push("discovery_path");
  if (strongIndividual) reasons.push("strong_individual_path");

  return { forceReject, forceDiscovery, strongIndividual, reasons };
}

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

  const detailText = [input.title, input.snippet, input.canonicalUrl].filter(Boolean).join(" ");
  const multilingualDetailText = normalizeClassificationText(detailText);
  const hasPrice = parsePriceMad([input.title, input.snippet].filter(Boolean).join(" ")) != null;
  const hasSurface = parseSurfaceM2([input.title, input.snippet].filter(Boolean).join(" ")) != null;
  const hasBedrooms = parseBedrooms([input.title, input.snippet].filter(Boolean).join(" ")) != null;
  const hasTransaction = toTransactionType(detailText) != null || hasArabicTransaction(multilingualDetailText);
  const hasPropertyType = toPropertyType(detailText) != null || hasArabicPropertyType(multilingualDetailText);
  const explicitCity = extractCityFn(detailText);
  const explicitDistrict = extractDistrictFn(detailText);
  const hasPluralCountPattern = /\b\d{2,5}\s+(?:annonces?|appartements?|villas?|biens?|studios?)\b/.test(input.text);
  const hasDiscoveryToken = DISCOVERY_TOKENS.some((token) => input.text.includes(token)) || ARABIC_DISCOVERY_TOKENS.some((token) => input.text.includes(token));
  const detailLanguage = /\b(superficie|chambres?|terrasse|residence|situe|idealement|magnifique|visite|plain-pied)\b/.test(input.text);
  const detailSignalCount = [hasPrice, hasSurface, hasBedrooms, detailLanguage].filter(Boolean).length;
  const explicitLocationMatchesQuery =
    (!explicitCity || explicitCity === input.query.city) &&
    (!explicitDistrict || explicitDistrict.city === input.query.city);

  const hasRealEstateSignal = REAL_ESTATE_TOKENS.some((token) => input.text.includes(token)) || hasArabicRealEstateSignal(input.text);
  if (!hasRealEstateSignal && !urlSignals.strongIndividual) {
    return { lane: "reject_out_of_scope", reasons: ["missing_real_estate_signal"] };
  }

  if (urlSignals.forceReject) {
    return { lane: "reject_out_of_scope", reasons };
  }

  const strongRecoveryEvidence =
    urlSignals.strongIndividual &&
    !urlSignals.forceDiscovery &&
    !hasPluralCountPattern &&
    !hasDiscoveryToken &&
    hasPropertyType &&
    hasTransaction &&
    explicitLocationMatchesQuery &&
    detailSignalCount >= 1;

  const hasGenericOutOfScopeToken =
    OUT_OF_SCOPE_TOKENS.some((token) => input.text.includes(token)) ||
    OUT_OF_SCOPE_WORD_BOUNDARY_TOKENS.some((pattern) => pattern.test(input.text));
  if (hasGenericOutOfScopeToken && !strongRecoveryEvidence) {
    return { lane: "reject_out_of_scope", reasons: ["out_of_scope_token"] };
  }
  if (hasGenericOutOfScopeToken && strongRecoveryEvidence) {
    reasons.push("generic_out_of_scope_ignored_for_corroborated_individual_path");
  }

  if (mentionsTourismOrHospitality(input.text) && (hasExplicitVacationIntent(input.text) || !strongRecoveryEvidence)) {
    return { lane: "reject_out_of_scope", reasons: ["tourism_or_hospitality"] };
  }

  if (hasPluralCountPattern) reasons.push("plural_count_pattern");
  if (hasDiscoveryToken) reasons.push("discovery_token");
  if (explicitCity) reasons.push("explicit_city");
  if (explicitDistrict) reasons.push("explicit_district");
  if (hasPrice) reasons.push("price_signal");
  if (hasSurface) reasons.push("surface_signal");
  if (hasBedrooms) reasons.push("bedroom_signal");
  if (hasArabicRealEstateSignal(multilingualDetailText)) reasons.push("arabic_real_estate_signal");

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
  const combinedText = normalizeClassificationText([
    input.title,
    input.snippet,
    input.canonicalUrl,
  ].filter(Boolean).join(" "));
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
  engine: "bing" | "ecosia" | "duckduckgo" | "searxng_yandex";
  discovered_at: string;
  fallbackRank: number;
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
  const normalizedText = normalizeClassificationText([safeTitle.value ?? "", safeSnippet.value ?? "", canonicalSourceUrl].join(" "));

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
