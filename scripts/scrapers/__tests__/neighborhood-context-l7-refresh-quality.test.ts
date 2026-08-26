import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getAnnL5CertifiedSeedPois } from "@/lib/neighborhood-context/certified-seed";
import { buildNeighborhoodContextNationalBaseline } from "@/lib/neighborhood-context/national-baseline";
import {
  NEIGHBORHOOD_CONTEXT_L7_CANARY_IDS,
  NEIGHBORHOOD_CONTEXT_L7_FRESHNESS_MAX_AGE_MS,
  detectNeighborhoodContextBaselineRegressions,
  getNeighborhoodContextNationalRefreshTargets,
  getNeighborhoodContextQualityCanaries,
  runNeighborhoodContextNationalRefreshBatch,
  validateNeighborhoodContextNationalRefreshReport,
  validateNeighborhoodContextNationalRefreshTargets,
  type NeighborhoodContextRefreshFetchResultV1,
} from "@/lib/neighborhood-context/national-refresh";

const NOW = new Date("2026-08-26T12:00:00.000Z");

const BLOCKED_IDS = [
  "district_casablanca_ain_diab",
  "district_casablanca_bourgogne",
  "district_casablanca_racine",
  "district_rabat_souissi",
];

describe("Neighborhood Context L7-B — national refresh targets", () => {
  it("targets all product-eligible neighborhoods and blocks missing reference points explicitly", () => {
    const targets = getNeighborhoodContextNationalRefreshTargets();
    assert.equal(targets.length, 21);
    assert.equal(targets.filter((target) => target.target_status === "queryable").length, 17);
    assert.deepEqual(
      targets
        .filter((target) => target.target_status === "blocked_missing_reference_point")
        .map((target) => target.canonical_neighborhood_id)
        .sort(),
      BLOCKED_IDS,
    );
    assert.equal(targets.filter((target) => target.target_status === "blocked_missing_reference_point").every((target) => target.query_origin === null), true);
    assert.equal(targets.filter((target) => target.target_status === "queryable").every((target) => target.query_origin !== null), true);
    assert.deepEqual(validateNeighborhoodContextNationalRefreshTargets(targets), []);
  });

  it("inherits the exact 30-day L1 freshness policy", () => {
    assert.equal(NEIGHBORHOOD_CONTEXT_L7_FRESHNESS_MAX_AGE_MS, 30 * 24 * 60 * 60 * 1000);
  });
});

describe("Neighborhood Context L7-B — batch behavior", () => {
  it("never calls the fetcher for blocked targets and fails unavailable targets closed", async () => {
    const called: string[] = [];
    const report = await runNeighborhoodContextNationalRefreshBatch(NOW, async (target) => {
      called.push(target.canonical_neighborhood_id);
      const pois = getAnnL5CertifiedSeedPois(target.canonical_neighborhood_id, NOW);
      const result: NeighborhoodContextRefreshFetchResultV1 = pois.length
        ? {
            status: "available",
            provider_id: "fixture-batch",
            observed_at: pois[0].observed_at,
            endpoint_used: "fixture://l7-b",
            elapsed_ms: 1,
            pois,
            diagnostics: [],
          }
        : {
            status: "unavailable",
            provider_id: "fixture-batch",
            observed_at: null,
            endpoint_used: null,
            elapsed_ms: 1,
            pois: [],
            diagnostics: ["fixture_no_data"],
          };
      return result;
    });

    assert.equal(called.length, 17);
    assert.equal(BLOCKED_IDS.some((id) => called.includes(id)), false);
    assert.equal(report.targets, 21);
    assert.equal(report.queryable_targets, 17);
    assert.equal(report.blocked_targets, 4);
    assert.equal(report.available_targets, 4);
    assert.equal(report.unavailable_targets, 13);
    assert.equal(report.total_pois, 13);
    assert.equal(report.total_anchors, 12);
    assert.deepEqual(validateNeighborhoodContextNationalRefreshReport(report), []);

    const blocked = report.rows.filter((row) => row.refresh_status === "blocked");
    assert.equal(blocked.every((row) => row.poi_count === 0 && row.anchor_count === 0 && row.anchor_evidence.length === 0), true);
    const unavailable = report.rows.filter((row) => row.refresh_status === "unavailable");
    assert.equal(unavailable.every((row) => row.anchor_count === 0 && row.anchor_evidence.length === 0), true);
  });

  it("retains auditable provenance, license, attribution and freshness for every selected anchor", async () => {
    const report = await runNeighborhoodContextNationalRefreshBatch(NOW, async (target) => {
      const pois = getAnnL5CertifiedSeedPois(target.canonical_neighborhood_id, NOW);
      return pois.length
        ? {
            status: "available" as const,
            provider_id: "fixture-batch",
            observed_at: pois[0].observed_at,
            endpoint_used: "fixture://l7-b",
            elapsed_ms: 1,
            pois,
            diagnostics: [],
          }
        : {
            status: "unavailable" as const,
            provider_id: "fixture-batch",
            observed_at: null,
            endpoint_used: null,
            elapsed_ms: 1,
            pois: [],
            diagnostics: [],
          };
    });

    const evidence = report.rows.flatMap((row) => row.anchor_evidence);
    assert.equal(evidence.length, 12);
    assert.equal(evidence.every((entry) => entry.poi_id.startsWith("osm:")), true);
    assert.equal(evidence.every((entry) => Boolean(entry.source_id && entry.attribution && entry.license_policy && entry.observed_at)), true);
    assert.equal(evidence.every((entry) => entry.freshness_status === "fresh"), true);
    assert.equal(evidence.every((entry) => entry.license_policy === "odbl_attribution_required"), true);
    assert.equal(evidence.every((entry) => Boolean(entry.license_url)), true);
    for (const row of report.rows) {
      assert.deepEqual(row.anchor_evidence.map((entry) => entry.poi_id), row.anchor_ids);
    }
  });

  it("keeps radius-only anchors territorially truth-safe", async () => {
    const report = await runNeighborhoodContextNationalRefreshBatch(NOW, async (target) => {
      const pois = getAnnL5CertifiedSeedPois(target.canonical_neighborhood_id, NOW);
      return pois.length
        ? {
            status: "available" as const,
            provider_id: "fixture-batch",
            observed_at: pois[0].observed_at,
            endpoint_used: "fixture://l7-b",
            elapsed_ms: 1,
            pois,
            diagnostics: [],
          }
        : {
            status: "unavailable" as const,
            provider_id: "fixture-batch",
            observed_at: null,
            endpoint_used: null,
            elapsed_ms: 1,
            pois: [],
            diagnostics: [],
          };
    });

    const availableIds = report.rows.filter((row) => row.refresh_status === "available").map((row) => row.canonical_neighborhood_id).sort();
    assert.deepEqual(availableIds, [
      "district_casablanca_maarif",
      "district_marrakech_gueliz",
      "district_rabat_agdal",
      "district_tanger_malabata",
    ]);
    assert.equal(report.rows.find((row) => row.canonical_neighborhood_id === "district_rabat_agdal")?.selection_status, "ready");
    assert.equal(report.rows.find((row) => row.canonical_neighborhood_id === "district_tanger_malabata")?.selection_status, "partial_context");
  });
});

