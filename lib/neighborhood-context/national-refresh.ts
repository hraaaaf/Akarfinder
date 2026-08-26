import {
  GEO_CITIES,
  GEO_NEIGHBORHOODS,
  type CanonicalCitySlug,
} from "@/lib/geo/geo-entity-registry";
import type { LivingHereCategory } from "@/lib/geo/living-here";
import { getNeighborhoodBySlug } from "@/lib/map/canonical-neighborhood-data";
import {
  NEIGHBORHOOD_CONTEXT_L1_CATEGORIES,
  NEIGHBORHOOD_CONTEXT_L1_QUERY_RADIUS_M,
} from "@/lib/neighborhood-context/pilot-neighborhoods";
import {
  NEIGHBORHOOD_POI_MAX_AGE_MS,
  validateNeighborhoodPoiV1,
  type NeighborhoodPoiV1,
} from "@/lib/neighborhood-context/poi-registry";
import { selectNeighborhoodAnchors } from "@/lib/neighborhood-context/poi-assignment";
import type { NeighborhoodPoiPilotSnapshotV1 } from "@/lib/neighborhood-context/poi-snapshot";
import type {
  NeighborhoodContextNationalBaselineV1,
  NeighborhoodContextNationalBaselineRowV1,
} from "@/lib/neighborhood-context/national-baseline";

export const NEIGHBORHOOD_CONTEXT_L7_REFRESH_VERSION = "NeighborhoodContextNationalRefreshV1" as const;
export const NEIGHBORHOOD_CONTEXT_L7_FRESHNESS_MAX_AGE_MS = NEIGHBORHOOD_POI_MAX_AGE_MS;

export type NeighborhoodContextRefreshTargetStatus = "queryable" | "blocked_missing_reference_point";

export type NeighborhoodContextRefreshTargetV1 = {
  canonical_neighborhood_id: string;
  city: string;
  city_slug: CanonicalCitySlug;
  neighborhood: string;
  neighborhood_slug: string;
  seo_eligible: boolean;
  map_eligible: boolean;
  target_status: NeighborhoodContextRefreshTargetStatus;
  query_origin: { latitude: number; longitude: number } | null;
  query_radius_m: number;
  categories: LivingHereCategory[];
};

export type NeighborhoodContextRefreshFetchResultV1 = {
  status: "available" | "unavailable";
  provider_id: string | null;
  observed_at: string | null;
  endpoint_used: string | null;
  elapsed_ms: number;
  pois: NeighborhoodPoiV1[];
  diagnostics: string[];
};

export type NeighborhoodContextRefreshFetcher = (
  target: NeighborhoodContextRefreshTargetV1,
) => Promise<NeighborhoodContextRefreshFetchResultV1>;

export type NeighborhoodContextRefreshAnchorEvidenceV1 = {
  poi_id: string;
  source_id: string;
  source_url: string | null;
  attribution: string;
  license_policy: string;
  license_url: string | null;
  observed_at: string;
  freshness_status: "fresh";
};

export type NeighborhoodContextRefreshRowV1 = {
  canonical_neighborhood_id: string;
  city: string;
  neighborhood: string;
  target_status: NeighborhoodContextRefreshTargetStatus;
  refresh_status: "available" | "unavailable" | "blocked";
  provider_id: string | null;
  observed_at: string | null;
  endpoint_used: string | null;
  elapsed_ms: number;
  poi_count: number;
  rejected_count: number;
  selection_status: "ready" | "partial_context" | "insufficient_context" | null;
  anchor_count: number;
  anchor_ids: string[];
  anchor_evidence: NeighborhoodContextRefreshAnchorEvidenceV1[];
  diagnostics: string[];
};

export type NeighborhoodContextNationalRefreshReportV1 = {
  version: typeof NEIGHBORHOOD_CONTEXT_L7_REFRESH_VERSION;
  generated_at: string;
  freshness_max_age_ms: number;
  production_provider_claim: false;
  targets: number;
  queryable_targets: number;
  blocked_targets: number;
  available_targets: number;
  unavailable_targets: number;
  total_pois: number;
  total_anchors: number;
  rows: NeighborhoodContextRefreshRowV1[];
};

export type NeighborhoodContextRegressionFindingV1 = {
  canonical_neighborhood_id: string;
  kind: "missing_row" | "coverage_degraded" | "anchor_drop" | "fresh_evidence_lost";
  before: string | number | boolean | null;
  after: string | number | boolean | null;
};

export const NEIGHBORHOOD_CONTEXT_L7_CANARY_IDS = [
  "district_rabat_agdal",
  "district_tanger_malabata",
  "district_casablanca_maarif",
  "district_agadir_founty",
  "district_rabat_souissi",
] as const;

