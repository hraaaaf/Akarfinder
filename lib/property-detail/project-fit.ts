import type { Listing } from "@/lib/listings/types";
import type { DynamicSearchProfileV2 } from "@/lib/search-profile-v2/types";

export type ProjectFitReasonStatus = "match" | "mismatch" | "unknown";

export type ProjectFitReason = {
  key: "city" | "budget" | "property_type" | "surface" | "bedrooms" | "feature";
  label: string;
  status: ProjectFitReasonStatus;
  detail: string;
};

export type ProjectFitModel = {
  available: boolean;
  score: number | null;
  evaluatedCount: number;
  matchedCount: number;
  mismatchCount: number;
  reasons: ProjectFitReason[];
};

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("fr");
}

function formatMad(value: number): string {
  return `${Math.round(value).toLocaleString("fr-FR")} DH`;
}

function reason(
  key: ProjectFitReason["key"],
  label: string,
  status: ProjectFitReasonStatus,
  detail: string,
): ProjectFitReason {
  return { key, label, status, detail };
}

function budgetForProfile(profile: DynamicSearchProfileV2): number | null {
  const objective = profile.objective?.value ?? null;
  if (objective === "rent") return profile.budget.rent_monthly_max_mad;
  if (objective === "buy" || objective === "invest" || objective === "new_build") {
    return profile.budget.purchase_max_mad;
  }
  return profile.budget.purchase_max_mad ?? profile.budget.rent_monthly_max_mad;
}

function evaluateRequiredFeature(feature: string, listing: Listing): ProjectFitReason {
  const normalized = normalize(feature);
  if (normalized === "parking" || normalized === "garage") {
    if (typeof listing.garage_spaces === "number") {
      return listing.garage_spaces > 0
        ? reason("feature", "Parking", "match", "Parking disponible")
        : reason("feature", "Parking", "mismatch", "Parking requis mais non présent");
    }
    const premium = (listing.premium_features ?? []).map(normalize);
    if (premium.some((item) => item.includes("parking") || item.includes("garage"))) {
      return reason("feature", "Parking", "match", "Parking indiqué dans les équipements");
    }
    return reason("feature", "Parking", "unknown", "Information parking non vérifiable");
  }

  if (normalized === "elevator" || normalized === "ascenseur") {
    return reason("feature", "Ascenseur", "unknown", "Information ascenseur non disponible dans la fiche canonique");
  }

  const premium = (listing.premium_features ?? []).map(normalize);
  if (premium.length === 0) {
    return reason("feature", feature, "unknown", `${feature} non vérifiable`);
  }
  return premium.some((item) => item === normalized || item.includes(normalized))
    ? reason("feature", feature, "match", `${feature} indiqué dans les équipements`)
    : reason("feature", feature, "mismatch", `${feature} requis mais non indiqué`);
}

export function buildProjectFitModel(profile: DynamicSearchProfileV2 | null | undefined, listing: Listing): ProjectFitModel {
  if (!profile || profile.version !== "2.0") {
    return { available: false, score: null, evaluatedCount: 0, matchedCount: 0, mismatchCount: 0, reasons: [] };
  }

  const reasons: ProjectFitReason[] = [];

  if (profile.location.preferred_cities.length > 0) {
    const listingCity = normalize(listing.city);
    const allowedCities = profile.location.preferred_cities.map(normalize);
    reasons.push(
      allowedCities.includes(listingCity)
        ? reason("city", "Zone", "match", `${listing.city} fait partie de votre zone`)
        : reason("city", "Zone", "mismatch", `${listing.city} est hors de votre zone préférée`),
    );
  }

  const profileBudget = budgetForProfile(profile);
  if (profileBudget != null && listing.price != null && Number.isFinite(listing.price)) {
    const flex = Math.min(Math.max(profile.budget.budget_flex_pct, 0), 50);
    const effectiveMax = profileBudget * (1 + flex / 100);
    reasons.push(
      listing.price <= effectiveMax
        ? reason("budget", "Budget", "match", `${formatMad(listing.price)} dans votre budget`)
        : reason("budget", "Budget", "mismatch", `${formatMad(listing.price)} dépasse votre plafond${flex > 0 ? " avec flexibilité" : ""}`),
    );
  }

  if (profile.property.property_types.length > 0) {
    const listingType = normalize(listing.property_type);
    const allowedTypes = profile.property.property_types.map(normalize);
    reasons.push(
      allowedTypes.includes(listingType)
        ? reason("property_type", "Type", "match", `${listing.property_type} correspond au type recherché`)
        : reason("property_type", "Type", "mismatch", `${listing.property_type} ne correspond pas aux types recherchés`),
    );
  }

  if (profile.property.min_surface_m2 != null && Number.isFinite(listing.surface_m2) && listing.surface_m2 > 0) {
    const minimum = profile.property.min_surface_m2;
    const delta = Math.round(listing.surface_m2 - minimum);
    reasons.push(
      listing.surface_m2 >= minimum
        ? reason("surface", "Surface", "match", `${listing.surface_m2} m², soit ${delta} m² au-dessus de votre minimum`)
        : reason("surface", "Surface", "mismatch", `${Math.abs(delta)} m² sous votre minimum de ${minimum} m²`),
    );
  }

  if (profile.property.min_bedrooms != null && Number.isFinite(listing.bedrooms) && listing.bedrooms >= 0) {
    const minimum = profile.property.min_bedrooms;
    reasons.push(
      listing.bedrooms >= minimum
        ? reason("bedrooms", "Chambres", "match", `${listing.bedrooms} chambre${listing.bedrooms > 1 ? "s" : ""} pour un minimum de ${minimum}`)
        : reason("bedrooms", "Chambres", "mismatch", `${listing.bedrooms} chambre${listing.bedrooms > 1 ? "s" : ""}, minimum recherché ${minimum}`),
    );
  }

  for (const feature of profile.property.required_features) {
    reasons.push(evaluateRequiredFeature(feature, listing));
  }

  const evaluated = reasons.filter((item) => item.status !== "unknown");
  const matchedCount = evaluated.filter((item) => item.status === "match").length;
  const mismatchCount = evaluated.filter((item) => item.status === "mismatch").length;
  const score = evaluated.length >= 2 ? Math.round((matchedCount / evaluated.length) * 100) : null;

  return {
    available: reasons.length > 0,
    score,
    evaluatedCount: evaluated.length,
    matchedCount,
    mismatchCount,
    reasons,
  };
}
