import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SOUISSI_LIFESTYLE_VISUAL } from "../../../lib/contextual-illustrations/souissi-lifestyle-visual";

describe("NEIGHBORHOOD-VISUAL-P0.5 — Souissi lifestyle real-source asset", () => {
  it("uses a real geo-verified Rabat-Souissi source with open remix rights", () => {
    assert.equal(SOUISSI_LIFESTYLE_VISUAL.source.fileName, "Hassan II Park - Rabat - November 2024 - 1.jpg");
    assert.equal(SOUISSI_LIFESTYLE_VISUAL.source.sourceName, "Wikimedia Commons");
    assert.equal(SOUISSI_LIFESTYLE_VISUAL.source.author, "Anass Sedrati");
    assert.equal(SOUISSI_LIFESTYLE_VISUAL.source.license, "CC BY-SA 4.0");
    assert.equal(SOUISSI_LIFESTYLE_VISUAL.source.locationVerified, true);
    assert.equal(SOUISSI_LIFESTYLE_VISUAL.source.width, 4032);
    assert.equal(SOUISSI_LIFESTYLE_VISUAL.source.height, 3024);
  });

  it("keeps the lifestyle meaning bounded to public green-space context", () => {
    assert.equal(SOUISSI_LIFESTYLE_VISUAL.sceneRole, "lifestyle");
    assert.equal(SOUISSI_LIFESTYLE_VISUAL.semanticRole, "cadre_de_vie");
    assert.equal(SOUISSI_LIFESTYLE_VISUAL.truthBoundary.depictsSpecificProperty, false);
    assert.equal(SOUISSI_LIFESTYLE_VISUAL.truthBoundary.claimPrivateGarden, false);
    assert.equal(SOUISSI_LIFESTYLE_VISUAL.truthBoundary.claimPropertyAmenity, false);
  });

  it("preserves source pixels and uses max three Template A descriptors", () => {
    assert.equal(SOUISSI_LIFESTYLE_VISUAL.presentation.treatment, "css_only");
    assert.equal(SOUISSI_LIFESTYLE_VISUAL.presentation.preserveSourcePixels, true);
    assert.equal(SOUISSI_LIFESTYLE_VISUAL.presentation.bakedText, false);
    assert.deepEqual(SOUISSI_LIFESTYLE_VISUAL.descriptors, ["Verdure", "Calme", "Espaces ouverts"]);
    assert.ok(SOUISSI_LIFESTYLE_VISUAL.descriptors.length <= 3);
  });

  it("does not activate Search before P0.6 visual QA", () => {
    assert.equal(SOUISSI_LIFESTYLE_VISUAL.activation.searchEnabled, false);
    assert.match(SOUISSI_LIFESTYLE_VISUAL.activation.reason, /P0\.6 visual QA/);
  });
});
