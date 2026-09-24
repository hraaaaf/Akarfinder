import type { CanonicalCitySlug } from "./geo-entity-registry";

export type MoroccoRegionSlug =
  | "tanger-tetouan-al-hoceima"
  | "oriental"
  | "fes-meknes"
  | "rabat-sale-kenitra"
  | "beni-mellal-khenifra"
  | "casablanca-settat"
  | "marrakech-safi"
  | "draa-tafilalet"
  | "souss-massa"
  | "guelmim-oued-noun"
  | "laayoune-sakia-el-hamra"
  | "dakhla-oued-ed-dahab";

export type MoroccoRegionEntity = {
  slug: MoroccoRegionSlug;
  canonical_name: string;
  authority: "HCP_12_REGION_FRAMEWORK";
};

export const MOROCCO_REGIONS: readonly MoroccoRegionEntity[] = [
  { slug: "tanger-tetouan-al-hoceima", canonical_name: "Tanger-Tétouan-Al Hoceïma", authority: "HCP_12_REGION_FRAMEWORK" },
  { slug: "oriental", canonical_name: "Oriental", authority: "HCP_12_REGION_FRAMEWORK" },
  { slug: "fes-meknes", canonical_name: "Fès-Meknès", authority: "HCP_12_REGION_FRAMEWORK" },
  { slug: "rabat-sale-kenitra", canonical_name: "Rabat-Salé-Kénitra", authority: "HCP_12_REGION_FRAMEWORK" },
  { slug: "beni-mellal-khenifra", canonical_name: "Béni Mellal-Khénifra", authority: "HCP_12_REGION_FRAMEWORK" },
  { slug: "casablanca-settat", canonical_name: "Casablanca-Settat", authority: "HCP_12_REGION_FRAMEWORK" },
  { slug: "marrakech-safi", canonical_name: "Marrakech-Safi", authority: "HCP_12_REGION_FRAMEWORK" },
  { slug: "draa-tafilalet", canonical_name: "Drâa-Tafilalet", authority: "HCP_12_REGION_FRAMEWORK" },
  { slug: "souss-massa", canonical_name: "Souss-Massa", authority: "HCP_12_REGION_FRAMEWORK" },
  { slug: "guelmim-oued-noun", canonical_name: "Guelmim-Oued Noun", authority: "HCP_12_REGION_FRAMEWORK" },
  { slug: "laayoune-sakia-el-hamra", canonical_name: "Laâyoune-Sakia El Hamra", authority: "HCP_12_REGION_FRAMEWORK" },
  { slug: "dakhla-oued-ed-dahab", canonical_name: "Dakhla-Oued Ed-Dahab", authority: "HCP_12_REGION_FRAMEWORK" },
] as const;

export const CANONICAL_CITY_REGION: Readonly<Record<CanonicalCitySlug, MoroccoRegionSlug>> = {
  casablanca: "casablanca-settat",
  rabat: "rabat-sale-kenitra",
  marrakech: "marrakech-safi",
  tanger: "tanger-tetouan-al-hoceima",
  agadir: "souss-massa",
  fes: "fes-meknes",
  kenitra: "rabat-sale-kenitra",
  mohammedia: "casablanca-settat",
  sale: "rabat-sale-kenitra",
  temara: "rabat-sale-kenitra",
  meknes: "fes-meknes",
  tetouan: "tanger-tetouan-al-hoceima",
  oujda: "oriental",
  "el-jadida": "casablanca-settat",
  nador: "oriental",
  essaouira: "marrakech-safi",
  bouskoura: "casablanca-settat",
  bouznika: "casablanca-settat",
  azrou: "fes-meknes",
};

export function getMoroccoRegion(slug: MoroccoRegionSlug): MoroccoRegionEntity {
  const region = MOROCCO_REGIONS.find((candidate) => candidate.slug === slug);
  if (!region) throw new Error(`Unknown Morocco region: ${slug}`);
  return region;
}

export function getRegionForCanonicalCity(citySlug: CanonicalCitySlug): MoroccoRegionEntity {
  return getMoroccoRegion(CANONICAL_CITY_REGION[citySlug]);
}
