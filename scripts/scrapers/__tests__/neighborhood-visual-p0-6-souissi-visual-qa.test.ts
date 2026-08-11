import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { SOUISSI_IMMOBILIER_VISUAL } from "../../../lib/contextual-illustrations/souissi-immobilier-visual";
import { SOUISSI_LIFESTYLE_VISUAL } from "../../../lib/contextual-illustrations/souissi-lifestyle-visual";
import { SOUISSI_SIGNATURE_VISUAL } from "../../../lib/contextual-illustrations/souissi-signature-visual";

const ROOT = process.cwd();
const fixtureSource = readFileSync(resolve(ROOT, "components/search/SouissiNeighborhoodVisualQAFixture.tsx"), "utf8");
const overlaySource = readFileSync(resolve(ROOT, "components/search/NeighborhoodVisualIdentityOverlay.tsx"), "utf8");
const routeSource = readFileSync(resolve(ROOT, "app/visual-qa/souissi/page.tsx"), "utf8");
const auditSource = readFileSync(resolve(ROOT, "scripts/audits/neighborhood-visual-p0-6-souissi-visual-qa.mjs"), "utf8");
const visuals = [SOUISSI_SIGNATURE_VISUAL, SOUISSI_IMMOBILIER_VISUAL, SOUISSI_LIFESTYLE_VISUAL] as const;

describe("NEIGHBORHOOD-VISUAL-P0.6 v2 — Souissi visual QA", () => {
  it("certifies the three real Souissi scenes with the corrected landscape Signature master", () => {
    assert.deepEqual(visuals.map((visual) => visual.sceneRole), ["signature", "immobilier", "lifestyle"]);
    assert.equal(new Set(visuals.map((visual) => visual.source.fileName)).size, 3);
    assert.equal(SOUISSI_SIGNATURE_VISUAL.source.fileName, "Avenue Mohamed VI Souissi Rabat.jpg");
    assert.equal(SOUISSI_SIGNATURE_VISUAL.source.width, 3072);
    assert.equal(SOUISSI_SIGNATURE_VISUAL.source.height, 1728);
    assert.equal(SOUISSI_SIGNATURE_VISUAL.source.sha1, "d8e09bfdbad2fdef60f28840b90b79b45f77b8c6");
    for (const visual of visuals) {
      assert.equal(visual.city, "Rabat");
      assert.equal(visual.neighborhood, "Souissi");
      assert.equal(visual.presentation.treatment, "css_only");
      assert.equal(visual.presentation.preserveSourcePixels, true);
      assert.equal(visual.presentation.bakedText, false);
      assert.equal(visual.activation.searchEnabled, false);
      assert.ok(visual.descriptors.length <= 3);
      assert.match(visual.source.license, /^CC BY-SA /);
    }
  });

  it("uses the actual Search card and keeps Model A descriptors visible at mobile width", () => {
    assert.match(fixtureSource, /SearchListingCardDark/);
    assert.match(fixtureSource, /NeighborhoodVisualIdentityOverlay/);
    assert.match(fixtureSource, /grid-cols-2/);
    assert.doesNotMatch(overlaySource, /data-neighborhood-template-a-descriptors[\s\S]*hidden/);
    assert.match(overlaySource, /data-neighborhood-template-a-descriptors/);
    assert.match(routeSource, /NEIGHBORHOOD_VISUAL_QA/);
    assert.match(routeSource, /notFound\(\)/);
  });

  it("keeps production Search activation off while physically ingesting sources only in CI", () => {
    assert.doesNotMatch(fixtureSource, /resolveRabatRealPhoto\(/);
    assert.doesNotMatch(fixtureSource, /resolveContextualIllustration\(/);
    assert.match(fixtureSource, /\/__qa\/souissi-signature\.jpg/);
    assert.match(fixtureSource, /\/__qa\/souissi-immobilier\.jpg/);
    assert.match(fixtureSource, /\/__qa\/souissi-lifestyle\.jpg/);
  });

  it("makes mobile descriptor visibility and the real 3072x1728 Signature source blocking gates", () => {
    assert.match(auditSource, /mobile-390x844/);
    assert.match(auditSource, /desktop-1440x900/);
    assert.match(auditSource, /signature master must be 3072x1728/);
    assert.match(auditSource, /descriptors must remain visibly rendered/);
    assert.match(auditSource, /machine_quality_score: 10/);
    assert.match(auditSource, /target_score: 9/);
    assert.match(auditSource, /Photo d’ambiance/);
    assert.match(auditSource, /horizontal overflow/);
  });
});
