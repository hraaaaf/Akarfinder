import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { AKKARI_IMMOBILIER_VISUAL, AKKARI_LIFESTYLE_VISUAL, AKKARI_NEIGHBORHOOD_VISUALS, AKKARI_SIGNATURE_VISUAL } from "../../../lib/contextual-illustrations/akkari-neighborhood-visuals";

const fixture = readFileSync("components/search/AkkariNeighborhoodVisualQAFixture.tsx", "utf8");
const route = readFileSync("app/visual-qa/akkari/page.tsx", "utf8");
const audit = readFileSync("scripts/audits/neighborhood-visual-p1-2-akkari-visual-qa.mjs", "utf8");
const ingest = readFileSync("supabase/functions/neighborhood-visual-p1-2-akkari-ingest/index.ts", "utf8");
const migration = readFileSync("supabase/migrations/20260812233500_neighborhood_visual_p1_2_akkari_metadata.sql", "utf8");

describe("NEIGHBORHOOD-VISUAL-P1.2 — Akkari", () => {
  it("locks exactly three real, distinct, open-license sources", () => {
    assert.deepEqual(AKKARI_NEIGHBORHOOD_VISUALS.map(v => v.sceneRole), ["signature", "immobilier", "lifestyle"]);
    assert.equal(new Set(AKKARI_NEIGHBORHOOD_VISUALS.map(v => v.source.sha1)).size, 3);
    for (const visual of AKKARI_NEIGHBORHOOD_VISUALS) {
      assert.equal(visual.city, "Rabat"); assert.equal(visual.neighborhood, "Akkari");
      assert.equal(visual.source.sourceKind, "open_license"); assert.equal(visual.source.license, "CC BY-SA 4.0");
      assert.equal(visual.source.rightsBasis, "cc_by_sa_4_0"); assert.equal(visual.source.locationVerified, true);
      assert.match(visual.source.sha1, /^[0-9a-f]{40}$/); assert.ok(visual.source.bytes > 100_000);
      assert.equal(visual.presentation.treatment, "css_only"); assert.equal(visual.presentation.preserveSourcePixels, true);
      assert.equal(visual.activation.searchEnabled, false); assert.equal(visual.truthBoundary.depictsSpecificProperty, false);
    }
  });

  it("pins exact source identity and geotag evidence", () => {
    assert.equal(AKKARI_SIGNATURE_VISUAL.source.sourceName, "Wikimedia Commons");
    assert.equal(AKKARI_SIGNATURE_VISUAL.source.sha1, "b81c1ec25a3de2b176911a8e6662ad8967d2c411");
    assert.match(AKKARI_SIGNATURE_VISUAL.source.fileName, /Haj Hassan Al Akkari Mosque/);
    assert.match(AKKARI_SIGNATURE_VISUAL.source.locationEvidence, /34\.01288605, -6\.86349618/);
    for (const [visual, id, sha1] of [
      [AKKARI_IMMOBILIER_VISUAL, "260132875", "2466f43109b1f2b0b5c55b4acca2a59585a7438e"],
      [AKKARI_LIFESTYLE_VISUAL, "260133961", "015123bef3d8a5c98d9f31ab3f3a581272a6ae4e"],
    ] as const) {
      assert.equal(visual.source.sourceName, "KartaView"); assert.match(visual.source.fileName, new RegExp(id));
      assert.equal(visual.source.sha1, sha1); assert.equal(visual.source.width, 1280); assert.equal(visual.source.height, 720);
      assert.match(visual.source.author, /KartaView Contributors/); assert.match(visual.source.location, /Akkari, Rabat/);
    }
  });

  it("uses real Search cards only behind the QA environment gate", () => {
    assert.match(fixture, /SearchListingCardDark/); assert.match(fixture, /NeighborhoodVisualIdentityOverlay/);
    for (const role of ["signature", "immobilier", "lifestyle"]) assert.ok(fixture.includes(`/__qa/akkari-${role}.jpg`));
    assert.match(route, /NEIGHBORHOOD_VISUAL_QA/); assert.match(route, /notFound\(\)/);
  });

  it("locks the six-view responsive gate and truthful credit", () => {
    for (const viewport of ["360x800", "390x844", "768x900", "1024x800", "1280x900", "1440x900"]) assert.ok(audit.includes(viewport));
    assert.match(audit, /target_score: 9/); assert.match(audit, /machine_quality_score: 10/);
    assert.match(audit, /KartaView Contributors/); assert.match(audit, /RACHID BAYA/); assert.match(audit, /Photo d’ambiance/);
  });

  it("bounds ingestion to the three exact certified JPEGs", () => {
    for (const sha of ["b81c1ec25a3de2b176911a8e6662ad8967d2c411", "2466f43109b1f2b0b5c55b4acca2a59585a7438e", "015123bef3d8a5c98d9f31ab3f3a581272a6ae4e"]) assert.ok(ingest.includes(sha));
    for (const path of ["rabat/akkari/signature/master.jpg", "rabat/akkari/immobilier/master.jpg", "rabat/akkari/lifestyle/master.jpg"]) assert.ok(ingest.includes(path));
    assert.match(ingest, /P1\.2-AKKARI/); assert.doesNotMatch(ingest, /mubawab|visitrabat/i);
  });

  it("reconciles Akkari metadata only after the three Storage objects exist", () => {
    assert.match(migration, /expected exactly 3 ingested Akkari visual objects/); assert.match(migration, /neighborhood_slug = 'akkari'/);
    assert.match(migration, /260132875/); assert.match(migration, /260133961/); assert.match(migration, /KartaView/);
    assert.match(migration, /b81c1ec25a3de2b176911a8e6662ad8967d2c411/); assert.match(migration, /transformed_asset_url = null/);
  });
});
