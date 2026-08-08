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
  it("admits only explicit resolved source_offer_seed geography", () => {
    assert.ok(migration.includes("e.resolution_status = 'resolved'"));
    assert.ok(migration.includes("e.source_record_type = 'source_offer_seed'"));
    assert.ok(migration.includes("e.resolved_neighborhood_id is not null"));
  });

  it("requires validated canonical city and neighborhood entities", () => {
    assert.ok(migration.includes("neighborhood.entity_type = 'neighborhood'"));
    assert.ok(migration.includes("neighborhood.validation_status = 'validated'"));
    assert.ok(migration.includes("city.entity_type = 'city'"));
    assert.ok(migration.includes("city.validation_status = 'validated'"));
  });

  it("uses the same truthful public LISTING denominator", () => {
    assert.ok(migration.includes("d.vertical_classification = 'real_estate_likely'"));
    assert.ok(migration.includes("d.document_kind = 'LISTING'"));
    assert.ok(
      migration.includes(
        "d.display_eligibility in ('eligible_primary', 'eligible_secondary')",
      ),
    );
  });

  it("keeps metric activation off until coverage is proven", () => {
    assert.ok(migration.includes("'metric_layers_activated', false"));
    assert.ok(migration.includes("'no_inferred_neighborhoods', true"));
    assert.ok(migration.includes("'no_search_or_display_policy_change', true"));
  });

  it("reports coverage and duplicate assignments explicitly", () => {
    assert.ok(migration.includes("'coverage_percent'"));
    assert.ok(migration.includes("'duplicate_seed_assignments'"));
    assert.ok(migration.includes("'one_assignment_per_seed'"));
  });

  it("does not manufacture territorial market semantics", () => {
    for (const forbidden of ["demand_score", "heat_score", "price_score", "interpolate", "ST_Contains", "ST_DWithin"]) {
      assert.equal(migration.includes(forbidden), false, forbidden);
    }
  });
});
