import assert from "node:assert/strict";
import test from "node:test";
import { assessMaarifPrivatePoiSnapshot, MAARIF_QA_SCHEMA } from "../../audits/vivre-ici-maarif-poi-qa-gate.mjs";

const NOW = new Date("2026-11-09T15:00:00Z");
function sample() {
  return {
    schema: MAARIF_QA_SCHEMA,
    status: "PARTIAL_SAMPLE_NOT_PUBLISHABLE",
    source: "OpenStreetMap QA-only extract",
    generated_at: "2026-11-09T14:00:00Z",
    osm_snapshot_dates: ["2026-11-09T13:00:00Z"],
    no_database_write: true,
    no_ui_publication: true,
    total_candidates: 2,
    candidates: [
      {
        id: "node/1", name_osm: "Synthetic test clinic", category: "clinic",
        latitude: 33.5898, longitude: -7.644,
        osm_url: "https://www.openstreetmap.org/node/1",
        independent_name_address_check: "name_address_corrob",
        independent_source_url: "https://example.com/source",
        current_operation_verified: false,
        position_precision_independently_verified: false,
        within_central_quartier_certified: false,
        distance_from_center_m: 0,
      },
      {
        id: "node/2", name_osm: "Synthetic test school", category: "school",
        latitude: 33.5900, longitude: -7.644,
        osm_url: "https://www.openstreetmap.org/node/2",
        independent_name_address_check: "osm_only_pending_manual_review",
        independent_source_url: null,
        current_operation_verified: false,
        position_precision_independently_verified: false,
        within_central_quartier_certified: false,
        distance_from_center_m: 22.2,
      },
    ],
  };
}

test("valid private sample passes structural QA but ALWAYS remains unpublishable", () => {
  const result = assessMaarifPrivatePoiSnapshot(sample(), NOW);
  assert.equal(result.ok, true, result.findings.join(","));
  assert.equal(result.publishable, false);
  assert.equal(result.certification, "QA_ONLY_NON_EXHAUSTIVE");
  assert.equal(result.stats.candidateCount, 2);
  assert.equal(result.stats.claimedNameAddressCorroborated, 1);
  assert.equal(result.stats.independentOperationVerified, 0);
  assert.ok(result.reviewFlags.includes("transport_not_sampled"));
  assert.ok(result.reviewFlags.includes("parks_sport_not_sampled"));
});

test("reject duplicate OSM IDs and mismatched counts", () => {
  const value = sample();
  value.candidates[1].id = "node/1";
  const result = assessMaarifPrivatePoiSnapshot(value, NOW);
  assert.equal(result.ok, false);
  assert.ok(result.findings.includes("duplicate_osm_id:node/1"));
});

test("never allow a current business, coordinate or quartier claim without evidence", () => {
  for (const field of [
    "current_operation_verified",
    "position_precision_independently_verified",
    "within_central_quartier_certified",
  ]) {
    const value = sample();
    value.candidates[0][field] = true;
    const result = assessMaarifPrivatePoiSnapshot(value, NOW);
    assert.equal(result.ok, false);
    assert.ok(result.findings.some((finding) => finding.includes(field)));
  }
});

test("reject missing provenance and future source timestamp", () => {
  const value = sample();
  value.osm_snapshot_dates = ["2026-12-31T00:00:00Z"];
  value.candidates[0].independent_source_url = null;
  const result = assessMaarifPrivatePoiSnapshot(value, NOW);
  assert.equal(result.ok, false);
  assert.ok(result.findings.includes("source_snapshot_dates"));
  assert.ok(result.findings.includes("secondary_claim_without_url:node/1"));
});

test("keep geographically outlying candidates flagged without inventing neighborhood membership", () => {
  const value = sample();
  value.candidates[1].latitude = 33.70;
  delete value.candidates[1].distance_from_center_m;
  const result = assessMaarifPrivatePoiSnapshot(value, NOW);
  assert.equal(result.ok, true);
  assert.ok(result.reviewFlags.includes("outside_reference_radius:node/2"));
  assert.equal(result.publishable, false);
});

test("fail-closed if someone drops private guards or inserts unsupported category", () => {
  const value = sample();
  value.no_ui_publication = false;
  value.candidates[0].category = "unknown";
  const result = assessMaarifPrivatePoiSnapshot(value, NOW);
  assert.equal(result.ok, false);
  assert.ok(result.findings.includes("private_guards"));
  assert.ok(result.findings.includes("unsupported_category:node/1"));
});
