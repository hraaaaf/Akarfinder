import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const migration = source(
  "supabase/migrations/20260808101500_p1b3_territorial_metric_join_contract.sql",
);

describe("P1B.3 — Territorial Metric Join Contract", () => {
  it("selects latest geo truth before requiring resolved status", () => {
    const latestEvent = migration.indexOf("latest_event as (");
    const latestResolved = migration.indexOf("latest_resolved as (");
    const resolvedFilter = migration.indexOf("where e.resolution_status = 'resolved'", latestResolved);
    assert.ok(latestEvent >= 0);
    assert.ok(latestResolved > latestEvent);
    assert.ok(resolvedFilter > latestResolved);
    assert.ok(migration.includes("e.source_record_type = 'source_offer_seed'"));
    assert.ok(migration.includes("e.resolved_neighborhood_id is not null"));
  });

  it("requires validated canonical city and neighborhood entities", () => {
    assert.ok(migration.includes("neighborhood.entity_type = 'neighborhood'"));
    assert.ok(migration.includes("neighborhood.validation_status = 'validated'"));
    assert.ok(migration.includes("city.entity_type = 'city'"));
    assert.ok(migration.includes("city.validation_status = 'validated'"));
  });

  it("uses the same truthful public LISTING denominator for coverage and collision metrics", () => {
    assert.ok(migration.includes("eligible_seeds as ("));
    assert.ok(migration.includes("d.vertical_classification = 'real_estate_likely'"));
    assert.ok(migration.includes("d.document_kind = 'LISTING'"));
    assert.ok(
      migration.includes(
        "d.display_eligibility in ('eligible_primary', 'eligible_secondary')",
      ),
    );
    assert.ok(migration.includes("join eligible_seeds s"));
    assert.ok(migration.includes("'same_public_listing_denominator', true"));
  });

  it("never casts external source_record_id text to uuid", () => {
    assert.equal(migration.includes("source_record_id::uuid"), false);
    assert.ok(migration.includes("r.source_record_id = d.seed_id::text"));
    assert.ok(migration.includes("e.source_record_id = s.seed_id::text"));
  });

  it("keeps metric activation off until coverage is proven", () => {
    assert.ok(migration.includes("'metric_layers_activated', false"));
    assert.ok(migration.includes("'no_inferred_neighborhoods', true"));
    assert.ok(migration.includes("'no_search_or_display_policy_change', true"));
  });

  it("reports real latest-resolution collisions before collapsing to one row", () => {
    assert.ok(migration.includes("latest_timestamp as ("));
    assert.ok(migration.includes("latest_collisions as ("));
    assert.ok(migration.includes("having count(distinct e.resolved_neighborhood_id) > 1"));
    assert.ok(migration.includes("'latest_resolution_collisions'"));
    assert.ok(migration.includes("'no_latest_resolution_collision'"));
  });

  it("reports historical conflicting resolutions separately from blocking latest collisions", () => {
    assert.ok(migration.includes("conflicting_history as ("));
    assert.ok(migration.includes("'conflicting_resolution_history'"));
  });

  it("does not manufacture territorial market semantics", () => {
    for (const forbidden of [
      "demand_score",
      "heat_score",
      "price_score",
      "interpolate",
      "ST_Contains",
      "ST_DWithin",
    ]) {
      assert.equal(migration.includes(forbidden), false, forbidden);
    }
  });
});
