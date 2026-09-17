import type { CanonicalCitySlug } from "./geo-entity-registry";
import {
  NATIONAL_CITY_PRIORITY,
  getNationalCitiesVisibleAtZoom,
} from "./territory-city-priorities";

export type NationalCityVisibility = {
  citySlug: CanonicalCitySlug;
  importanceScore: number;
  zoomRelevance: number;
  visibilityScore: number;
  retained: boolean;
};

export type NationalVisibilityInput = {
  zoom: number;
  maxLabels: number;
};

export function computeZoomRelevance(minZoom: number, zoom: number): number {
  if (zoom < minZoom) return 0;
  const ramp = Math.min(1, Math.max(0, (zoom - minZoom) / 2));
  return Number((0.72 + ramp * 0.28).toFixed(4));
}

export function selectNationalCityVisibility({
  zoom,
  maxLabels,
}: NationalVisibilityInput): NationalCityVisibility[] {
  if (!Number.isFinite(zoom)) return [];
  if (!Number.isInteger(maxLabels) || maxLabels <= 0) return [];

  return getNationalCitiesVisibleAtZoom(zoom)
    .map((citySlug) => {
      const policy = NATIONAL_CITY_PRIORITY[citySlug];
      const zoomRelevance = computeZoomRelevance(policy.minZoom, zoom);
      return {
        citySlug,
        importanceScore: policy.score,
        zoomRelevance,
        visibilityScore: Number((policy.score * zoomRelevance).toFixed(4)),
        retained: policy.retainPriority,
      };
    })
    .sort((a, b) => {
      if (a.retained !== b.retained) return a.retained ? -1 : 1;
      if (a.visibilityScore !== b.visibilityScore) return b.visibilityScore - a.visibilityScore;
      if (a.importanceScore !== b.importanceScore) return b.importanceScore - a.importanceScore;
      return a.citySlug.localeCompare(b.citySlug);
    })
    .slice(0, maxLabels);
}