const COVERAGE_RANK: Record<NeighborhoodContextNationalBaselineRowV1["coverage_status"], number> = {
  covered: 3,
  partial: 2,
  insufficient: 1,
  unavailable: 0,
};

function cityNameMap(): Map<CanonicalCitySlug, string> {
  return new Map(GEO_CITIES.map((city) => [city.slug, city.canonical_name]));
}

export function getNeighborhoodContextNationalRefreshTargets(): NeighborhoodContextRefreshTargetV1[] {
  const cityNames = cityNameMap();
  return GEO_NEIGHBORHOODS
    .filter((entry) => entry.validation_status === "validated" && (entry.seo_eligible || entry.map_eligible))
    .map((entry): NeighborhoodContextRefreshTargetV1 => {
      const point = getNeighborhoodBySlug(entry.city_slug, entry.slug);
      return {
        canonical_neighborhood_id: entry.id,
        city: cityNames.get(entry.city_slug) ?? entry.city_slug,
        city_slug: entry.city_slug,
        neighborhood: entry.canonical_name,
        neighborhood_slug: entry.slug,
        seo_eligible: entry.seo_eligible,
        map_eligible: entry.map_eligible,
        target_status: point ? "queryable" : "blocked_missing_reference_point",
        query_origin: point ? { latitude: point.lat, longitude: point.lng } : null,
        query_radius_m: NEIGHBORHOOD_CONTEXT_L1_QUERY_RADIUS_M,
        categories: [...NEIGHBORHOOD_CONTEXT_L1_CATEGORIES],
      };
    })
    .sort((a, b) => a.city_slug.localeCompare(b.city_slug) || a.neighborhood_slug.localeCompare(b.neighborhood_slug));
}

export function validateNeighborhoodContextNationalRefreshTargets(
  targets: NeighborhoodContextRefreshTargetV1[],
): string[] {
  const findings: string[] = [];
  const expected = GEO_NEIGHBORHOODS.filter(
    (entry) => entry.validation_status === "validated" && (entry.seo_eligible || entry.map_eligible),
  );
  if (targets.length !== expected.length) findings.push("target_count");
  const ids = targets.map((target) => target.canonical_neighborhood_id);
  if (new Set(ids).size !== ids.length) findings.push("duplicate_target");
  for (const target of targets) {
    if (target.target_status === "queryable" && target.query_origin == null) {
      findings.push(`queryable_without_origin:${target.canonical_neighborhood_id}`);
    }
    if (target.target_status === "blocked_missing_reference_point" && target.query_origin != null) {
      findings.push(`blocked_with_origin:${target.canonical_neighborhood_id}`);
    }
    if (target.query_radius_m !== NEIGHBORHOOD_CONTEXT_L1_QUERY_RADIUS_M) {
      findings.push(`radius:${target.canonical_neighborhood_id}`);
    }
    if (JSON.stringify(target.categories) !== JSON.stringify(NEIGHBORHOOD_CONTEXT_L1_CATEGORIES)) {
      findings.push(`categories:${target.canonical_neighborhood_id}`);
    }
  }
  return findings;
}

function unavailableRow(
  target: NeighborhoodContextRefreshTargetV1,
  result: NeighborhoodContextRefreshFetchResultV1,
  diagnostics: string[],
): NeighborhoodContextRefreshRowV1 {
  return {
    canonical_neighborhood_id: target.canonical_neighborhood_id,
    city: target.city,
    neighborhood: target.neighborhood,
    target_status: target.target_status,
    refresh_status: "unavailable",
    provider_id: result.provider_id,
    observed_at: result.observed_at,
    endpoint_used: result.endpoint_used,
    elapsed_ms: result.elapsed_ms,
    poi_count: 0,
    rejected_count: result.pois.length,
    selection_status: null,
    anchor_count: 0,
    anchor_ids: [],
    anchor_evidence: [],
    diagnostics,
  };
}

function anchorEvidence(poi: NeighborhoodPoiV1): NeighborhoodContextRefreshAnchorEvidenceV1 {
  return {
    poi_id: poi.poi_id,
    source_id: poi.source_id,
    source_url: poi.source_url,
    attribution: poi.attribution,
    license_policy: poi.license_policy,
    license_url: poi.license_url,
    observed_at: poi.observed_at,
    freshness_status: "fresh",
  };
}

