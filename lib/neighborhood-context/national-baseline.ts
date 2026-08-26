import {
  GEO_CITIES,
  GEO_NEIGHBORHOODS,
  type CanonicalCitySlug,
  type CanonicalNeighborhoodEntity,
} from "@/lib/geo/geo-entity-registry";
import { LIVING_HERE_CATEGORY_LABELS, type LivingHereCategory } from "@/lib/geo/living-here";
import {
  buildNeighborhoodContextRuntimeCatalog,
  type NeighborhoodContextCoverageStatus,
  type NeighborhoodContextReadModelV1,
} from "@/lib/neighborhood-context/read-model";

export const NEIGHBORHOOD_CONTEXT_L7_BASELINE_VERSION = "NeighborhoodContextNationalBaselineV1" as const;

export type NeighborhoodContextNationalAnchorBaselineV1 = {
  poi_id: string;
  category: LivingHereCategory;
  source_id: string;
  source_url: string | null;
  attribution: string;
  license_policy: string;
  license_url: string | null;
  observed_at: string;
  freshness_status: "fresh";
};

export type NeighborhoodContextNationalBaselineRowV1 = {
  canonical_neighborhood_id: string;
  city: string;
  city_slug: CanonicalCitySlug;
  neighborhood: string;
  neighborhood_slug: string;
  seo_eligible: boolean;
  map_eligible: boolean;
  runtime_model_present: boolean;
  coverage_status: NeighborhoodContextCoverageStatus;
  selection_status: NeighborhoodContextReadModelV1["selection_status"] | null;
  anchor_count: number;
  categories: LivingHereCategory[];
  source_observed_at: string | null;
  fresh_anchor_evidence: boolean;
  anchors: NeighborhoodContextNationalAnchorBaselineV1[];
};

export type NeighborhoodContextNationalCityRollupV1 = {
  city: string;
  city_slug: CanonicalCitySlug;
  neighborhoods: number;
  runtime_models: number;
  status_counts: Record<NeighborhoodContextCoverageStatus, number>;
  neighborhoods_with_anchors: number;
  total_anchors: number;
};

export type NeighborhoodContextNationalCategoryRollupV1 = {
  category: LivingHereCategory;
  neighborhoods_with_anchor: number;
  anchors: number;
};

export type NeighborhoodContextNationalBaselineV1 = {
  version: typeof NEIGHBORHOOD_CONTEXT_L7_BASELINE_VERSION;
  generated_at: string;
  summary: {
    eligible_neighborhoods: number;
    eligible_cities: number;
    runtime_models: number;
    missing_runtime_models: number;
    status_counts: Record<NeighborhoodContextCoverageStatus, number>;
    neighborhoods_with_anchors: number;
    total_anchors: number;
    unique_pois: number;
    covered_rate_percent: number;
  };
  cities: NeighborhoodContextNationalCityRollupV1[];
  categories: NeighborhoodContextNationalCategoryRollupV1[];
  neighborhoods: NeighborhoodContextNationalBaselineRowV1[];
};

const ALL_CATEGORIES = Object.keys(LIVING_HERE_CATEGORY_LABELS) as LivingHereCategory[];

function emptyStatusCounts(): Record<NeighborhoodContextCoverageStatus, number> {
  return { covered: 0, partial: 0, insufficient: 0, unavailable: 0 };
}

function eligibleNeighborhoods(): CanonicalNeighborhoodEntity[] {
  return GEO_NEIGHBORHOODS.filter(
    (entry) => entry.validation_status === "validated" && (entry.seo_eligible || entry.map_eligible),
  );
}

function cityNameBySlug(): Map<CanonicalCitySlug, string> {
  return new Map(GEO_CITIES.map((city) => [city.slug, city.canonical_name]));
}

function roundPercent(value: number): number {
  return Math.round(value * 100) / 100;
}

