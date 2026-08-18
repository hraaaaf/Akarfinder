import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const gallery = readFileSync("components/listings/PropertyMediaGallery.tsx", "utf8");
const fallback = readFileSync("components/listings/PremiumIllustrativeInterior.tsx", "utf8");
const goal = readFileSync("docs/LISTING_VISUAL_L19_GOAL.md", "utf8");

describe("LISTING-VISUAL L19 premium illustrative fallback", () => {
  it("keeps the canonical truth boundary explicit", () => {
    assert.match(goal, /sans jamais la présenter comme une photo réelle/i);
    assert.match(goal, /label `Visuel illustratif` conservé/i);
    assert.match(goal, />= 9,2\/10/);
  });

  it("uses the premium interior only for the no-media fallback", () => {
    const fallbackMode = gallery.indexOf('data-property-media-mode="fallback"');
    const premiumInterior = gallery.indexOf("<PremiumIllustrativeInterior");
    const singleReal = gallery.indexOf('data-property-media-mode="single_real"');
    const galleryMode = gallery.indexOf('data-property-media-mode="gallery"');
    assert.ok(fallbackMode >= 0 && premiumInterior > fallbackMode, "Premium interior must live inside fallback mode");
    assert.ok(singleReal > premiumInterior && galleryMode > premiumInterior, "Real-media branches must remain downstream and distinct");
    assert.match(gallery, /data-property-media-fallback="premium-interior-illustration"/);
  });

  it("keeps the fallback visibly labelled as illustrative", () => {
    assert.match(gallery, /Visuel illustratif/);
    assert.match(fallback, /Illustration immobilière/);
    assert.doesNotMatch(fallback, /<img|https?:\/\//i);
  });

  it("preserves provider preview and real gallery paths", () => {
    assert.match(gallery, /data-property-media-mode="provider_preview"/);
    assert.match(gallery, /data-property-media-mode="single_real"/);
    assert.match(gallery, /data-property-media-mode="gallery"/);
    assert.match(gallery, /DbProviderThumbnail/);
    assert.match(gallery, /MediaImage/);
  });
});
