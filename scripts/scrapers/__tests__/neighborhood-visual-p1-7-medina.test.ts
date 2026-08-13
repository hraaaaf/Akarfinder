import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { MEDINA_NEIGHBORHOOD_VISUALS } from "../../../lib/contextual-illustrations/medina-neighborhood-visuals";

const fixture = readFileSync("components/search/MedinaNeighborhoodVisualQAFixture.tsx", "utf8");
const route = readFileSync("app/visual-qa/medina/page.tsx", "utf8");
const audit = readFileSync("scripts/audits/neighborhood-visual-p1-7-medina-visual-qa.mjs", "utf8");
const ingest = readFileSync("supabase/functions/neighborhood-visual-p1-7-medina-ingest/index.ts", "utf8");
const migration = readFileSync("supabase/migrations/20260813134000_neighborhood_visual_p1_7_medina_metadata.sql", "utf8");

describe("NEIGHBORHOOD-VISUAL-P1.7 — Medina", () => {
  it("locks three distinct sources", () => {
    assert.deepEqual(MEDINA_NEIGHBORHOOD_VISUALS.map(v => v.sceneRole), ["signature", "immobilier", "lifestyle"]);
    assert.equal(new Set(MEDINA_NEIGHBORHOOD_VISUALS.map(v => v.source.sha1)).size, 3);
    for (const visual of MEDINA_NEIGHBORHOOD_VISUALS) {
      assert.equal(visual.city, "Rabat");
      assert.equal(visual.neighborhood, "Médina");
      assert.equal(visual.source.sourceKind, "open_license");
      assert.equal(visual.source.locationVerified, true);
      assert.equal(visual.activation.searchEnabled, false);
      assert.ok(visual.source.bytes > 100000);
    }
  });

  it("pins exact source hashes", () => {
    const hashes = MEDINA_NEIGHBORHOOD_VISUALS.map(v => v.source.sha1);
    assert.deepEqual(hashes, [
      "6867e5f4d6a6891f13c167ba1a9eaaea266793ff",
      "4d41183ad3ca272837e1d668cc3433ad967a72ba",
      "d2a1ba64022489a7d501b6cb649d8291f1d591f2",
    ]);
  });

  it("uses real Search cards behind QA gate", () => {
    assert.ok(fixture.includes("SearchListingCardDark"));
    assert.ok(fixture.includes("NeighborhoodVisualIdentityOverlay"));
    assert.ok(route.includes("NEIGHBORHOOD_VISUAL_QA"));
    assert.ok(route.includes("notFound()"));
  });

  it("locks six-view responsive certification", () => {
    for (const viewport of ["360x800", "390x844", "768x900", "1024x800", "1280x900", "1440x900"]) assert.ok(audit.includes(viewport));
    assert.ok(audit.includes("target_score: 9"));
  });

  it("bounds ingestion and reconciliation", () => {
    for (const sha of ["6867e5f4d6a6891f13c167ba1a9eaaea266793ff", "4d41183ad3ca272837e1d668cc3433ad967a72ba", "d2a1ba64022489a7d501b6cb649d8291f1d591f2"]) assert.ok(ingest.includes(sha));
    assert.ok(ingest.includes("P1.7-MEDINA"));
    assert.ok(migration.includes("expected exactly 3 ingested Medina visual objects"));
    assert.ok(migration.includes("neighborhood_slug = 'medina'"));
  });
});
