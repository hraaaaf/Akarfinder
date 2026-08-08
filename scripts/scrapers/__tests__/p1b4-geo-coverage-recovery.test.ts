import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260808120000_p1b4_geo_coverage_recovery.sql"),
  "utf8",
);

describe("P1B.4 — Geo Coverage Recovery", () => {
  it("only recovers currently public LISTING seeds", () => {
    assert.ok(migration.includes("vertical_classification = 'real_estate_likely'"));
    assert.ok(migration.includes("document_kind = 'LISTING'"));
    assert.ok(migration.includes("display_eligibility in ('eligible_primary', 'eligible_secondary')"));
  });

  it("requires persisted explicit district evidence and exact Geo Registry aliases", () => {
    assert.ok(migration.includes("p.district"));
    assert.ok(migration.includes("ga.normalized_alias = lower(regexp_replace(trim(p.district)"));
    assert.ok(migration.includes("mc.neighborhood_match_count = 1"));
    assert.ok(migration.includes("ca.normalized_alias = lower(regexp_replace(trim(rm.raw_city)"));
    assert.ok(migration.includes("validation_status = 'validated'"));
  });

  it("fails closed when prior geo events exist", () => {
    assert.ok(migration.includes("not exists ("));
    assert.ok(migration.includes("gre.source_record_type = 'source_offer_seed'"));
    assert.ok(migration.includes("gre.source_record_id = em.seed_id::text"));
  });

  it("requires exact cohort count before apply", () => {
    assert.ok(migration.includes("if v_candidate_count <> p_expected_count then"));
    assert.ok(migration.includes("P1B.4 cohort drift"));
    assert.ok(migration.includes("if v_inserted <> p_expected_count then"));
  });

  it("writes explicit provenance only and keeps metric layers disabled", () => {
    assert.ok(migration.includes("explicit_property_listing_district_exact_geo_alias"));
    assert.ok(migration.includes("'p1b4_exact_bridge_v1'"));
    assert.ok(migration.includes("'metric_layers_activated', false"));
  });

  it("rolls back append-only with a newer unresolved event", () => {
    assert.ok(migration.includes("'p1b4_exact_bridge_v1_rollback'"));
    assert.ok(migration.includes("'unresolved'"));
    assert.equal(/delete\s+from\s+public\.geo_resolution_events/i.test(migration), false);
  });

  it("contains no spatial/fuzzy/title/url inference path", () => {
    for (const forbidden of ["ST_Contains", "ST_DWithin", "levenshtein", "similarity(", "title ILIKE", "canonical_url ILIKE"]) {
      assert.equal(migration.includes(forbidden), false, forbidden);
    }
  });
});
