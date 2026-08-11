import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { SOUISSI_IMMOBILIER_VISUAL } from "../../../lib/contextual-illustrations/souissi-immobilier-visual";
import { SOUISSI_LIFESTYLE_VISUAL } from "../../../lib/contextual-illustrations/souissi-lifestyle-visual";
import { SOUISSI_SIGNATURE_VISUAL } from "../../../lib/contextual-illustrations/souissi-signature-visual";

const ROOT = process.cwd();
const fixtureSource = readFileSync(resolve(ROOT, "components/search/SouissiNeighborhoodVisualQAFixture.tsx"), "utf8");
const routeSource = readFileSync(resolve(ROOT, "app/visual-qa/souissi/page.tsx"), "utf8");
const auditSource = readFileSync(resolve(ROOT, "scripts/audits/neighborhood-visual-p0-6-souissi-visual-qa.mjs"), "utf8");

const visuals = [SOUISSI_SIGNATURE_VISUAL, SOUISSI_IMMOBILIER_VISUAL, SOUISSI_LIFESTYLE_VISUAL] as const;

describe("NEIGHBORHOOD-VISUAL-P0.6 — Souissi visual QA", () => {
  it("certifies exactly the three real Souissi scene contracts", () => {
    assert.deepEqual(visuals.map((visual) => visual.sceneRole), ["signature", "immobilier", "lifestyle"]);
    assert.equal(new Set(visuals.map((visual) => visual.source.fileName)).size, 3);
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

  it("uses the actual SearchListingCardDark component inside an env-gated QA fixture", () => {
    assert.match(fixtureSource, /SearchListingCardDark/);
    assert.match(fixtureSource, /NeighborhoodVisualIdentityOverlay/);
    assert.match(fixtureSource, /data-souissi-visual-qa-grid/);
    assert.match(fixtureSource, /grid-cols-2/);
    assert.match(fixtureSource, /lg:grid-cols-4/);
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

  it("locks the visual gate to 390 mobile and 1440 desktop with target score >= 9", () => {
    assert.match(auditSource, /mobile-390x844/);
    assert.match(auditSource, /desktop-1440x900/);
    assert.match(auditSource, /machine_quality_score: 10/);
    assert.match(auditSource, /target_score: 9/);
    assert.match(auditSource, /Photo d’ambiance/);
    assert.match(auditSource, /horizontal overflow/);
    assert.match(auditSource, /duplicate legacy neighborhood labeling/);
  });
});
