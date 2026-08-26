import type { LivingHereCategory } from "@/lib/geo/living-here";
import type { NeighborhoodContextAnchorReadV1 } from "@/lib/neighborhood-context/read-model";

export type NeighborhoodMapPoiFilter =
  | "all"
  | "transport"
  | "education"
  | "health"
  | "groceries"
  | "green_sport"
  | "services";

export const NEIGHBORHOOD_MAP_POI_FILTER_META: ReadonlyArray<{
  id: NeighborhoodMapPoiFilter;
  label: string;
}> = [
  { id: "all", label: "Tous" },
  { id: "transport", label: "Transport" },
  { id: "education", label: "Éducation" },
  { id: "health", label: "Santé" },
  { id: "groceries", label: "Courses" },
  { id: "green_sport", label: "Parcs & sport" },
  { id: "services", label: "Services" },
] as const;

const DIRECT_FILTERS = new Set<NeighborhoodMapPoiFilter>([
  "transport",
  "education",
  "health",
  "groceries",
  "green_sport",
]);

export function mapPoiFilterForCategory(category: LivingHereCategory): Exclude<NeighborhoodMapPoiFilter, "all"> {
  if (DIRECT_FILTERS.has(category as NeighborhoodMapPoiFilter)) {
    return category as Exclude<NeighborhoodMapPoiFilter, "all">;
  }
  return "services";
}

export function availableMapPoiFilters(
  anchors: readonly NeighborhoodContextAnchorReadV1[],
): NeighborhoodMapPoiFilter[] {
  if (!anchors.length) return [];
  const present = new Set(anchors.map((anchor) => mapPoiFilterForCategory(anchor.category)));
  return [
    "all",
    ...NEIGHBORHOOD_MAP_POI_FILTER_META
      .map((item) => item.id)
      .filter((id): id is Exclude<NeighborhoodMapPoiFilter, "all"> => id !== "all" && present.has(id)),
  ];
}

export function filterMapPoiAnchors(
  anchors: readonly NeighborhoodContextAnchorReadV1[],
  filter: NeighborhoodMapPoiFilter,
): NeighborhoodContextAnchorReadV1[] {
  const eligible = anchors
    .filter((anchor) => anchor.freshness_status === "fresh")
    .sort((a, b) => a.rank - b.rank)
    .filter((anchor) => filter === "all" || mapPoiFilterForCategory(anchor.category) === filter);
  return eligible.slice(0, 8);
}

export function formatMapPoiDistance(distanceMeters: number | null): string | null {
  if (distanceMeters == null || !Number.isFinite(distanceMeters) || distanceMeters < 0) return null;
  if (distanceMeters < 1000) return `${Math.round(distanceMeters / 10) * 10} m`;
  return `${(distanceMeters / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km`;
}

export function mapPoiCategoryLabel(category: LivingHereCategory): string {
  switch (mapPoiFilterForCategory(category)) {
    case "transport": return "Transport";
    case "education": return "Éducation";
    case "health": return "Santé";
    case "groceries": return "Courses & marchés";
    case "green_sport": return "Parcs & sport";
    case "services": return "Services";
  }
}

export function mapPoiCategorySymbol(category: LivingHereCategory): string {
  switch (mapPoiFilterForCategory(category)) {
    case "transport": return "T";
    case "education": return "É";
    case "health": return "+";
    case "groceries": return "C";
    case "green_sport": return "P";
    case "services": return "S";
  }
}
