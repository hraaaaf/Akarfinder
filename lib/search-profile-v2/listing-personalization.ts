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
  childrenCount: number | null;
  remoteWork: boolean;
  anchorLabels: string[];
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

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
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
    childrenCount: null,
    remoteWork: false,
    anchorLabels: [],
  };
}

export function finderProjectionFromProfile(value: unknown): FinderRankingProjection | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const profile = value as Record<string, unknown>;
  if (profile.version !== "2.0") return null;

  const location = profile.location && typeof profile.location === "object" && !Array.isArray(profile.location)
    ? profile.location as Record<string, unknown>
    : {};
  const property = profile.property && typeof profile.property === "object" && !Array.isArray(profile.property)
    ? profile.property as Record<string, unknown>
    : {};
  const budget = profile.budget && typeof profile.budget === "object" && !Array.isArray(profile.budget)
    ? profile.budget as Record<string, unknown>
    : {};
  const personalContext = profile.personal_context && typeof profile.personal_context === "object" && !Array.isArray(profile.personal_context)
    ? profile.personal_context as Record<string, unknown>
    : {};

  const preferredNeighborhoods = Array.isArray(location.preferred_neighborhoods) ? location.preferred_neighborhoods : [];
  const excludedNeighborhoods = Array.isArray(location.excluded_neighborhoods) ? location.excluded_neighborhoods : [];
  const anchors = Array.isArray(location.anchors) ? location.anchors : [];
  const preferences = Array.isArray(profile.neighborhood_preferences) ? profile.neighborhood_preferences : [];
  const intendedUsesSignal = profile.intended_uses && typeof profile.intended_uses === "object" && !Array.isArray(profile.intended_uses)
    ? profile.intended_uses as Record<string, unknown>
    : null;
  const childrenSignal = personalContext.children_count && typeof personalContext.children_count === "object" && !Array.isArray(personalContext.children_count)
    ? personalContext.children_count as Record<string, unknown>
    : null;
  const remoteSignal = personalContext.remote_work && typeof personalContext.remote_work === "object" && !Array.isArray(personalContext.remote_work)
    ? personalContext.remote_work as Record<string, unknown>
    : null;

  return {
    enabled: true,
    cities: stringArray(location.preferred_cities),
    neighborhoods: preferredNeighborhoods
      .map((item) => item && typeof item === "object" && !Array.isArray(item) ? (item as Record<string, unknown>).neighborhood : null)
      .filter((item): item is string => typeof item === "string"),
    excludedNeighborhoods: excludedNeighborhoods
      .map((item) => item && typeof item === "object" && !Array.isArray(item) ? (item as Record<string, unknown>).neighborhood : null)
      .filter((item): item is string => typeof item === "string"),
    propertyTypes: stringArray(property.property_types),
    priorities: stringArray(profile.priorities),
    preferences: preferences
      .map((item) => item && typeof item === "object" && !Array.isArray(item) ? (item as Record<string, unknown>).key : null)
      .filter((item): item is string => typeof item === "string"),
    requiredFeatures: stringArray(property.required_features),
    intendedUses: intendedUsesSignal ? stringArray(intendedUsesSignal.value) : [],
    budgetFlexPct: typeof budget.budget_flex_pct === "number" && Number.isFinite(budget.budget_flex_pct) ? Math.max(0, Math.min(50, budget.budget_flex_pct)) : 0,
    childrenCount: typeof childrenSignal?.value === "number" && Number.isFinite(childrenSignal.value) ? Math.max(0, childrenSignal.value) : null,
    remoteWork: remoteSignal?.value === true,
    anchorLabels: anchors
      .map((item) => item && typeof item === "object" && !Array.isArray(item) ? (item as Record<string, unknown>).label : null)
      .filter((item): item is string => typeof item === "string"),
  };
}

export function mergeFinderProjections(
  publicProjection: FinderRankingProjection | null,
  privateProjection: FinderRankingProjection | null,
): FinderRankingProjection | null {
  if (!publicProjection && !privateProjection) return null;
  if (!privateProjection) return publicProjection;
  if (!publicProjection) return privateProjection;
  return {
    ...privateProjection,
    enabled: publicProjection.enabled,
    cities: publicProjection.cities.length ? publicProjection.cities : privateProjection.cities,
    neighborhoods: publicProjection.neighborhoods.length ? publicProjection.neighborhoods : privateProjection.neighborhoods,
    excludedNeighborhoods: publicProjection.excludedNeighborhoods.length ? publicProjection.excludedNeighborhoods : privateProjection.excludedNeighborhoods,
    propertyTypes: publicProjection.propertyTypes.length ? publicProjection.propertyTypes : privateProjection.propertyTypes,
    priorities: publicProjection.priorities.length ? publicProjection.priorities : privateProjection.priorities,
    preferences: publicProjection.preferences.length ? publicProjection.preferences : privateProjection.preferences,
    requiredFeatures: publicProjection.requiredFeatures.length ? publicProjection.requiredFeatures : privateProjection.requiredFeatures,
    intendedUses: publicProjection.intendedUses.length ? publicProjection.intendedUses : privateProjection.intendedUses,
    budgetFlexPct: publicProjection.budgetFlexPct || privateProjection.budgetFlexPct,
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
  remote_work: ["bureau", "fibre", "internet", "workspace", "teletravail"],
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
  const text = listingText(listing);

  if (projection.cities.some((value) => normalize(value) === city)) score += 30;
  if (projection.neighborhoods.some((value) => normalize(value) === neighborhood)) score += 28;
  if (projection.excludedNeighborhoods.some((value) => normalize(value) === neighborhood)) score -= 45;
  if (projection.propertyTypes.some((value) => normalize(value) === propertyType)) score += 24;

  for (const feature of projection.requiredFeatures) {
    score += featureMatches(listing, feature) ? 8 : -3;
  }

  const preferenceSet = new Set([...projection.preferences, ...projection.priorities]);
  for (const key of preferenceSet) {
    if (textMatches(text, key)) score += projection.priorities.includes(key) ? 8 : 4;
  }

  if (projection.intendedUses.includes("family_housing") && textMatches(text, "family_fit")) score += 6;
  if (projection.intendedUses.includes("student_housing") && textMatches(text, "student_fit")) score += 6;
  if (projection.intendedUses.includes("long_term_rental_investment") && textMatches(text, "long_term_rental_fit")) score += 5;
  if ((projection.childrenCount ?? 0) > 0 && textMatches(text, "family_fit")) score += 8;
  if (projection.remoteWork && textMatches(text, "remote_work")) score += 5;
  for (const anchor of projection.anchorLabels) {
    const normalizedAnchor = normalize(anchor);
    if (normalizedAnchor.length >= 3 && text.includes(normalizedAnchor)) score += 4;
  }

  return score;
}

export function rankListingsWithFinderProjection(listings: Listing[], projection: FinderRankingProjection | null): Listing[] {
  if (!projection?.enabled) return listings;
  return listings
    .map((listing, index) => ({ listing, index, score: scoreListingForFinder(listing, projection) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((item) => item.listing);
}

export function rankListingsForFinder(listings: Listing[], params: URLSearchParams | null): Listing[] {
  return rankListingsWithFinderProjection(listings, params ? finderProjectionFromSearchParams(params) : null);
}
