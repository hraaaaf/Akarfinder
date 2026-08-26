import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildNeighborhoodContextNationalBaseline,
  validateNeighborhoodContextNationalBaseline,
} from "@/lib/neighborhood-context/national-baseline";

const NOW = new Date("2026-08-26T12:00:00.000Z");

describe("Neighborhood Context L7 — national baseline", () => {
  it("covers every currently eligible canonical neighborhood exactly once", () => {
    const baseline = buildNeighborhoodContextNationalBaseline(NOW);

    assert.equal(baseline.summary.eligible_neighborhoods, 21);
    assert.equal(baseline.summary.eligible_cities, 8);
    assert.equal(baseline.neighborhoods.length, 21);
    assert.equal(new Set(baseline.neighborhoods.map((row) => row.canonical_neighborhood_id)).size, 21);
    assert.deepEqual(validateNeighborhoodContextNationalBaseline(baseline), []);
  });

  it("measures the existing runtime gap without filling missing neighborhoods", () => {
    const baseline = buildNeighborhoodContextNationalBaseline(NOW);

    assert.equal(baseline.summary.runtime_models, 6);
    assert.equal(baseline.summary.missing_runtime_models, 15);
    assert.deepEqual(baseline.summary.status_counts, {
      covered: 1,
      partial: 1,
      insufficient: 2,
      unavailable: 17,
    });
    assert.equal(baseline.summary.neighborhoods_with_anchors, 4);
    assert.equal(baseline.summary.total_anchors, 12);
    assert.equal(baseline.summary.covered_rate_percent, 4.76);

    const missing = baseline.neighborhoods.filter((row) => !row.runtime_model_present);
    assert.equal(missing.length, 15);
    assert.equal(missing.every((row) => row.coverage_status === "unavailable" && row.anchor_count === 0), true);
  });

  it("preserves fail-closed provenance, license and freshness for every published anchor", () => {
    const baseline = buildNeighborhoodContextNationalBaseline(NOW);
    const anchors = baseline.neighborhoods.flatMap((row) => row.anchors);

    assert.equal(anchors.length, 12);
    assert.equal(anchors.every((anchor) => anchor.freshness_status === "fresh"), true);
    assert.equal(
      anchors.every((anchor) => Boolean(
        anchor.source_id
        && anchor.source_url
        && anchor.attribution
        && anchor.license_policy
        && anchor.license_url
        && anchor.observed_at,
      )),
      true,
    );
    assert.equal(anchors.every((anchor) => anchor.license_policy === "odbl_attribution_required"), true);
    assert.equal(baseline.categories.length, 12);
  });

  it("makes expiry visible instead of preserving stale coverage", () => {
    const future = buildNeighborhoodContextNationalBaseline(new Date("2026-10-01T00:00:00.000Z"));

    assert.equal(future.summary.status_counts.covered, 0);
    assert.equal(future.summary.status_counts.partial, 0);
    assert.equal(future.summary.status_counts.insufficient, 0);
    assert.equal(future.summary.status_counts.unavailable, 21);
    assert.equal(future.summary.total_anchors, 0);
    assert.deepEqual(validateNeighborhoodContextNationalBaseline(future), []);
  });
});
