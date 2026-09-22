import type { CanonicalCitySlug } from "@/lib/geo/geo-entity-registry";

export type NationalCountryHubPolicy = {
  slug: CanonicalCitySlug;
  descriptor: string;
  order: number;
};

export const NATIONAL_COUNTRY_HUBS = [
  { slug: "casablanca", descriptor: "Économie · Affaires · Littoral", order: 1 },
  { slug: "rabat", descriptor: "Administration · Cadre de vie", order: 2 },
  { slug: "tanger", descriptor: "Ouverture internationale · Littoral", order: 3 },
  { slug: "marrakech", descriptor: "Tourisme · Art de vivre", order: 4 },
  { slug: "fes", descriptor: "Patrimoine · Éducation", order: 5 },
  { slug: "agadir", descriptor: "Littoral · Tourisme", order: 6 },
  { slug: "kenitra", descriptor: "Connectivité · Croissance", order: 7 },
  { slug: "mohammedia", descriptor: "Industrie · Littoral", order: 8 },
] as const satisfies readonly NationalCountryHubPolicy[];

const HUB_BY_SLUG = new Map<string, NationalCountryHubPolicy>(
  NATIONAL_COUNTRY_HUBS.map((hub) => [hub.slug, hub]),
);

export function getNationalCountryHubPolicy(slug: string) {
  return HUB_BY_SLUG.get(slug) ?? null;
}

export function isNationalCountryHub(slug: string): slug is (typeof NATIONAL_COUNTRY_HUBS)[number]["slug"] {
  return HUB_BY_SLUG.has(slug);
}
