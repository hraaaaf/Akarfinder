import type { CanonicalOfferV1, CanonicalPropertyV1, PropertyIntelligenceV1 } from "./core";

export function getPreferredSurfaceM2(property: CanonicalPropertyV1): number | null {
  const s = property.facts.surfaces;
  const candidates = [
    s.surface_habitable_m2?.value,
    s.surface_total_m2?.value,
    s.surface_built_m2?.value,
    s.surface_land_m2?.value,
  ];
  for (const value of candidates) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  }
  return null;
}

export function derivePricePerM2(property: CanonicalPropertyV1, offer?: CanonicalOfferV1): number | null {
  const selected = offer ?? property.offers[0];
  const price = selected?.price_status === "valid" ? selected.price_amount.value : null;
  const surface = getPreferredSurfaceM2(property);
  if (typeof price !== "number" || price <= 0 || surface == null) return null;
  return Math.round(price / surface);
}

export function buildBasePropertyIntelligence(
  property: CanonicalPropertyV1,
  offer: CanonicalOfferV1 | undefined = property.offers[0],
  now = new Date().toISOString(),
): PropertyIntelligenceV1 {
  const pricePerM2 = derivePricePerM2(property, offer);
  return {
    property_id: property.property_id,
    computed_at: now,
    price_per_m2: pricePerM2,
    price_per_m2_method: pricePerM2 == null ? "unavailable" : "price_divided_by_surface",
    market_position: null,
    market_reference_id: null,
    data_completeness_score: null,
    freshness_score: null,
    duplicate_score: null,
    anomaly_score: null,
    akar_score: null,
    listing_conclusion: null,
    property_fit_score: null,
    investment_score: null,
    mre_score: null,
  };
}

export function enrichWithoutInventing(property: CanonicalPropertyV1): CanonicalPropertyV1 {
  return {
    ...property,
    intelligence: buildBasePropertyIntelligence(property),
  };
}
