import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { SOUISSI_SIGNATURE_VISUAL } from "../../../lib/contextual-illustrations/souissi-signature-visual";

const ROOT = process.cwd();
const overlaySource = readFileSync(
  resolve(ROOT, "components/search/NeighborhoodVisualIdentityOverlay.tsx"),
  "utf8",
);

describe("NEIGHBORHOOD-VISUAL-P0.3 — Souissi signature product asset", () => {
  it("uses the corrected P0.2R certified real landscape master", () => {
    assert.equal(SOUISSI_SIGNATURE_VISUAL.source.fileName, "Avenue Mohamed VI Souissi Rabat.jpg");
    assert.equal(SOUISSI_SIGNATURE_VISUAL.source.sourceName, "Wikimedia Commons");
    assert.equal(SOUISSI_SIGNATURE_VISUAL.source.author, "YousraElkh9");
    assert.equal(SOUISSI_SIGNATURE_VISUAL.source.license, "CC BY-SA 4.0");
    assert.equal(SOUISSI_SIGNATURE_VISUAL.source.geoVerified, true);
    assert.equal(SOUISSI_SIGNATURE_VISUAL.source.width, 3072);
    assert.equal(SOUISSI_SIGNATURE_VISUAL.source.height, 1728);
    assert.equal(SOUISSI_SIGNATURE_VISUAL.source.sha1, "d8e09bfdbad2fdef60f28840b90b79b45f77b8c6");
  });

  it("keeps source reality intact and applies identity only as UI presentation", () => {
    assert.equal(SOUISSI_SIGNATURE_VISUAL.presentation.treatment, "css_only");
    assert.equal(SOUISSI_SIGNATURE_VISUAL.presentation.preserveSourcePixels, true);
    assert.equal(SOUISSI_SIGNATURE_VISUAL.presentation.bakedText, false);
    assert.match(overlaySource, /data-neighborhood-template-a-overlay/);
    assert.match(overlaySource, /data-neighborhood-template-a-title/);
    assert.match(overlaySource, /data-neighborhood-template-a-descriptors/);
    assert.match(overlaySource, /Photo d’ambiance/);
  });

  it("locks the Model A identity payload to city, neighborhood and max three descriptors", () => {
    assert.equal(SOUISSI_SIGNATURE_VISUAL.city, "Rabat");
    assert.equal(SOUISSI_SIGNATURE_VISUAL.neighborhood, "Souissi");
    assert.equal(SOUISSI_SIGNATURE_VISUAL.sceneRole, "signature");
    assert.deepEqual(SOUISSI_SIGNATURE_VISUAL.descriptors, ["Résidentiel", "Verdoyant", "Faible densité"]);
    assert.ok(SOUISSI_SIGNATURE_VISUAL.descriptors.length <= 3);
  });

  it("does not activate the asset in Search before the P0.6 visual gate", () => {
    assert.equal(SOUISSI_SIGNATURE_VISUAL.activation.searchEnabled, false);
    assert.match(SOUISSI_SIGNATURE_VISUAL.activation.reason, /P0\.6 visual QA/);
  });
});
