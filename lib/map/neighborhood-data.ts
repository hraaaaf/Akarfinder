// MAP-NEIGHBORHOOD-INTELLIGENCE-1
// Couche quartier first-party pour /map et futures surfaces quartier.

import { CITIES } from "@/lib/cities";
import { MARKET_DATA } from "@/lib/market/morocco-market-prices";

export type NeighborhoodConfidence = "high" | "medium" | "low";

export type NeighborhoodPriceSignal = {
  label: string;
  source: "benchmark_source" | "first_party_estimate" | "not_available";
  confidence: NeighborhoodConfidence;
};

export type NeighborhoodPoint = {
  id: string;
  city: string;
  citySlug: string;
  neighborhood: string;
  neighborhoodSlug: string;
  slug: string;
  lat: number;
  lng: number;
  searchHref: string;
  benchmark: PriceBenchmark;
  priceSignal: NeighborhoodPriceSignal;
  highlights: NeighborhoodHighlight[];
  proximityHighlights: string[];
  lifestyleTags: string[];
  confidence: NeighborhoodConfidence;
};

export type DataConfidence = NeighborhoodConfidence;

export type NeighborhoodHighlight = {
  icon: string;
  label: string;
};

export type PriceBenchmark = {
  median_buy_appt: number | null;
  fallback_label: string;
  confidence: NeighborhoodConfidence;
  period: string;
};

type NeighborhoodSeed = Omit<
  NeighborhoodPoint,
  "id" | "citySlug" | "neighborhoodSlug" | "slug" | "searchHref" | "benchmark" | "priceSignal" | "highlights"
> & {
  searchNeighborhood?: string;
};

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function slugifySegment(value: string): string {
  return normalizeText(value).replace(/\s+/g, "-");
}

export function slugifyNeighborhood(value: string): string {
  return slugifySegment(value);
}

function slugifyCity(value: string): string {
  const normalized = normalizeText(value).replace(/\s+/g, "-");
  return normalized || value.toLowerCase();
}

