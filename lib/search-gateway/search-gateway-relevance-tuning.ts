import type { SearchGatewayNormalizedResult } from "./search-gateway-types";
import type { SearchGatewayRouteIntent } from "./search-gateway-intent";
import { detectQueryTransaction, type GatewayQueryTransaction } from "./search-gateway-query-expansion";
import { getGatewayPageQuality } from "./search-gateway-page-quality";
import { isEnglishResult, isSourceCategoryPage } from "./search-gateway-category-detector";

export type SearchGatewayPropertyType =
  | "appartement"
  | "studio"
  | "villa"
  | "terrain"
  | "maison"
  | "programme";

export interface SearchGatewayRelevanceContext {
  q?: string;
  city?: string;
  property_type?: string;
  intent?: SearchGatewayRouteIntent | GatewayQueryTransaction | string;
}

export interface SearchGatewayQueryAnalysis {
  raw_query: string;
  normalized_query: string;
  intent: GatewayQueryTransaction;
  city?: string;
  property_type?: SearchGatewayPropertyType;
  explicit_transaction: boolean;
}

export interface SearchGatewayRelevanceBreakdown {
  intentMatchScore: number;
  cityMatchScore: number;
  propertyTypeMatchScore: number;
  pageQualityScore: number;
  transactionMismatchPenalty: number;
  nationalPagePenalty: number;
  priceReferencePenalty: number;
  genericPagePenalty: number;
  englishPagePenalty: number;
  totalScore: number;
  flags: {
    hasTransactionMismatch: boolean;
    isNationalPage: boolean;
    isPriceReferencePage: boolean;
    isGenericPage: boolean;
    cityMatched: boolean;
    cityMismatch: boolean;
    otherCityDetected: boolean;
  };
}

const CITY_ALIASES: Record<string, ReadonlyArray<string>> = {
  casablanca: ["casablanca"],
  rabat: ["rabat"],
  marrakech: ["marrakech", "marrakesh"],
  agadir: ["agadir"],
  tanger: ["tanger", "tangier"],
  fes: ["fes", "fez"],
};

const FALSE_CITY_PREFIXES = [
  "route de ",
  "route d ",
  "route des ",
  "road to ",
];

const NATIONAL_MARKERS = [
  "throughout morocco",
  "all morocco",
  "au maroc",
  "immobilier maroc",
  "maroc",
  "morocco",
];

const PRICE_REFERENCE_MARKERS = [
  "prix immobilier",
  "prix de l immobilier",
  "carte des prix",
  "referentiel",
  "reference de prix",
  "price guide",
  "price map",
];

const GENERIC_PAGE_MARKERS = [
  "au meilleur prix",
  "annonces pour",
  "proprietes a louer",
  "proprietes a vendre",
  "immobiliers en vente au maroc",
  "logement ",
  "search results",
  "browse",
];

