import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260809162000_p1b5_canonical_geo_normalization_recovery.sql"),
  "utf8",
);

describe("P1B.5 — Canonical Geo Normalization Recovery", () => {
  it("uses only the canonical accent fold plus apostrophe and whitespace normalization", () => {
    assert.ok(migration.includes("public.odm04_fold_text(p_value)"));
    assert.ok(migration.includes("[''’]"));
    assert.ok(migration.includes("'\\s+'"));
    assert.ok(migration.includes("odm_p1b5_normalize_geo_label_v1"));
  });

  it("is restricted to the normalization delta missed by P1B.4", () => {
    assert.ok(migration.includes("rm.normalized_district <> rm.legacy_district"));
    assert.ok(migration.includes("lower(regexp_replace(trim(p.district)"));
  });

  it("only recovers currently public LISTING seeds backed by explicit persisted districts", () => {
    assert.ok(migration.includes("vertical_classification = 'real_estate_likely'"));
    assert.ok(migration.includes("document_kind = 'LISTING'"));
    assert.ok(migration.includes("display_eligibility in ('eligible_primary', 'eligible_secondary')"));
    assert.ok(migration.includes("p.district"));
  });

  it("requires confidence-1 unique validated neighborhood and parent-city aliases", () => {
    assert.ok(migration.includes("ga.confidence = 1"));
    assert.ok(migration.includes("ca.confidence = 1"));
    assert.ok(migration.includes("mc.neighborhood_match_count = 1"));
    assert.ok(migration.includes("validation_status = 'validated'"));
    assert.ok(migration.includes("ca.normalized_alias = rm.normalized_city"));
  });

  it("fails closed on both cohort and map-eligible drift", () => {
    assert.ok(migration.includes("P1B.5 cohort drift"));
    assert.ok(migration.includes("P1B.5 map-eligible drift"));
    assert.ok(migration.includes("if v_inserted <> p_expected_count then"));
  });

  it("writes append-only provenance and supports append-only rollback", () => {
    assert.ok(migration.includes("explicit_property_listing_district_canonical_geo_normalization"));
    assert.ok(migration.includes("'p1b5_canonical_normalization_v1'"));
    assert.ok(migration.includes("'p1b5_canonical_normalization_v1_rollback'"));
    assert.ok(migration.includes("'unresolved'"));
    assert.equal(/delete\s+from\s+public\.geo_resolution_events/i.test(migration), false);
  });

  it("creates no aliases and contains no fuzzy, spatial, title, URL, or network inference path", () => {
    assert.equal(/insert\s+into\s+public\.geo_aliases/i.test(migration), false);
    for (const forbidden of [
      "ST_Contains",
      "ST_DWithin",
      "levenshtein",
      "similarity(",
      "title ILIKE",
      "canonical_url ILIKE",
      "http_get",
      "net.http",
    ]) {
      assert.equal(migration.includes(forbidden), false, forbidden);
    }
  });

  it("keeps metric layers disabled", () => {
    assert.ok(migration.includes("'metric_layers_activated', false"));
  });
});