export async function runNeighborhoodContextNationalRefreshBatch(
  now: Date,
  fetcher: NeighborhoodContextRefreshFetcher,
): Promise<NeighborhoodContextNationalRefreshReportV1> {
  const targets = getNeighborhoodContextNationalRefreshTargets();
  const targetFindings = validateNeighborhoodContextNationalRefreshTargets(targets);
  if (targetFindings.length) throw new Error(`Invalid L7 refresh targets: ${targetFindings.join(",")}`);

  const rows: NeighborhoodContextRefreshRowV1[] = [];
  for (const target of targets) {
    if (target.target_status === "blocked_missing_reference_point" || target.query_origin == null) {
      rows.push({
        canonical_neighborhood_id: target.canonical_neighborhood_id,
        city: target.city,
        neighborhood: target.neighborhood,
        target_status: target.target_status,
        refresh_status: "blocked",
        provider_id: null,
        observed_at: null,
        endpoint_used: null,
        elapsed_ms: 0,
        poi_count: 0,
        rejected_count: 0,
        selection_status: null,
        anchor_count: 0,
        anchor_ids: [],
        anchor_evidence: [],
        diagnostics: ["missing_first_party_reference_point"],
      });
      continue;
    }

    const result = await fetcher(target);
    if (result.status !== "available") {
      rows.push(unavailableRow(target, result, [...result.diagnostics, "source_unavailable"]));
      continue;
    }

    const validPois: NeighborhoodPoiV1[] = [];
    const rejected: string[] = [];
    for (const poi of result.pois) {
      const validation = validateNeighborhoodPoiV1(poi, now);
      if (!validation.valid || poi.status !== "active" || poi.freshness_status !== "fresh") {
        rejected.push(`${poi.poi_id}:${validation.errors.join("|") || poi.status}`);
        continue;
      }
      validPois.push(poi);
    }

    if (validPois.length === 0 || !result.provider_id || !result.observed_at) {
      rows.push(unavailableRow(target, result, [...result.diagnostics, ...rejected, "no_fresh_valid_poi"]));
      continue;
    }

    const snapshot: NeighborhoodPoiPilotSnapshotV1 = {
      canonical_neighborhood_id: target.canonical_neighborhood_id,
      city: target.city,
      neighborhood: target.neighborhood,
      query_origin: target.query_origin,
      query_radius_m: target.query_radius_m,
      status: "available",
      acquisition_mode: "live",
      provider_id: result.provider_id,
      observed_at: result.observed_at,
      endpoint_used: result.endpoint_used ?? "injected-batch",
      poi_count: validPois.length,
      categories: Array.from(new Set(validPois.map((poi) => poi.category))).sort(),
      pois: validPois,
      diagnostics: result.diagnostics,
    };
    const selection = selectNeighborhoodAnchors(snapshot);
    const poiById = new Map(validPois.map((poi) => [poi.poi_id, poi]));
    const evidence = selection.anchors.map((anchor) => {
      const poi = poiById.get(anchor.poi_id);
      if (!poi) throw new Error(`Missing refresh POI evidence for anchor ${anchor.poi_id}`);
      return anchorEvidence(poi);
    });

    rows.push({
      canonical_neighborhood_id: target.canonical_neighborhood_id,
      city: target.city,
      neighborhood: target.neighborhood,
      target_status: target.target_status,
      refresh_status: "available",
      provider_id: result.provider_id,
      observed_at: result.observed_at,
      endpoint_used: result.endpoint_used,
      elapsed_ms: result.elapsed_ms,
      poi_count: validPois.length,
      rejected_count: rejected.length,
      selection_status: selection.status,
      anchor_count: selection.anchors.length,
      anchor_ids: selection.anchors.map((anchor) => anchor.poi_id),
      anchor_evidence: evidence,
      diagnostics: [...result.diagnostics, ...rejected, ...selection.diagnostics],
    });
  }

  return {
    version: NEIGHBORHOOD_CONTEXT_L7_REFRESH_VERSION,
    generated_at: now.toISOString(),
    freshness_max_age_ms: NEIGHBORHOOD_CONTEXT_L7_FRESHNESS_MAX_AGE_MS,
    production_provider_claim: false,
    targets: rows.length,
    queryable_targets: rows.filter((row) => row.target_status === "queryable").length,
    blocked_targets: rows.filter((row) => row.refresh_status === "blocked").length,
    available_targets: rows.filter((row) => row.refresh_status === "available").length,
    unavailable_targets: rows.filter((row) => row.refresh_status === "unavailable").length,
    total_pois: rows.reduce((sum, row) => sum + row.poi_count, 0),
    total_anchors: rows.reduce((sum, row) => sum + row.anchor_count, 0),
    rows,
  };
}