describe("Neighborhood Context L7-B — quality and regression", () => {
  it("has five deliberate canaries spanning covered, partial, insufficient, unavailable and blocked", () => {
    const baseline = buildNeighborhoodContextNationalBaseline(NOW);
    const canaries = getNeighborhoodContextQualityCanaries(baseline);
    assert.equal(canaries.length, NEIGHBORHOOD_CONTEXT_L7_CANARY_IDS.length);
    assert.deepEqual(canaries.map((entry) => entry.canonical_neighborhood_id), [...NEIGHBORHOOD_CONTEXT_L7_CANARY_IDS]);
    assert.equal(canaries.find((entry) => entry.canonical_neighborhood_id === "district_rabat_agdal")?.coverage_status, "covered");
    assert.equal(canaries.find((entry) => entry.canonical_neighborhood_id === "district_tanger_malabata")?.coverage_status, "partial");
    assert.equal(canaries.find((entry) => entry.canonical_neighborhood_id === "district_casablanca_maarif")?.coverage_status, "insufficient");
    assert.equal(canaries.find((entry) => entry.canonical_neighborhood_id === "district_agadir_founty")?.coverage_status, "unavailable");
    assert.equal(canaries.find((entry) => entry.canonical_neighborhood_id === "district_rabat_souissi")?.target_status, "blocked_missing_reference_point");
  });

  it("detects coverage, anchor and fresh-evidence regressions without inventing a threshold", () => {
    const before = buildNeighborhoodContextNationalBaseline(NOW);
    const after = structuredClone(before);
    const agdal = after.neighborhoods.find((row) => row.canonical_neighborhood_id === "district_rabat_agdal");
    assert.ok(agdal);
    agdal.coverage_status = "unavailable";
    agdal.anchor_count = 0;
    agdal.anchors = [];
    agdal.categories = [];
    agdal.fresh_anchor_evidence = false;

    const findings = detectNeighborhoodContextBaselineRegressions(before, after);
    assert.equal(findings.some((finding) => finding.kind === "coverage_degraded" && finding.canonical_neighborhood_id === "district_rabat_agdal"), true);
    assert.equal(findings.some((finding) => finding.kind === "anchor_drop" && finding.canonical_neighborhood_id === "district_rabat_agdal"), true);
    assert.equal(findings.some((finding) => finding.kind === "fresh_evidence_lost" && finding.canonical_neighborhood_id === "district_rabat_agdal"), true);
    assert.deepEqual(detectNeighborhoodContextBaselineRegressions(before, before), []);
  });
});
