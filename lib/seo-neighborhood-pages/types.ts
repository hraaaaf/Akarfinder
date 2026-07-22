export type DistrictSlug =
  | "maarif"
  | "racine"
  | "ain-diab"
  | "bourgogne"
  | "agdal"
  | "souissi"
  | "hay-riad"
  | "gueliz"
  | "hivernage"
  | "malabata"
  | "founty";

export interface NeighborhoodIntelligenceSummary {
  priceLabel?: string;
  pricePeriod?: string;
  confidence?: "high" | "medium" | "low";
  lifestyleTags?: string[];
  proximityHighlights?: string[];
}

export interface NeighborhoodMetadata {
  slug: DistrictSlug;
  displayName: string;
  citySlug: string;
  cityDisplayName: string;
  description: string;
  propertyTypes: string[];
  nearbyDistricts: DistrictSlug[];
  intelligence?: NeighborhoodIntelligenceSummary;
}

export interface NeighborhoodSeoMeta {
  title: string;
  description: string;
  canonical: string;
  ogTitle: string;
  ogDescription: string;
}

const VALID_DISTRICT_SLUGS: DistrictSlug[] = [
  "maarif",
  "racine",
  "ain-diab",
  "bourgogne",
  "agdal",
  "souissi",
  "hay-riad",
  "gueliz",
  "hivernage",
  "malabata",
  "founty",
];

export function isValidDistrictSlug(slug: unknown): slug is DistrictSlug {
  return typeof slug === "string" && VALID_DISTRICT_SLUGS.includes(slug as DistrictSlug);
}

export function getValidDistrictSlugs(): DistrictSlug[] {
  return [...VALID_DISTRICT_SLUGS];
}
