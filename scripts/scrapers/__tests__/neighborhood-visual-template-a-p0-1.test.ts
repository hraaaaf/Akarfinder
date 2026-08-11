import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { NEIGHBORHOOD_VISUAL_TEMPLATE_A } from "../../../lib/contextual-illustrations/neighborhood-visual-template-a";

const ROOT = process.cwd();
const source = (path: string) => readFileSync(resolve(ROOT, path), "utf8");

describe("NEIGHBORHOOD-VISUAL-P0.1 — Template A", () => {
  it("locks Reality → AkarFinder as a fail-closed source policy", () => {
    const policy = NEIGHBORHOOD_VISUAL_TEMPLATE_A.sourcePolicy;
    assert.equal(policy.requiresRealSourcePhoto, true);
    assert.equal(policy.requiresGeoVerification, true);
    assert.equal(policy.requiresPublicationAndModificationRights, true);
    assert.equal(policy.allowsTextToImageSubstitution, false);
    assert.equal(policy.preservesSceneGeometry, true);
    assert.equal(policy.preservesVisibleArchitecture, true);
    assert.equal(policy.preservesCharacteristicVegetation, true);
    assert.equal(policy.forbidsInventedLandmarks, true);
  });

  it("locks a search-first horizontal composition", () => {
    const composition = NEIGHBORHOOD_VISUAL_TEMPLATE_A.composition;
    assert.equal(composition.orientation, "landscape");
    assert.equal(composition.masterAspectRatio, "16:9");
    assert.equal(composition.searchCropMode, "cover");
    assert.equal(composition.textSafeZone, "lower_left");
    assert.equal(composition.neighborhoodNameMaxLines, 1);
    assert.equal(composition.cityNameMaxLines, 1);
    assert.equal(composition.descriptorCountMax, 3);
    assert.equal(composition.disclosureLabel, "Photo d’ambiance");
  });

  it("matches the currently certified Search card image envelope", () => {
    const card = source("components/search/SearchListingCardDark.tsx");
    assert.match(card, /h-\[164px\]/);
    assert.match(card, /sm:h-\[196px\]/);
    assert.match(card, /object-cover/);
    assert.match(card, /Photo d’ambiance/);
    assert.match(card, /data-neighborhood-photo-brand-overlay/);
    assert.equal(NEIGHBORHOOD_VISUAL_TEMPLATE_A.searchCard.mobileImageHeightPx, 164);
    assert.equal(NEIGHBORHOOD_VISUAL_TEMPLATE_A.searchCard.desktopImageHeightPx, 196);
    assert.equal(NEIGHBORHOOD_VISUAL_TEMPLATE_A.searchCard.mobileColumns, 2);
  });

  it("keeps the visual treatment deliberately light", () => {
    const branding = NEIGHBORHOOD_VISUAL_TEMPLATE_A.branding;
    assert.equal(branding.photoDominance, "high");
    assert.equal(branding.treatment, "light");
    assert.deepEqual(branding.palette, ["cream", "deep_navy", "teal", "gold_accent"]);
    assert.equal(branding.neighborhoodNameStyle, "prominent");
    assert.equal(branding.cityNameStyle, "secondary");
    assert.equal(branding.descriptorsStyle, "compact");
  });
});
