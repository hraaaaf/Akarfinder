import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { HASSAN_IMMOBILIER_VISUAL, HASSAN_LIFESTYLE_VISUAL, HASSAN_NEIGHBORHOOD_VISUALS, HASSAN_SIGNATURE_VISUAL } from "../../../lib/contextual-illustrations/hassan-neighborhood-visuals";

const fixture = readFileSync("components/search/HassanNeighborhoodVisualQAFixture.tsx", "utf8");
const route = readFileSync("app/visual-qa/hassan/page.tsx", "utf8");
const audit = readFileSync("scripts/audits/neighborhood-visual-p1-4-hassan-visual-qa.mjs", "utf8");
const ingest = readFileSync("supabase/functions/neighborhood-visual-p1-4-hassan-ingest/index.ts", "utf8");
const migration = readFileSync("supabase/migrations/20260813105000_neighborhood_visual_p1_4_hassan_metadata.sql", "utf8");

describe("NEIGHBORHOOD-VISUAL-P1.4 — Hassan", () => {
  it("locks exactly three distinct real open-license sources", () => {
    assert.deepEqual(HASSAN_NEIGHBORHOOD_VISUALS.map(v => v.sceneRole), ["signature", "immobilier", "lifestyle"]);
    assert.equal(new Set(HASSAN_NEIGHBORHOOD_VISUALS.map(v => v.source.sha1)).size, 3);
    for (const visual of HASSAN_NEIGHBORHOOD_VISUALS) {
      assert.equal(visual.city, "Rabat"); assert.equal(visual.neighborhood, "Hassan");
      assert.equal(visual.source.sourceKind, "open_license");
      assert.ok(["CC BY-SA 4.0", "CC BY-SA 3.0"].includes(visual.source.license));
      assert.equal(visual.source.locationVerified, true);
      assert.equal(visual.source.relationshipToNeighborhood, "inside_context");
      assert.match(visual.source.sha1, /^[0-9a-f]{40}$/); assert.ok(visual.source.bytes > 100_000);
      assert.equal(visual.activation.searchEnabled, false); assert.equal(visual.truthBoundary.depictsSpecificProperty, false);
    }
  });

  it("pins exact source identity and Hassan evidence", () => {
    assert.equal(HASSAN_SIGNATURE_VISUAL.source.sha1, "6522403ac6ec1bf56276a8aa5794693a66aa7c08");
    assert.match(HASSAN_SIGNATURE_VISUAL.source.locationEvidence, /34\.023864/);
    assert.equal(HASSAN_IMMOBILIER_VISUAL.source.sha1, "ffc30f2a48e055403880d933e29e16a853986e3e");
    assert.match(HASSAN_IMMOBILIER_VISUAL.source.locationEvidence, /Hassan Tower plaza/i);
    assert.equal(HASSAN_LIFESTYLE_VISUAL.source.sha1, "fe36362031f75d1835931f46e15f8e43dccc4a7c");
    assert.match(HASSAN_LIFESTYLE_VISUAL.source.locationEvidence, /34\.021671/);
  });

  it("uses real Search cards behind the QA environment gate", () => {
    assert.match(fixture, /SearchListingCardDark/); assert.match(fixture, /NeighborhoodVisualIdentityOverlay/);
    for (const role of ["signature", "immobilier", "lifestyle"]) assert.ok(fixture.includes(`/__qa/hassan-${role}.jpg`));
    assert.match(route, /NEIGHBORHOOD_VISUAL_QA/); assert.match(route, /notFound\(\)/);
  });

  it("locks six-view responsive certification", () => {
    for (const viewport of ["360x800", "390x844", "768x900", "1024x800", "1280x900", "1440x900"]) assert.ok(audit.includes(viewport));
    assert.match(audit, /target_score: 9/); assert.match(audit, /machine_quality_score: 10/); assert.match(audit, /Photo d’ambiance/);
  });

  it("bounds ingestion to exact certified source bytes", () => {
    for (const sha of ["6522403ac6ec1bf56276a8aa5794693a66aa7c08", "ffc30f2a48e055403880d933e29e16a853986e3e", "fe36362031f75d1835931f46e15f8e43dccc4a7c"]) assert.ok(ingest.includes(sha));
    assert.match(ingest, /P1\.4-HASSAN/);
  });

  it("reconciles Hassan metadata only after Storage objects exist", () => {
    assert.match(migration, /expected exactly 3 ingested Hassan visual objects/);
    assert.match(migration, /neighborhood_slug = 'hassan'/);
    assert.match(migration, /6522403ac6ec1bf56276a8aa5794693a66aa7c08/);
    assert.match(migration, /fe36362031f75d1835931f46e15f8e43dccc4a7c/);
  });
});
