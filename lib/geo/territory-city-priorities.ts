import type { CanonicalCitySlug } from "./geo-entity-registry";
import type { TerritoryImportanceTier } from "./territory-dictionary";

export type NationalCityPriority = {
  score: number;
  tier: TerritoryImportanceTier;
  minZoom: number;
  retainPriority: boolean;
};

/**
 * Product/cartographic priority, not a demographic ranking.
 *
 * The first six cities mirror AkarFinder's existing primary city surface.
 * Lower tiers are only a deterministic reveal order for the map. External
 * demographic or market claims must never be inferred from these scores.
 */
export const NATIONAL_CITY_PRIORITY: Record<CanonicalCitySlug, NationalCityPriority> = {
  casablanca: { score: 100, tier: "flagship", minZoom: 4.0, retainPriority: true },
  rabat: { score: 98, tier: "flagship", minZoom: 4.0, retainPriority: true },
  marrakech: { score: 96, tier: "flagship", minZoom: 4.0, retainPriority: true },
  tanger: { score: 94, tier: "flagship", minZoom: 4.0, retainPriority: true },
  agadir: { score: 92, tier: "flagship", minZoom: 4.2, retainPriority: true },
  fes: { score: 90, tier: "flagship", minZoom: 4.2, retainPriority: true },

  meknes: { score: 82, tier: "major", minZoom: 5.0, retainPriority: false },
  kenitra: { score: 80, tier: "major", minZoom: 5.0, retainPriority: false },
  tetouan: { score: 78, tier: "major", minZoom: 5.2, retainPriority: false },
  oujda: { score: 77, tier: "major", minZoom: 5.2, retainPriority: false },
  "el-jadida": { score: 76, tier: "major", minZoom: 5.2, retainPriority: false },
  nador: { score: 74, tier: "major", minZoom: 5.5, retainPriority: false },

  sale: { score: 72, tier: "regional", minZoom: 5.7, retainPriority: false },
  temara: { score: 70, tier: "regional", minZoom: 5.7, retainPriority: false },
  mohammedia: { score: 68, tier: "regional", minZoom: 5.7, retainPriority: false },
  essaouira: { score: 66, tier: "regional", minZoom: 6.0, retainPriority: false },

  bouskoura: { score: 60, tier: "local", minZoom: 6.5, retainPriority: false },
  bouznika: { score: 58, tier: "local", minZoom: 6.8, retainPriority: false },
  azrou: { score: 55, tier: "local", minZoom: 7.0, retainPriority: false },
};

export function getNationalCityPriority(citySlug: CanonicalCitySlug): NationalCityPriority {
  return NATIONAL_CITY_PRIORITY[citySlug];
}

export function getNationalCityRevealOrder(): CanonicalCitySlug[] {
  return (Object.entries(NATIONAL_CITY_PRIORITY) as [CanonicalCitySlug, NationalCityPriority][])
    .sort(([, a], [, b]) => b.score - a.score)
    .map(([slug]) => slug);
}

export function getNationalCitiesVisibleAtZoom(zoom: number): CanonicalCitySlug[] {
  return getNationalCityRevealOrder().filter(
    (slug) => zoom >= NATIONAL_CITY_PRIORITY[slug].minZoom,
  );
}
