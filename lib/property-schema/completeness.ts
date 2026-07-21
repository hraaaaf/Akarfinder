import type { CanonicalFact, CanonicalOfferV1, CanonicalPropertyV1, CanonicalPropertyType } from "./core";

export type InformationLevel = "limited" | "partial" | "detailed" | "very_detailed";

export interface CompletenessResultV1 {
  score: number;
  level: InformationLevel;
  public_label: "Informations limitées" | "Informations partielles" | "Informations détaillées" | "Informations très détaillées";
  measured_as: "information_completeness";
  present_weight: number;
  total_weight: number;
  missing_keys: string[];
  notes: string[];
}

type Check = { key: string; weight: number; fact?: CanonicalFact<unknown>; value?: unknown };

function isPresent(check: Check): boolean {
  if (check.fact) return check.fact.value !== null && check.fact.value !== undefined && check.fact.value !== "";
  return check.value !== null && check.value !== undefined && check.value !== "";
}

function conditionalChecks(property: CanonicalPropertyV1, offer?: CanonicalOfferV1): Check[] {
  const f = property.facts;
  const propertyType = f.classification.property_type.value;
  const base: Check[] = [
    { key: "property_type", weight: 8, fact: f.classification.property_type },
    { key: "market_segment", weight: 3, fact: f.classification.market_segment },
    { key: "city", weight: 8, fact: f.location.city },
    { key: "district", weight: 5, fact: f.location.district },
    { key: "surface", weight: 10, fact: f.surfaces.surface_total_m2 ?? f.surfaces.surface_built_m2 ?? f.surfaces.surface_habitable_m2 },
    { key: "rooms", weight: 4, fact: f.layout.rooms_count },
    { key: "bedrooms", weight: 5, fact: f.layout.bedrooms_count },
    { key: "bathrooms", weight: 4, fact: f.layout.bathrooms_count },
    { key: "condition", weight: 5, fact: f.condition.condition },
    { key: "orientation", weight: 3, fact: f.building.orientation },
    { key: "geo_precision", weight: 3, fact: f.location.geo_precision },
    { key: "price", weight: 10, fact: offer?.price_amount },
    { key: "title", weight: 5, fact: offer?.title },
    { key: "description", weight: 5, fact: offer?.description },
    { key: "availability", weight: 4, value: offer?.availability_status === "unknown" ? null : offer?.availability_status },
    { key: "fresh_observation", weight: 3, value: offer?.last_observed_at },
  ];

  const add = (typeSet: CanonicalPropertyType[], checks: Check[]) => {
    if (propertyType && typeSet.includes(propertyType)) base.push(...checks);
  };

  add(["apartment", "studio", "duplex", "office", "commercial"], [
    { key: "floor_number", weight: 3, fact: f.building.floor_number },
    { key: "elevator", weight: 2, fact: f.features.has_elevator },
    { key: "parking", weight: 2, fact: f.features.has_parking },
  ]);
  add(["villa", "house", "riad", "farm"], [
    { key: "land_surface", weight: 5, fact: f.surfaces.surface_land_m2 },
    { key: "garden", weight: 2, fact: f.features.has_garden },
    { key: "garage", weight: 2, fact: f.features.has_garage },
  ]);
  add(["land", "farm"], [
    { key: "zoning", weight: 5, fact: f.land.zoning_type },
    { key: "constructible_status", weight: 5, fact: f.land.constructible_status },
    { key: "road_access", weight: 3, fact: f.land.road_access_width_m },
  ]);

  return base;
}

export function computeInformationCompleteness(
  property: CanonicalPropertyV1,
  offer: CanonicalOfferV1 | undefined = property.offers[0],
): CompletenessResultV1 {
  const checks = conditionalChecks(property, offer);
  const totalWeight = checks.reduce((sum, item) => sum + item.weight, 0);
  const presentWeight = checks.filter(isPresent).reduce((sum, item) => sum + item.weight, 0);
  const score = totalWeight === 0 ? 0 : Math.round((presentWeight / totalWeight) * 100);
  const level: InformationLevel = score >= 85 ? "very_detailed" : score >= 65 ? "detailed" : score >= 35 ? "partial" : "limited";
  const labels: Record<InformationLevel, CompletenessResultV1["public_label"]> = {
    limited: "Informations limitées",
    partial: "Informations partielles",
    detailed: "Informations détaillées",
    very_detailed: "Informations très détaillées",
  };

  return {
    score,
    level,
    public_label: labels[level],
    measured_as: "information_completeness",
    present_weight: presentWeight,
    total_weight: totalWeight,
    missing_keys: checks.filter((item) => !isPresent(item)).map((item) => item.key),
    notes: [
      "Ce score mesure la présence d'informations utiles, pas leur véracité absolue.",
      "Il ne doit jamais être présenté comme un score de fiabilité ou de certification.",
    ],
  };
}
