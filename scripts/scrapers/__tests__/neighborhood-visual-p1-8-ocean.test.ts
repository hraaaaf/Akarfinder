import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { OCEAN_NEIGHBORHOOD_VISUALS } from "../../../lib/contextual-illustrations/ocean-neighborhood-visuals";

const fixture = readFileSync("components/search/OceanNeighborhoodVisualQAFixture.tsx", "utf8");
const route = readFileSync("app/visual-qa/ocean/page.tsx", "utf8");
const audit = readFileSync("scripts/audits/neighborhood-visual-p1-8-ocean-visual-qa.mjs", "utf8");
const ingest = readFileSync("supabase/functions/neighborhood-visual-p1-8-ocean-ingest/index.ts", "utf8");

describe("NEIGHBORHOOD-VISUAL-P1.8 — Ocean", () => {
  it("locks three distinct truth-bounded sources", () => {
    assert.deepEqual(OCEAN_NEIGHBORHOOD_VISUALS.map(v => v.sceneRole), ["signature", "immobilier", "lifestyle"]);
    assert.equal(new Set(OCEAN_NEIGHBORHOOD_VISUALS.map(v => v.source.sha1)).size, 3);
    for (const visual of OCEAN_NEIGHBORHOOD_VISUALS) {
      assert.equal(visual.city, "Rabat");
      assert.equal(visual.neighborhood, "Océan");
      assert.equal(visual.source.sourceKind, "open_license");
      assert.equal(visual.source.license, "CC BY-SA 4.0");
      assert.equal(visual.source.locationVerified, true);
      assert.ok(["edge_context", "nearby_context"].includes(visual.source.relationshipToNeighborhood));
      assert.equal(visual.truthBoundary.claimInsideNeighborhood, false);
      assert.equal(visual.activation.searchEnabled, false);
      assert.ok(visual.source.bytes > 100000);
    }
  });

  it("pins exact source hashes", () => {
    assert.deepEqual(OCEAN_NEIGHBORHOOD_VISUALS.map(v => v.source.sha1), [
      "561b72a1093fd4fc207e573447f9de94330e66b1",
      "33bc545195a8ba9904e9b68519cf2c4714af11b7",
      "ec76f6f5f505a30bafc32810158e7bc014eb4983",
    ]);
  });

  it("uses real Search cards behind QA gate", () => {
    assert.ok(fixture.includes("SearchListingCardDark"));
    assert.ok(fixture.includes("OCEAN_NEIGHBORHOOD_VISUALS"));
    assert.ok(route.includes("NEIGHBORHOOD_VISUAL_QA"));
    assert.ok(route.includes("notFound()"));
  });

  it("locks six-view responsive certification", () => {
    for (const viewport of ["360x800", "390x844", "768x900", "1024x800", "1280x900", "1440x900"]) assert.ok(audit.includes(viewport));
    assert.ok(audit.includes("target_score: 9"));
  });

  it("bounds physical ingestion while Search activation stays gated", () => {
    for (const sha of ["561b72a1093fd4fc207e573447f9de94330e66b1", "33bc545195a8ba9904e9b68519cf2c4714af11b7", "ec76f6f5f505a30bafc32810158e7bc014eb4983"]) assert.ok(ingest.includes(sha));
    assert.ok(ingest.includes("P1.8-OCEAN"));
    for (const visual of OCEAN_NEIGHBORHOOD_VISUALS) assert.equal(visual.activation.searchEnabled, false);
  });
});