function normalizeSearchQuery(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function buildNeighborhoodSearchHref(city: string, neighborhood?: string): string {
  const query = neighborhood ? normalizeSearchQuery(neighborhood) : normalizeSearchQuery(city);
  const params = new URLSearchParams();
  params.set("city", city);
  params.set("q", query);
  return `/search?${params.toString()}`;
}

function confidenceFromMarket(value: string): NeighborhoodConfidence {
  if (value === "élevée") return "high";
  if (value === "moyenne") return "medium";
  return "low";
}

function findMarketBenchmark(
  city: string,
  neighborhood: string | null
): { median_buy_appt: number | null; confidence: NeighborhoodConfidence; fallback_label: string } {
  const normCity = normalizeText(city);
  const normNeighborhood = neighborhood ? normalizeText(neighborhood) : null;

  const neighborhoodMatch = normNeighborhood
    ? MARKET_DATA.find(
        (entry) =>
          normalizeText(entry.city) === normCity &&
          entry.neighborhood !== undefined &&
          normalizeText(entry.neighborhood) === normNeighborhood &&
          entry.property_type === "appartement" &&
          entry.transaction_type === "buy"
      )
    : undefined;

  if (neighborhoodMatch) {
    return {
      median_buy_appt: neighborhoodMatch.median_price_per_m2,
      confidence: confidenceFromMarket(neighborhoodMatch.confidence),
      fallback_label: "",
    };
  }

  const cityMatch = MARKET_DATA.find(
    (entry) =>
      normalizeText(entry.city) === normCity &&
      entry.neighborhood === undefined &&
      entry.property_type === "appartement" &&
      entry.transaction_type === "buy"
  );

  if (cityMatch) {
    return {
      median_buy_appt: cityMatch.median_price_per_m2,
      confidence: confidenceFromMarket(cityMatch.confidence),
      fallback_label: "",
    };
  }

  return {
    median_buy_appt: null,
    confidence: "low",
    fallback_label: "Repère indicatif bientôt disponible",
  };
}

function makeBenchmark(city: string, neighborhood: string | null): PriceBenchmark {
  const benchmark = findMarketBenchmark(city, neighborhood);
  return {
    ...benchmark,
    period: "Données 2024-2025",
  };
}

function makePriceSignal(city: string, neighborhood: string | null): NeighborhoodPriceSignal {
  const benchmark = makeBenchmark(city, neighborhood);
  if (benchmark.median_buy_appt != null) {
    return {
      label: `~${benchmark.median_buy_appt.toLocaleString("fr-FR")} DH/m²`,
      source: "benchmark_source",
      confidence: benchmark.confidence,
    };
  }

  return {
    label: benchmark.fallback_label,
    source: "not_available",
    confidence: "low",
  };
}

function makePoint(seed: NeighborhoodSeed): NeighborhoodPoint {
  const citySlug = slugifyCity(seed.city);
  const neighborhoodSlug = slugifyNeighborhood(seed.neighborhood);
  const slug = `${citySlug}-${neighborhoodSlug}`;
  return {
    ...seed,
    id: slug,
    citySlug,
    neighborhoodSlug,
    slug,
    searchHref: buildNeighborhoodSearchHref(seed.city, seed.searchNeighborhood ?? seed.neighborhood),
    benchmark: makeBenchmark(seed.city, seed.neighborhood),
    priceSignal: makePriceSignal(seed.city, seed.neighborhood),
    highlights: seed.proximityHighlights.map((label) => ({ icon: "•", label })),
  };
}

export const NEIGHBORHOOD_POINTS: NeighborhoodPoint[] = [
  makePoint({
    city: "Casablanca",
    neighborhood: "Finance City",
    lat: 33.5646,
    lng: -7.6293,
    confidence: "high",
    proximityHighlights: [
      "Attijariwafa Bank CFC",
      "Café Paul CFC",
      "Parc CFC",
      "Bus ligne CFC — Centre",
      "Mosquée Sidi Maârouf",
    ],
    lifestyleTags: ["bureau", "quartier d'affaires", "tram", "services"],
  }),
  makePoint({
    city: "Casablanca",
    neighborhood: "Maârif",
    lat: 33.5898,
    lng: -7.644,
    confidence: "high",
    proximityHighlights: ["Marjane Maârif", "Tram T1 — Maârif", "Pharmacie bd Zerktouni"],
    lifestyleTags: ["central", "commerces", "mobilité"],
  }),
  makePoint({
    city: "Casablanca",
    neighborhood: "Bouskoura",
    lat: 33.4547,
    lng: -7.6663,
    confidence: "medium",
    proximityHighlights: ["Golf Royal Bouskoura", "Carrefour Bouskoura", "École primaire Bouskoura"],
    lifestyleTags: ["villa", "résidentiel", "calme"],
  }),
  makePoint({
    city: "Rabat",
    neighborhood: "Hay Riad",
    lat: 33.949,
    lng: -6.8833,
    confidence: "high",
    proximityHighlights: ["Marjane Hay Riad", "Bus RATC — Hay Riad", "Parc Hay Riad"],
    lifestyleTags: ["administratif", "résidentiel", "familial"],
  }),
  makePoint({
    city: "Rabat",
    neighborhood: "Agdal",
    lat: 33.9959,
    lng: -6.8533,
    confidence: "high",
    proximityHighlights: ["Université Mohammed V", "Cafés bd Al Amir Fal", "Bus RATC — Agdal"],
    lifestyleTags: ["mixte", "étudiant", "commerces"],
  }),
  makePoint({
    city: "Rabat",
    neighborhood: "Hassan",
    lat: 34.0208,
    lng: -6.8415,
    confidence: "medium",
    proximityHighlights: ["Tour Hassan", "Mausolée Mohammed V", "Corniche de Rabat"],
    lifestyleTags: ["centre", "patrimoine", "transports"],
  }),
  makePoint({
    city: "Marrakech",
    neighborhood: "Guéliz",
    lat: 31.6347,
    lng: -8.0128,
    confidence: "high",
    proximityHighlights: ["Marjane Guéliz", "Cafés avenue Mohammed V", "Banques centre Guéliz"],
    lifestyleTags: ["central", "urbain", "commerces"],
  }),
  makePoint({
    city: "Marrakech",
    neighborhood: "Hivernage",
    lat: 31.6224,
    lng: -8.0067,
    confidence: "medium",
    proximityHighlights: ["Hôtels 5 étoiles", "Jardins de l'Hivernage", "Palais des Congrès"],
    lifestyleTags: ["premium", "hôtellerie", "loisirs"],
  }),
  makePoint({
    city: "Marrakech",
    neighborhood: "Route de l'Ourika",
    lat: 31.5333,
    lng: -7.9833,
    confidence: "medium",
    proximityHighlights: ["Vue Atlas", "Golf Royal", "Villas et domaines"],
    lifestyleTags: ["villa", "extérieur", "nature"],
    searchNeighborhood: "Ourika",
  }),
  makePoint({
    city: "Tanger",
    neighborhood: "Malabata",
    lat: 35.78,
    lng: -5.805,
    confidence: "medium",
    proximityHighlights: ["Plage Malabata", "Hôtels vue mer", "Taxis Malabata"],
    lifestyleTags: ["bord de mer", "hôtellerie", "transports"],
  }),
  makePoint({
    city: "Tanger",
    neighborhood: "Ville Nouvelle",
    lat: 35.7744,
    lng: -5.8067,
    confidence: "high",
    proximityHighlights: ["Centre commercial Tanger City", "Banques centre-ville", "Réseau bus CTM"],
    lifestyleTags: ["central", "services", "mobilité"],
  }),
  makePoint({
    city: "Agadir",
    neighborhood: "Founty",
    lat: 30.377,
    lng: -9.5669,
    confidence: "medium",
    proximityHighlights: ["Plage d'Agadir", "Souk El Had", "Zone hôtelière"],
    lifestyleTags: ["mer", "tourisme", "résidentiel"],
  }),
  makePoint({
    city: "Agadir",
    neighborhood: "Talborjt",
    lat: 30.4207,
    lng: -9.5989,
    confidence: "medium",
    proximityHighlights: ["Mosquée Talborjt", "Marché de quartier", "Bus urbain Agadir"],
    lifestyleTags: ["quartier", "proche centre", "services"],
  }),
  makePoint({
    city: "Fès",
    neighborhood: "Ville Nouvelle",
    lat: 34.0219,
    lng: -5.0077,
    confidence: "medium",
    proximityHighlights: ["Banques bd Mohammed V", "Commerces centre-ville", "Université Sidi Mohammed"],
    lifestyleTags: ["central", "services", "étudiant"],
  }),
  makePoint({
    city: "Fès",
    neighborhood: "Fès el-Bali",
    lat: 34.0656,
    lng: -4.9742,
    confidence: "low",
    proximityHighlights: ["Médina UNESCO", "Mosquée Karaouiyine", "Souks artisanaux"],
    lifestyleTags: ["patrimoine", "médina", "commerce traditionnel"],
  }),
  makePoint({
    city: "Kénitra",
    neighborhood: "Centre-ville",
    lat: 34.261,
    lng: -6.5802,
    confidence: "medium",
    proximityHighlights: ["Banques centre-ville", "Marché central", "Gare routière Kénitra"],
    lifestyleTags: ["centre", "services", "mobilité"],
  }),
  makePoint({
    city: "Mohammedia",
    neighborhood: "Centre",
    lat: 33.6866,
    lng: -7.3833,
    confidence: "medium",
    proximityHighlights: ["Plage Mohammedia", "Zone industrielle", "Gare Mohammedia"],
    lifestyleTags: ["côte", "services", "connexion"],
  }),
];

export function getNeighborhoods(): NeighborhoodPoint[] {
  return NEIGHBORHOOD_POINTS.slice();
}

export function getNeighborhoodsByCity(city: string): NeighborhoodPoint[] {
  const normalized = normalizeText(city);
  if (!normalized || normalized === "all") {
    return getNeighborhoods();
  }
  return NEIGHBORHOOD_POINTS.filter((point) => normalizeText(point.city) === normalized);
}

export function getNeighborhoodBySlug(
  citySlug: string,
  neighborhoodSlug: string
): NeighborhoodPoint | null {
  return (
    NEIGHBORHOOD_POINTS.find(
      (point) =>
        point.citySlug === slugifyCity(citySlug) &&
        point.neighborhoodSlug === slugifyNeighborhood(neighborhoodSlug)
    ) ?? null
  );
}

export function isKnownNeighborhood(city: string, neighborhood: string): boolean {
  return (
    getNeighborhoodBySlug(slugifyCity(city), slugifyNeighborhood(neighborhood)) != null ||
    NEIGHBORHOOD_POINTS.some(
      (point) => normalizeText(point.city) === normalizeText(city) && normalizeText(point.neighborhood) === normalizeText(neighborhood)
    )
  );
}

export function getNeighborhoodCities(): string[] {
  const cities = new Set<string>();
  for (const point of NEIGHBORHOOD_POINTS) {
    cities.add(point.city);
  }
  return Array.from(cities).sort((a, b) => a.localeCompare(b, "fr"));
}

export function getNeighborhoodCityEntries(): Array<{ city: string; citySlug: string }> {
  const cities = new Map<string, string>();
  for (const point of NEIGHBORHOOD_POINTS) {
    cities.set(point.citySlug, point.city);
  }
  return Array.from(cities.entries())
    .map(([citySlug, city]) => ({ city, citySlug }))
    .sort((a, b) => a.city.localeCompare(b.city, "fr"));
}

export function getNeighborhoodCitiesForPages(): Array<{
  city: string;
  citySlug: string;
  neighborhoods: NeighborhoodPoint[];
}> {
  return getNeighborhoodCityEntries().map(({ city, citySlug }) => ({
    city,
    citySlug,
    neighborhoods: getNeighborhoodsByCity(city),
  }));
}

export function filterNeighborhoodsByCity(city: string): NeighborhoodPoint[] {
  return getNeighborhoodsByCity(city);
}

export function getBenchmarkLabel(point: NeighborhoodPoint): string {
  return point.priceSignal.label;
}

export function getConfidenceLabel(confidence: DataConfidence): string {
  switch (confidence) {
    case "high":
      return "Données élevées";
    case "medium":
      return "Données moyennes";
    case "low":
      return "Données faibles";
  }
}

export function getNeighborhoodViews() {
  return NEIGHBORHOOD_POINTS.map((point) => ({
    ...point,
    searchHref: buildNeighborhoodSearchHref(point.city, point.neighborhood),
  }));
}

export const NEIGHBORHOOD_CITIES = CITIES;


