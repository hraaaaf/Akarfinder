import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { AVIATION_IMMOBILIER_VISUAL, AVIATION_LIFESTYLE_VISUAL, AVIATION_NEIGHBORHOOD_VISUALS, AVIATION_SIGNATURE_VISUAL } from "../../../lib/contextual-illustrations/aviation-neighborhood-visuals";

const fixture = readFileSync("components/search/AviationNeighborhoodVisualQAFixture.tsx", "utf8");
const route = readFileSync("app/visual-qa/aviation/page.tsx", "utf8");
const audit = readFileSync("scripts/audits/neighborhood-visual-p1-3-aviation-visual-qa.mjs", "utf8");
const ingest = readFileSync("supabase/functions/neighborhood-visual-p1-3-aviation-ingest/index.ts", "utf8");
const migration = readFileSync("supabase/migrations/20260813000500_neighborhood_visual_p1_3_aviation_metadata.sql", "utf8");

describe("NEIGHBORHOOD-VISUAL-P1.3 — Aviation", () => {
  it("locks exactly three real, distinct, open-license sources", () => {
    assert.deepEqual(AVIATION_NEIGHBORHOOD_VISUALS.map(v => v.sceneRole), ["signature", "immobilier", "lifestyle"]);
    assert.equal(new Set(AVIATION_NEIGHBORHOOD_VISUALS.map(v => v.source.sha1)).size, 3);
    for (const visual of AVIATION_NEIGHBORHOOD_VISUALS) {
      assert.equal(visual.city, "Rabat"); assert.equal(visual.neighborhood, "Aviation");
      assert.equal(visual.source.sourceKind, "open_license"); assert.equal(visual.source.license, "CC BY-SA 4.0");
      assert.equal(visual.source.rightsBasis, "cc_by_sa_4_0"); assert.equal(visual.source.locationVerified, true);
      assert.match(visual.source.sha1, /^[0-9a-f]{40}$/); assert.ok(visual.source.bytes > 100_000);
      assert.equal(visual.activation.searchEnabled, false); assert.equal(visual.truthBoundary.depictsSpecificProperty, false);
    }
  });

  it("pins exact source identity and truth boundaries", () => {
    assert.equal(AVIATION_SIGNATURE_VISUAL.source.sha1, "9301a9696cbe7a420951f7179d12c755a6492610");
    assert.match(AVIATION_SIGNATURE_VISUAL.source.location, /Aviation/);
    assert.equal(AVIATION_IMMOBILIER_VISUAL.source.sha1, "d8e09bfdbad2fdef60f28840b90b79b45f77b8c6");
    assert.match(AVIATION_IMMOBILIER_VISUAL.source.locationEvidence, /edge|axis/i);
    assert.equal(AVIATION_LIFESTYLE_VISUAL.source.sha1, "3bfd758bb1bc62a0b9598de68f5940932a898eb7");
    assert.match(AVIATION_LIFESTYLE_VISUAL.source.locationEvidence, /34\.020405/);
  });

  it("uses real Search cards behind the QA environment gate", () => {
    assert.match(fixture, /SearchListingCardDark/); assert.match(fixture, /NeighborhoodVisualIdentityOverlay/);
    assert.match(fixture, /sofitel-rabat\.jpg/); assert.match(fixture, /avenue-mohamed-vi\.jpg/); assert.match(fixture, /260184419/);
    assert.match(route, /NEIGHBORHOOD_VISUAL_QA/); assert.match(route, /notFound\(\)/);
  });

  it("locks six-view responsive certification", () => {
    for (const viewport of ["360x800", "390x844", "768x900", "1024x800", "1280x900", "1440x900"]) assert.ok(audit.includes(viewport));
    assert.match(audit, /target_score: 9/); assert.match(audit, /machine_quality_score: 10/); assert.match(audit, /Photo d’ambiance/);
  });

  it("bounds ingestion to exact pinned source bytes", () => {
    for (const sha of ["9301a9696cbe7a420951f7179d12c755a6492610", "d8e09bfdbad2fdef60f28840b90b79b45f77b8c6", "3bfd758bb1bc62a0b9598de68f5940932a898eb7"]) assert.ok(ingest.includes(sha));
    assert.match(ingest, /P1\.3-AVIATION/);
  });

  it("reconciles Aviation metadata only after Storage objects exist", () => {
    assert.match(migration, /expected exactly 3 ingested Aviation visual objects/); assert.match(migration, /neighborhood_slug = 'aviation'/);
    assert.match(migration, /260184419/); assert.match(migration, /9301a9696cbe7a420951f7179d12c755a6492610/);
  });
});
