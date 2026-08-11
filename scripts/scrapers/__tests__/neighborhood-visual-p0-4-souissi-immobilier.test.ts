import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SOUISSI_IMMOBILIER_VISUAL } from "../../../lib/contextual-illustrations/souissi-immobilier-visual";


describe("NEIGHBORHOOD-VISUAL-P0.4 — Souissi immobilier real-source asset", () => {
  it("uses a real open-license Souissi source", () => {
    assert.equal(SOUISSI_IMMOBILIER_VISUAL.source.fileName, "Rabat,Souissi1.jpg");
    assert.equal(SOUISSI_IMMOBILIER_VISUAL.source.sourceName, "Wikimedia Commons");
    assert.equal(SOUISSI_IMMOBILIER_VISUAL.source.author, "Bertramz");
    assert.equal(SOUISSI_IMMOBILIER_VISUAL.source.license, "CC BY-SA 3.0");
    assert.equal(SOUISSI_IMMOBILIER_VISUAL.source.locationVerified, true);
    assert.equal(SOUISSI_IMMOBILIER_VISUAL.source.width, 1440);
    assert.equal(SOUISSI_IMMOBILIER_VISUAL.source.height, 964);
  });

  it("describes built morphology without inventing a property", () => {
    assert.equal(SOUISSI_IMMOBILIER_VISUAL.sceneRole, "immobilier");
    assert.equal(SOUISSI_IMMOBILIER_VISUAL.semanticRole, "morphologie_batie");
    assert.equal(SOUISSI_IMMOBILIER_VISUAL.truthBoundary.depictsSpecificProperty, false);
    assert.equal(SOUISSI_IMMOBILIER_VISUAL.truthBoundary.claimVilla, false);
    assert.equal(SOUISSI_IMMOBILIER_VISUAL.truthBoundary.claimPropertyForSale, false);
    assert.equal(SOUISSI_IMMOBILIER_VISUAL.truthBoundary.claimResidentialInterior, false);
  });

  it("keeps the real photo untouched and uses Template A presentation only", () => {
    assert.equal(SOUISSI_IMMOBILIER_VISUAL.presentation.treatment, "css_only");
    assert.equal(SOUISSI_IMMOBILIER_VISUAL.presentation.preserveSourcePixels, true);
    assert.equal(SOUISSI_IMMOBILIER_VISUAL.presentation.bakedText, false);
    assert.ok(SOUISSI_IMMOBILIER_VISUAL.descriptors.length <= 3);
    assert.deepEqual(SOUISSI_IMMOBILIER_VISUAL.descriptors, ["Faible densité", "Grandes emprises", "Bâti bas"]);
  });

  it("remains off in Search until P0.6 visual QA", () => {
    assert.equal(SOUISSI_IMMOBILIER_VISUAL.activation.searchEnabled, false);
    assert.match(SOUISSI_IMMOBILIER_VISUAL.activation.reason, /P0\.6 visual QA/);
  });
});