export function validateNeighborhoodContextNationalRefreshReport(
  report: NeighborhoodContextNationalRefreshReportV1,
): string[] {
  const findings: string[] = [];
  if (report.version !== NEIGHBORHOOD_CONTEXT_L7_REFRESH_VERSION) findings.push("version");
  if (report.freshness_max_age_ms !== NEIGHBORHOOD_CONTEXT_L7_FRESHNESS_MAX_AGE_MS) findings.push("freshness_policy");
  if (report.production_provider_claim !== false) findings.push("production_provider_claim");
  if (report.rows.length !== report.targets) findings.push("row_count");
  if (report.queryable_targets + report.blocked_targets !== report.targets) findings.push("target_partition");
  const ids = report.rows.map((row) => row.canonical_neighborhood_id);
  if (new Set(ids).size !== ids.length) findings.push("duplicate_row");
  for (const row of report.rows) {
    if (row.refresh_status === "blocked" && row.target_status !== "blocked_missing_reference_point") {
      findings.push(`blocked_queryable:${row.canonical_neighborhood_id}`);
    }
    if (row.refresh_status !== "available" && (row.anchor_count !== 0 || row.anchor_evidence.length !== 0)) {
      findings.push(`non_available_with_evidence:${row.canonical_neighborhood_id}`);
    }
    if (row.refresh_status === "available" && (row.poi_count === 0 || row.selection_status == null)) {
      findings.push(`available_without_evidence:${row.canonical_neighborhood_id}`);
    }
    if (row.anchor_evidence.length !== row.anchor_count) {
      findings.push(`anchor_evidence_count:${row.canonical_neighborhood_id}`);
    }
    const evidenceIds = row.anchor_evidence.map((entry) => entry.poi_id);
    if (JSON.stringify(evidenceIds) !== JSON.stringify(row.anchor_ids)) {
      findings.push(`anchor_evidence_identity:${row.canonical_neighborhood_id}`);
    }
    for (const evidence of row.anchor_evidence) {
      if (!evidence.source_id || !evidence.attribution || !evidence.license_policy || !evidence.observed_at) {
        findings.push(`anchor_provenance:${row.canonical_neighborhood_id}:${evidence.poi_id}`);
      }
      if (evidence.freshness_status !== "fresh") {
        findings.push(`anchor_freshness:${row.canonical_neighborhood_id}:${evidence.poi_id}`);
      }
    }
  }
  return findings;
}

export function detectNeighborhoodContextBaselineRegressions(
  before: NeighborhoodContextNationalBaselineV1,
  after: NeighborhoodContextNationalBaselineV1,
): NeighborhoodContextRegressionFindingV1[] {
  const findings: NeighborhoodContextRegressionFindingV1[] = [];
  const afterById = new Map(after.neighborhoods.map((row) => [row.canonical_neighborhood_id, row]));
  for (const previous of before.neighborhoods) {
    const next = afterById.get(previous.canonical_neighborhood_id);
    if (!next) {
      findings.push({
        canonical_neighborhood_id: previous.canonical_neighborhood_id,
        kind: "missing_row",
        before: previous.coverage_status,
        after: null,
      });
      continue;
    }
    if (COVERAGE_RANK[next.coverage_status] < COVERAGE_RANK[previous.coverage_status]) {
      findings.push({
        canonical_neighborhood_id: previous.canonical_neighborhood_id,
        kind: "coverage_degraded",
        before: previous.coverage_status,
        after: next.coverage_status,
      });
    }
    if (next.anchor_count < previous.anchor_count) {
      findings.push({
        canonical_neighborhood_id: previous.canonical_neighborhood_id,
        kind: "anchor_drop",
        before: previous.anchor_count,
        after: next.anchor_count,
      });
    }
    if (previous.fresh_anchor_evidence && !next.fresh_anchor_evidence) {
      findings.push({
        canonical_neighborhood_id: previous.canonical_neighborhood_id,
        kind: "fresh_evidence_lost",
        before: true,
        after: false,
      });
    }
  }
  return findings;
}

export function getNeighborhoodContextQualityCanaries(baseline: NeighborhoodContextNationalBaselineV1) {
  const byId = new Map(baseline.neighborhoods.map((row) => [row.canonical_neighborhood_id, row]));
  const targets = getNeighborhoodContextNationalRefreshTargets();
  return NEIGHBORHOOD_CONTEXT_L7_CANARY_IDS.map((id) => {
    const row = byId.get(id) ?? null;
    const target = targets.find((entry) => entry.canonical_neighborhood_id === id) ?? null;
    return {
      canonical_neighborhood_id: id,
      target_status: target?.target_status ?? "missing",
      coverage_status: row?.coverage_status ?? "missing",
      runtime_model_present: row?.runtime_model_present ?? false,
      anchor_count: row?.anchor_count ?? 0,
      fresh_anchor_evidence: row?.fresh_anchor_evidence ?? false,
    };
  });
}
