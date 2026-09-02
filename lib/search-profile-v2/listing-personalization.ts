import type { Listing } from "@/lib/listings/types";

export type FinderRankingProjection = {
  enabled: boolean;
  cities: string[];
  neighborhoods: string[];
  excludedNeighborhoods: string[];
  propertyTypes: string[];
  priorities: string[];
  preferences: string[];
  requiredFeatures: string[];
  intendedUses: string[];
  budgetFlexPct: number;
};

function splitCsv(value: string | null): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalize(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function parseNeighborhoodPairs(value: string | null): string[] {
  return (value ?? "")
    .split("|")
    .map((item) => item.split(":").slice(1).join(":").trim())
    .filter(Boolean);
}

function parsePreferenceKeys(value: string | null): string[] {
  return (value ?? "")
    .split("|")
    .map((item) => item.split(":")[0]?.trim())
    .filter(Boolean);
}

export function finderProjectionFromSearchParams(params: URLSearchParams): FinderRankingProjection | null {
  const guided = params.get("guided") === "1" || params.has("profile_version");
  if (!guided) return null;

  const enabled = params.get("personalized") !== "0";
  const budgetFlexRaw = Number(params.get("profile_budget_flex_pct") ?? 0);
  return {
    enabled,
    cities: splitCsv(params.get("profile_cities") ?? params.get("city")),
    neighborhoods: parseNeighborhoodPairs(params.get("profile_neighborhoods")),
    excludedNeighborhoods: parseNeighborhoodPairs(params.get("profile_excluded_neighborhoods")),
    propertyTypes: splitCsv(params.get("profile_property_types") ?? params.get("property_type")),
    priorities: splitCsv(params.get("profile_priorities")),
    preferences: parsePreferenceKeys(params.get("profile_neighborhood_preferences")),
    requiredFeatures: splitCsv(params.get("profile_required_features")),
    intendedUses: splitCsv(params.get("profile_intended_uses")),
    budgetFlexPct: Number.isFinite(budgetFlexRaw) && budgetFlexRaw > 0 ? Math.min(50, budgetFlexRaw) : 0,
  };
}

const KEYWORDS: Record<string, string[]> = {
  calmness: ["calme", "tranquille", "residentiel", "silencieux"],
  family_fit: ["famille", "familial", "ecole", "jardin", "residence securisee"],
  walkability: ["a pied", "proche commerces", "centre", "central"],
  commerce_access: ["commerce", "supermarche", "marjane", "carrefour", "mall"],
  school_access: ["ecole", "lycee", "college", "universite"],
  public_transport: ["tram", "gare", "bus", "transport"],
  greenery: ["jardin", "parc", "espace vert", "verdure"],
  coastal_lifestyle: ["mer", "plage", "corniche", "ocean"],
  centrality: ["centre", "central", "centre-ville", "downtown"],
  car_accessibility: ["parking", "garage", "acces voiture"],
  student_fit: ["universite", "faculte", "etudiant", "campus"],
  mre_fit: ["mre", "etranger", "distance"],
  corporate_fit: ["bureau", "business", "quartier d'affaires"],
  long_term_rental_fit: ["location longue duree", "rendement locatif"],
};

function listingText(listing: Listing): string {
  return normalize([
    listing.title,
    listing.city,
    listing.neighborhood,
    listing.description,
    listing.neighborhood_summary,
    ...(listing.premium_features ?? []),
  ].filter(Boolean).join(" "));
}

function textMatches(text: string, key: string): boolean {
  return (KEYWORDS[key] ?? []).some((keyword) => text.includes(normalize(keyword)));
}

function featureMatches(listing: Listing, feature: string): boolean {
  const text = listingText(listing);
  const normalizedFeature = normalize(feature);
  if (normalizedFeature === "parking") return text.includes("parking") || text.includes("garage") || (listing.garage_spaces ?? 0) > 0;
  if (normalizedFeature === "elevator") return text.includes("ascenseur");
  return text.includes(normalizedFeature);
}

export function scoreListingForFinder(listing: Listing, projection: FinderRankingProjection): number {
  if (!projection.enabled) return 0;
  let score = 0;
  const city = normalize(listing.city);
  const neighborhood = normalize(listing.neighborhood || listing.district);
  const propertyType = normalize(listing.property_type);

  if (projection.cities.some((value) => normalize(value) === city)) score += 30;
  if (projection.neighborhoods.some((value) => normalize(value) === neighborhood)) score += 28;
  if (projection.excludedNeighborhoods.some((value) => normalize(value) === neighborhood)) score -= 45;
  if (projection.propertyTypes.some((value) => normalize(value) === propertyType)) score += 24;

  for (const feature of projection.requiredFeatures) {
    score += featureMatches(listing, feature) ? 8 : -3;
  }

  const preferenceSet = new Set([...projection.preferences, ...projection.priorities]);
  for (const key of preferenceSet) {
    if (textMatches(listingText(listing), key)) {
      score += projection.priorities.includes(key) ? 8 : 4;
    }
  }

  if (projection.intendedUses.includes("family_housing") && textMatches(listingText(listing), "family_fit")) score += 6;
  if (projection.intendedUses.includes("student_housing") && textMatches(listingText(listing), "student_fit")) score += 6;
  if (projection.intendedUses.includes("long_term_rental_investment") && textMatches(listingText(listing), "long_term_rental_fit")) score += 5;

  return score;
}

export function rankListingsForFinder(listings: Listing[], params?: URLSearchParams | null): Listing[] {
  if (!params && typeof window !== "undefined") params = new URLSearchParams(window.location.search);
  if (!params) return listings;
  const projection = finderProjectionFromSearchParams(params);
  if (!projection?.enabled) return listings;

  return listings
    .map((listing, index) => ({ listing, index, score: scoreListingForFinder(listing, projection) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((item) => item.listing);
}
