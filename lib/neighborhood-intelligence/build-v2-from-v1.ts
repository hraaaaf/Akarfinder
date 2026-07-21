import {
  emptyEvidence,
  emptyNeighborhoodScores,
  type EvidenceValue,
  type NeighborhoodAnalysis,
  type NeighborhoodIntelligenceRecordV2,
  type NeighborhoodObjectiveFacts,
  type NeighborhoodSourceRef,
  type RelativeStanding,
  type UrbanType,
} from "./schema-v2";
import { V1_CITY_MARKET_ROWS, V1_NEIGHBORHOOD_MARKET_ROWS, type V1NeighborhoodMarketRow } from "./v1-market-seed";

const ALIASES: Record<string, string[]> = {
  "casablanca::maarif": ["Maârif"],
  "casablanca::ain diab": ["Aïn Diab"],
  "casablanca::sidi maarouf": ["Sidi Maârouf"],
  "rabat::hay riad": ["Hay Ryad"],
  "marrakech::gueliz": ["Guéliz"],
  "kenitra::maamora": ["Maâmora"],
  "sale::plage des nations": ["Plage des Nations"],
  "sale::bab lakhmiss": ["Bab Lakhmiss"],
};

export function normalizeNeighborhoodToken(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function slugifyNeighborhood(value: string): string {
  return normalizeNeighborhoodToken(value).replace(/\s+/g, "-");
}

function objective<T>(value: T | null, sourceRefs: string[], observedAt: string | null, confidence: "high"|"medium"|"low"|"unknown" = "medium"): EvidenceValue<T> {
  return { value, evidence_kind: "objective", confidence: value == null ? "unknown" : confidence, source_refs: value == null ? [] : sourceRefs, observed_at: value == null ? null : observedAt };
}

function analysis<T>(value: T | null, sourceRefs: string[], observedAt: string | null, confidence: "high"|"medium"|"low"|"unknown" = "medium"): EvidenceValue<T> {
  return { value, evidence_kind: "analysis", confidence: value == null ? "unknown" : confidence, source_refs: value == null ? [] : sourceRefs, observed_at: value == null ? null : observedAt };
}

export function classifyRelativeStanding(priceM2: number | null, cityMean: number): RelativeStanding {
  if (priceM2 == null || cityMean <= 0) return "unknown";
  const ratio = priceM2 / cityMean;
  if (ratio < 0.85) return "accessible";
  if (ratio <= 1.15) return "core_market";
  if (ratio <= 1.5) return "premium";
  return "prestige";
}

export function mapUsageToUrbanType(raw: string): UrbanType {
  const value = normalizeNeighborhoodToken(raw);
  if (value.includes("golf")) return "golf_gated_residential";
  if (value.includes("patrimonial")) return "heritage";
  if (value.includes("peri urbain")) return "periurban";
  if (value.includes("diplomatique") && value.includes("residentiel")) return "diplomatic_residential";
  if (value.includes("institutionnel") && !value.includes("residentiel")) return "institutional";
  if (value.includes("administratif")) return "administrative";
  if (value.includes("littoral")) return "coastal_residential";
  if (value.includes("touristique") && value.includes("residentiel")) return "touristic_residential";
  if (value.includes("touristique")) return "touristic";
  if (value.includes("tertiaire") && value.includes("mixte")) return "tertiary_mixed";
  if (value.includes("commercial") && value.includes("mixte")) return "commercial_mixed";
  if (value.includes("industriel") && value.includes("residentiel")) return "industrial_residential";
  if (value.includes("residentiel prime")) return "residential_prime";
  if (value.includes("mixte")) return "mixed";
  if (value.includes("residentiel")) return "residential";
  return "other";
}

function sourcesFor(row: V1NeighborhoodMarketRow): NeighborhoodSourceRef[] {
  const marketDate = row.market_source === "dakimmo" ? "2026-04-01" : "2026-01-29";
  return [
    {
      id: `${row.market_source}-${marketDate}`,
      source_name: row.market_source === "dakimmo" ? "Dakimmo" : "Agenz",
      source_class: "operational_reference",
      observed_at: marketDate,
      note: "Référentiel opérationnel V1 conservé; valeur indicative et non série notariale officielle quartiérisée.",
    },
    {
      id: "ipai-bam-ancfcc-t1-2026",
      source_name: "IPAI Bank Al-Maghrib / ANCFCC",
      source_class: "official",
      observed_at: "2026-03-31",
      note: "Tendance officielle au niveau ville lorsque disponible; pas un prix quartier.",
    },
  ];
}

function buildObjectiveFacts(row: V1NeighborhoodMarketRow): NeighborhoodObjectiveFacts {
  const city = V1_CITY_MARKET_ROWS.find((candidate) => candidate.city === row.city);
  if (!city) throw new Error(`Missing V1 city market row for ${row.city}`);
  const marketDate = row.market_source === "dakimmo" ? "2026-04-01" : "2026-01-29";
  const marketRef = `${row.market_source}-${marketDate}`;
  return {
    apartment_price_m2_mad: objective(row.apartment_m2, [marketRef], marketDate),
    villa_price_m2_mad: objective(row.villa_m2, [marketRef], marketDate),
    city_apartment_price_m2_mad: objective(city.apartment_m2, ["agenz-2026-01-29"], "2026-01-29"),
    city_villa_price_m2_mad: objective(city.villa_m2, ["agenz-2026-01-29"], "2026-01-29"),
    official_price_trend_pct: objective(city.official_price_trend_pct, ["ipai-bam-ancfcc-t1-2026"], "2026-03-31", "high"),
    official_transactions_trend_pct: objective(city.official_transactions_trend_pct, ["ipai-bam-ancfcc-t1-2026"], "2026-03-31", "high"),
    tram_access: emptyEvidence<boolean>(),
    rail_access: emptyEvidence<boolean>(),
    public_transport_access: emptyEvidence<number>(),
    school_access: emptyEvidence<number>(),
    healthcare_access: emptyEvidence<number>(),
    commerce_access: emptyEvidence<number>(),
    green_space_access: emptyEvidence<number>(),
    beach_access: emptyEvidence<number>(),
    distance_to_coast_km: emptyEvidence<number>(),
    road_accessibility: emptyEvidence<number>(),
    walkability_evidence: emptyEvidence<number>(),
    nightlife_venue_density: emptyEvidence<number>(),
    new_programs_presence: emptyEvidence<boolean>(),
  };
}

function buildAnalysis(row: V1NeighborhoodMarketRow): NeighborhoodAnalysis {
  const city = V1_CITY_MARKET_ROWS.find((candidate) => candidate.city === row.city)!;
  const marketDate = row.market_source === "dakimmo" ? "2026-04-01" : "2026-01-29";
  const marketRef = `${row.market_source}-${marketDate}`;
  const standingPrice = row.apartment_m2;
  return {
    relative_standing: {
      ...analysis(classifyRelativeStanding(standingPrice, city.apartment_m2), [marketRef, "agenz-2026-01-29"], marketDate),
      method_version: "relative-city-apartment-85-115-150-v1",
    },
    dominant_urban_type: analysis(mapUsageToUrbanType(row.usage_raw), [marketRef], marketDate, "low"),
    secondary_urban_types: emptyEvidence<UrbanType[]>("analysis"),
    morphology: emptyEvidence("analysis"),
    development_stage: emptyEvidence("analysis"),
    market_maturity: emptyEvidence("analysis"),
    residential_intensity: emptyEvidence<number>("analysis"),
    business_intensity: emptyEvidence<number>("analysis"),
    administrative_intensity: emptyEvidence<number>("analysis"),
    tourism_intensity_analysis: emptyEvidence<number>("analysis"),
    student_intensity: emptyEvidence<number>("analysis"),
    industrial_intensity: emptyEvidence<number>("analysis"),
    heritage_intensity: emptyEvidence<number>("analysis"),
    coastal_character: emptyEvidence<number>("analysis"),
    rental_profile: emptyEvidence("analysis"),
    audience_signals: emptyEvidence("analysis"),
    development_outlook: emptyEvidence("analysis"),
  };
}

export function buildNeighborhoodIntelligenceV2FromV1(): NeighborhoodIntelligenceRecordV2[] {
  return V1_NEIGHBORHOOD_MARKET_ROWS.map((row) => {
    const normalizedCity = normalizeNeighborhoodToken(row.city);
    const normalizedNeighborhood = normalizeNeighborhoodToken(row.neighborhood);
    return {
      schema_version: "2.0",
      city: row.city,
      city_slug: slugifyNeighborhood(row.city),
      neighborhood: row.neighborhood,
      neighborhood_slug: slugifyNeighborhood(row.neighborhood),
      aliases: ALIASES[`${normalizedCity}::${normalizedNeighborhood}`] ?? [],
      objective_facts: buildObjectiveFacts(row),
      analysis: buildAnalysis(row),
      akar_scores: emptyNeighborhoodScores(),
      sources: sourcesFor(row),
      record_confidence: row.apartment_m2 != null || row.villa_m2 != null ? "medium" : "low",
      updated_at: "2026-07-22T00:00:00Z",
    };
  });
}

export function findNeighborhoodV2(city: string, neighborhood: string): NeighborhoodIntelligenceRecordV2 | null {
  const cityToken = normalizeNeighborhoodToken(city);
  const neighborhoodToken = normalizeNeighborhoodToken(neighborhood);
  return buildNeighborhoodIntelligenceV2FromV1().find((record) => {
    if (normalizeNeighborhoodToken(record.city) !== cityToken) return false;
    return normalizeNeighborhoodToken(record.neighborhood) === neighborhoodToken || record.aliases.some((alias) => normalizeNeighborhoodToken(alias) === neighborhoodToken);
  }) ?? null;
}