export function buildNeighborhoodContextNationalBaseline(now = new Date()): NeighborhoodContextNationalBaselineV1 {
  const runtimeCatalog = buildNeighborhoodContextRuntimeCatalog(now);
  const runtimeById = new Map(runtimeCatalog.map((model) => [model.canonical_neighborhood_id, model]));
  const cityNames = cityNameBySlug();

  const neighborhoods = eligibleNeighborhoods()
    .map((entity): NeighborhoodContextNationalBaselineRowV1 => {
      const model = runtimeById.get(entity.id) ?? null;
      const anchors = model?.anchors.map((anchor) => ({
        poi_id: anchor.poi_id,
        category: anchor.category,
        source_id: anchor.source_id,
        source_url: anchor.source_url,
        attribution: anchor.attribution,
        license_policy: anchor.license_policy,
        license_url: anchor.license_url,
        observed_at: anchor.observed_at,
        freshness_status: anchor.freshness_status,
      })) ?? [];

      return {
        canonical_neighborhood_id: entity.id,
        city: cityNames.get(entity.city_slug) ?? entity.city_slug,
        city_slug: entity.city_slug,
        neighborhood: entity.canonical_name,
        neighborhood_slug: entity.slug,
        seo_eligible: entity.seo_eligible,
        map_eligible: entity.map_eligible,
        runtime_model_present: model !== null,
        coverage_status: model?.coverage_status ?? "unavailable",
        selection_status: model?.selection_status ?? null,
        anchor_count: anchors.length,
        categories: model?.categories ?? [],
        source_observed_at: model?.source.observed_at ?? null,
        fresh_anchor_evidence: anchors.length > 0,
        anchors,
      };
    })
    .sort((a, b) => a.city_slug.localeCompare(b.city_slug) || a.neighborhood_slug.localeCompare(b.neighborhood_slug));

  const statusCounts = emptyStatusCounts();
  for (const row of neighborhoods) statusCounts[row.coverage_status] += 1;

  const citySlugs = Array.from(new Set(neighborhoods.map((row) => row.city_slug))).sort();
  const cities = citySlugs.map((citySlug): NeighborhoodContextNationalCityRollupV1 => {
    const rows = neighborhoods.filter((row) => row.city_slug === citySlug);
    const counts = emptyStatusCounts();
    for (const row of rows) counts[row.coverage_status] += 1;
    return {
      city: cityNames.get(citySlug) ?? citySlug,
      city_slug: citySlug,
      neighborhoods: rows.length,
      runtime_models: rows.filter((row) => row.runtime_model_present).length,
      status_counts: counts,
      neighborhoods_with_anchors: rows.filter((row) => row.anchor_count > 0).length,
      total_anchors: rows.reduce((sum, row) => sum + row.anchor_count, 0),
    };
  });

  const categories = ALL_CATEGORIES.map((category): NeighborhoodContextNationalCategoryRollupV1 => ({
    category,
    neighborhoods_with_anchor: neighborhoods.filter((row) => row.categories.includes(category)).length,
    anchors: neighborhoods.reduce(
      (sum, row) => sum + row.anchors.filter((anchor) => anchor.category === category).length,
      0,
    ),
  }));

  const runtimeModels = neighborhoods.filter((row) => row.runtime_model_present).length;
  const totalAnchors = neighborhoods.reduce((sum, row) => sum + row.anchor_count, 0);
  const uniquePois = new Set(neighborhoods.flatMap((row) => row.anchors.map((anchor) => anchor.poi_id))).size;

  return {
    version: NEIGHBORHOOD_CONTEXT_L7_BASELINE_VERSION,
    generated_at: now.toISOString(),
    summary: {
      eligible_neighborhoods: neighborhoods.length,
      eligible_cities: cities.length,
      runtime_models: runtimeModels,
      missing_runtime_models: neighborhoods.length - runtimeModels,
      status_counts: statusCounts,
      neighborhoods_with_anchors: neighborhoods.filter((row) => row.anchor_count > 0).length,
      total_anchors: totalAnchors,
      unique_pois: uniquePois,
      covered_rate_percent: neighborhoods.length > 0 ? roundPercent((statusCounts.covered / neighborhoods.length) * 100) : 0,
    },
    cities,
    categories,
    neighborhoods,
  };
}

export function validateNeighborhoodContextNationalBaseline(
  baseline: NeighborhoodContextNationalBaselineV1,
): string[] {
  const findings: string[] = [];
  const eligible = eligibleNeighborhoods();

  if (baseline.version !== NEIGHBORHOOD_CONTEXT_L7_BASELINE_VERSION) findings.push("version");
  if (baseline.summary.eligible_neighborhoods !== eligible.length) findings.push("eligible_neighborhood_count");
  if (baseline.neighborhoods.length !== baseline.summary.eligible_neighborhoods) findings.push("row_count");

  const ids = baseline.neighborhoods.map((row) => row.canonical_neighborhood_id);
  if (new Set(ids).size !== ids.length) findings.push("duplicate_neighborhood_id");

  const statusTotal = Object.values(baseline.summary.status_counts).reduce((sum, value) => sum + value, 0);
  if (statusTotal !== baseline.summary.eligible_neighborhoods) findings.push("status_total");

  const runtimeModels = baseline.neighborhoods.filter((row) => row.runtime_model_present).length;
  if (runtimeModels !== baseline.summary.runtime_models) findings.push("runtime_model_count");
  if (baseline.summary.missing_runtime_models !== baseline.summary.eligible_neighborhoods - runtimeModels) {
    findings.push("missing_runtime_model_count");
  }

  for (const row of baseline.neighborhoods) {
    if (!row.runtime_model_present && (row.coverage_status !== "unavailable" || row.anchor_count !== 0)) {
      findings.push(`missing_runtime_not_fail_closed:${row.canonical_neighborhood_id}`);
    }
    if (row.anchor_count !== row.anchors.length) findings.push(`anchor_count:${row.canonical_neighborhood_id}`);
    if (row.coverage_status === "covered" && row.anchor_count < 5) findings.push(`covered_under_min:${row.canonical_neighborhood_id}`);
    if (row.coverage_status === "unavailable" && row.anchor_count !== 0) findings.push(`unavailable_with_anchors:${row.canonical_neighborhood_id}`);

    const poiIds = row.anchors.map((anchor) => anchor.poi_id);
    if (new Set(poiIds).size !== poiIds.length) findings.push(`duplicate_poi:${row.canonical_neighborhood_id}`);
    for (const anchor of row.anchors) {
      if (anchor.freshness_status !== "fresh") findings.push(`stale_anchor:${anchor.poi_id}`);
      if (!anchor.source_id || !anchor.source_url || !anchor.attribution || !anchor.license_policy || !anchor.license_url || !anchor.observed_at) {
        findings.push(`provenance:${anchor.poi_id}`);
      }
    }
  }

  if (baseline.categories.length !== ALL_CATEGORIES.length) findings.push("category_rollup_count");
  return findings;
}