function normalizeText(value: string | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCity(value: string | undefined): string | undefined {
  const normalized = normalizeText(value);
  if (!normalized) return undefined;
  const directMatch = Object.entries(CITY_ALIASES).find(([, aliases]) =>
    aliases.some((alias) => alias === normalized),
  );
  if (directMatch) return directMatch[0];
  if (CITY_ALIASES[normalized]) return normalized;
  return normalized;
}

function detectCityFromQuery(query: string): string | undefined {
  const normalized = normalizeText(query);
  for (const [city, aliases] of Object.entries(CITY_ALIASES)) {
    if (aliases.some((alias) => normalized.includes(alias))) return city;
  }
  return undefined;
}

function detectPropertyType(value: string | undefined): SearchGatewayPropertyType | undefined {
  const normalized = normalizeText(value);
  if (!normalized) return undefined;
  if (normalized.includes("programme neuf") || normalized.includes("projet neuf") || normalized.includes("immobilier neuf")) {
    return "programme";
  }
  if (normalized.includes("studio")) return "studio";
  if (normalized.includes("terrain")) return "terrain";
  if (normalized.includes("villa")) return "villa";
  if (normalized.includes("maison")) return "maison";
  if (normalized.includes("appartement") || normalized.includes("apartment")) return "appartement";
  return undefined;
}

function hasAny(text: string, signals: ReadonlyArray<string>): boolean {
  return signals.some((signal) => text.includes(signal));
}

function detectMentionedCities(text: string): string[] {
  const mentioned = new Set<string>();
  for (const [city, aliases] of Object.entries(CITY_ALIASES)) {
    if (aliases.some((alias) => text.includes(alias))) {
      mentioned.add(city);
    }
  }
  return [...mentioned];
}

function isFalseCityContext(text: string, city: string): boolean {
  const aliases = CITY_ALIASES[city] ?? [city];
  return aliases.some((alias) =>
    FALSE_CITY_PREFIXES.some((prefix) => text.includes(`${prefix}${alias}`)),
  );
}

function getResultSignals(result: SearchGatewayNormalizedResult) {
  const text = normalizeText(`${result.title} ${result.snippet ?? ""} ${result.original_url}`);
  return {
    text,
    hasBuySignal: /(^|[\s/-])(a vendre|vente|acheter|achat|for sale|sale)([\s/-]|$)/.test(text),
    hasRentSignal:
      /(^|[\s/-])(a louer|location|louer|loyer|for rent|rent|rental|meuble|meublee|non meuble|monthly|per month|month)([\s/-]|$)/.test(
        text,
      ) || /\b\d[\d\s.,]*\s*(dh|mad|€|\$)\s*\/\s*(monthly|month|mois)\b/.test(text),
    hasNewSignal: /(^|[\s/-])(programme neuf|projet neuf|residence neuve|immobilier neuf|appartement neuf|promoteur|livraison|tranche)([\s/-]|$)/.test(text),
    hasTerrainSignal: /(^|[\s/-])(terrain|terrains|lotissement|constructible|parcel)([\s/-]|$)/.test(text),
    hasAppartementSignal: /(^|[\s/-])(appartement|appartements|apartment|apartments)([\s/-]|$)/.test(text),
    hasStudioSignal: /(^|[\s/-])(studio|studios)([\s/-]|$)/.test(text),
    hasVillaSignal: /(^|[\s/-])(villa|villas)([\s/-]|$)/.test(text),
    hasMaisonSignal: /(^|[\s/-])(maison|maisons|house|houses)([\s/-]|$)/.test(text),
  };
}

function scoreIntentMatch(
  analysis: SearchGatewayQueryAnalysis,
  signals: ReturnType<typeof getResultSignals>,
): { score: number; mismatchPenalty: number; hasMismatch: boolean } {
  if (analysis.intent === "rent") {
    if (signals.hasRentSignal && signals.hasBuySignal) {
      return { score: 6, mismatchPenalty: -12, hasMismatch: false };
    }
    if (signals.hasRentSignal) return { score: 24, mismatchPenalty: 0, hasMismatch: false };
    if (signals.hasBuySignal || signals.hasNewSignal) {
      return { score: 0, mismatchPenalty: -30, hasMismatch: true };
    }
    return { score: 0, mismatchPenalty: 0, hasMismatch: false };
  }

  if (analysis.intent === "new") {
    if (signals.hasRentSignal) return { score: 0, mismatchPenalty: -32, hasMismatch: true };
    if (signals.hasNewSignal) return { score: 28, mismatchPenalty: 0, hasMismatch: false };
    if (signals.hasBuySignal) return { score: 0, mismatchPenalty: -18, hasMismatch: true };
    return { score: 0, mismatchPenalty: -6, hasMismatch: false };
  }

  if (analysis.intent === "land") {
    if (signals.hasTerrainSignal) return { score: 24, mismatchPenalty: 0, hasMismatch: false };
    if (signals.hasRentSignal) return { score: 0, mismatchPenalty: -32, hasMismatch: true };
    if (signals.hasAppartementSignal || signals.hasStudioSignal || signals.hasVillaSignal || signals.hasMaisonSignal) {
      return { score: 0, mismatchPenalty: -24, hasMismatch: true };
    }
    return { score: 0, mismatchPenalty: -10, hasMismatch: false };
  }

  if (signals.hasBuySignal && signals.hasRentSignal) {
    return { score: 4, mismatchPenalty: -14, hasMismatch: false };
  }
  if (signals.hasRentSignal && !signals.hasBuySignal && !signals.hasNewSignal) {
    return { score: 0, mismatchPenalty: -32, hasMismatch: true };
  }
  if (signals.hasBuySignal) return { score: 20, mismatchPenalty: 0, hasMismatch: false };
  if (signals.hasNewSignal) return { score: 12, mismatchPenalty: 0, hasMismatch: false };
  if (analysis.explicit_transaction) return { score: 0, mismatchPenalty: -8, hasMismatch: false };
  return { score: 2, mismatchPenalty: 0, hasMismatch: false };
}

function scorePropertyType(
  propertyType: SearchGatewayPropertyType | undefined,
  signals: ReturnType<typeof getResultSignals>,
): number {
  if (!propertyType) return 0;

  if (propertyType === "terrain") {
    if (signals.hasTerrainSignal) return 18;
    return -18;
  }
  if (propertyType === "villa") {
    if (signals.hasVillaSignal) return 14;
    if (signals.hasMaisonSignal) return 8;
    if (signals.hasAppartementSignal || signals.hasStudioSignal || signals.hasTerrainSignal) return -12;
    return 0;
  }
  if (propertyType === "maison") {
    if (signals.hasMaisonSignal) return 14;
    if (signals.hasVillaSignal) return 8;
    if (signals.hasAppartementSignal || signals.hasStudioSignal || signals.hasTerrainSignal) return -12;
    return 0;
  }
  if (propertyType === "studio") {
    if (signals.hasStudioSignal) return 16;
    if (signals.hasAppartementSignal) return 8;
    if (signals.hasVillaSignal || signals.hasMaisonSignal || signals.hasTerrainSignal) return -12;
    return 0;
  }
  if (propertyType === "programme") {
    if (signals.hasNewSignal) return 16;
    if (signals.hasAppartementSignal) return 6;
    return -10;
  }
  if (propertyType === "appartement") {
    if (signals.hasAppartementSignal) return 12;
    if (signals.hasStudioSignal) return 8;
    if (signals.hasTerrainSignal) return -14;
    return 0;
  }
  return 0;
}

function scoreCity(
  text: string,
  analysis: SearchGatewayQueryAnalysis,
): {
  score: number;
  cityMatched: boolean;
  cityMismatch: boolean;
  otherCityDetected: boolean;
  nationalPenalty: number;
} {
  if (!analysis.city) {
    return {
      score: 0,
      cityMatched: false,
      cityMismatch: false,
      otherCityDetected: false,
      nationalPenalty: 0,
    };
  }

  const mentionedCities = detectMentionedCities(text);
  const cityMatched = mentionedCities.includes(analysis.city);
  const otherCityDetected = mentionedCities.some((city) => city !== analysis.city);
  const falseCityMatch = cityMatched && isFalseCityContext(text, analysis.city);
  const isNationalPage = hasAny(text, NATIONAL_MARKERS);

  if (cityMatched && !falseCityMatch && !otherCityDetected) {
    return {
      score: 24,
      cityMatched: true,
      cityMismatch: false,
      otherCityDetected: false,
      nationalPenalty: isNationalPage ? -8 : 0,
    };
  }

  if (cityMatched && !falseCityMatch && otherCityDetected) {
    return {
      score: 10,
      cityMatched: true,
      cityMismatch: false,
      otherCityDetected: true,
      nationalPenalty: isNationalPage ? -8 : 0,
    };
  }

  if (otherCityDetected || falseCityMatch) {
    return {
      score: -18,
      cityMatched: false,
      cityMismatch: true,
      otherCityDetected: true,
      nationalPenalty: isNationalPage ? -10 : 0,
    };
  }

  if (isNationalPage) {
    return {
      score: -10,
      cityMatched: false,
      cityMismatch: true,
      otherCityDetected: false,
      nationalPenalty: -14,
    };
  }

  return {
    score: -6,
    cityMatched: false,
    cityMismatch: true,
    otherCityDetected: false,
    nationalPenalty: 0,
  };
}

function scorePageQuality(result: SearchGatewayNormalizedResult, text: string): {
  pageQualityScore: number;
  priceReferencePenalty: number;
  genericPagePenalty: number;
  englishPagePenalty: number;
  isPriceReferencePage: boolean;
  isGenericPage: boolean;
} {
  const pageQuality = getGatewayPageQuality(result.title, result.original_url);
  let pageQualityScore = 0;
  if (pageQuality === "individual") pageQualityScore = 18;
  if (pageQuality === "category") pageQualityScore = 6;
  if (pageQuality === "weak") pageQualityScore = -10;
  if (pageQuality === "reject") pageQualityScore = -100;

  if (isSourceCategoryPage(result.title, result.original_url)) {
    pageQualityScore -= 8;
  }

  const isPriceReferencePage =
    pageQuality === "weak" || hasAny(text, PRICE_REFERENCE_MARKERS);
  const isGenericPage = hasAny(text, GENERIC_PAGE_MARKERS);
  const englishPagePenalty = isEnglishResult(result.title, result.original_url) ? -6 : 0;

  return {
    pageQualityScore,
    priceReferencePenalty: isPriceReferencePage ? -16 : 0,
    genericPagePenalty: isGenericPage ? -12 : 0,
    englishPagePenalty: englishPagePenalty ? -8 : 0,
    isPriceReferencePage,
    isGenericPage,
  };
}

export function analyzeGatewayQueryContext(
  context: SearchGatewayRelevanceContext,
): SearchGatewayQueryAnalysis {
  const rawQuery = context.q?.trim() ?? "";
  const normalizedQuery = normalizeText(rawQuery);
  const routeIntent = normalizeText(context.intent);

  let intent: GatewayQueryTransaction;
  if (routeIntent === "rent") intent = "rent";
  else if (routeIntent === "new") intent = "new";
  else if (routeIntent === "land") intent = "land";
  else if (routeIntent === "buy") intent = "buy";
  else intent = detectQueryTransaction(rawQuery || `${context.property_type ?? ""} ${context.city ?? ""}`.trim());

  const explicitTransaction =
    routeIntent === "buy" ||
    routeIntent === "rent" ||
    routeIntent === "new" ||
    routeIntent === "land" ||
    /\b(location|a louer|louer|vente|a vendre|acheter|achat|programme neuf|projet neuf|terrain)\b/.test(normalizedQuery);

  return {
    raw_query: rawQuery,
    normalized_query: normalizedQuery,
    intent,
    city: normalizeCity(context.city) ?? detectCityFromQuery(rawQuery),
    property_type: detectPropertyType(context.property_type) ?? detectPropertyType(rawQuery),
    explicit_transaction: explicitTransaction,
  };
}

export function scoreGatewayResultRelevance(
  result: SearchGatewayNormalizedResult,
  analysis: SearchGatewayQueryAnalysis,
): SearchGatewayRelevanceBreakdown {
  const signals = getResultSignals(result);
  const intentScore = scoreIntentMatch(analysis, signals);
  const cityScore = scoreCity(signals.text, analysis);
  const propertyTypeMatchScore = scorePropertyType(analysis.property_type, signals);
  const pageQuality = scorePageQuality(result, signals.text);

  const totalScore =
    intentScore.score +
    cityScore.score +
    propertyTypeMatchScore +
    pageQuality.pageQualityScore +
    intentScore.mismatchPenalty +
    cityScore.nationalPenalty +
    pageQuality.priceReferencePenalty +
    pageQuality.genericPagePenalty +
    pageQuality.englishPagePenalty;

  return {
    intentMatchScore: intentScore.score,
    cityMatchScore: cityScore.score,
    propertyTypeMatchScore,
    pageQualityScore: pageQuality.pageQualityScore,
    transactionMismatchPenalty: intentScore.mismatchPenalty,
    nationalPagePenalty: cityScore.nationalPenalty,
    priceReferencePenalty: pageQuality.priceReferencePenalty,
    genericPagePenalty: pageQuality.genericPagePenalty,
    englishPagePenalty: pageQuality.englishPagePenalty,
    totalScore,
    flags: {
      hasTransactionMismatch: intentScore.hasMismatch,
      isNationalPage: cityScore.nationalPenalty < 0,
      isPriceReferencePage: pageQuality.isPriceReferencePage,
      isGenericPage: pageQuality.isGenericPage,
      cityMatched: cityScore.cityMatched,
      cityMismatch: cityScore.cityMismatch,
      otherCityDetected: cityScore.otherCityDetected,
    },
  };
}

export function countStrongGatewayResults(
  results: readonly SearchGatewayNormalizedResult[],
  analysis: SearchGatewayQueryAnalysis,
  minimumScore = 20,
): number {
  return results.filter((result) => scoreGatewayResultRelevance(result, analysis).totalScore >= minimumScore).length;
}
