import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import {
  RABAT_REAL_PHOTO_ASSETS,
  RABAT_REAL_PHOTO_LIBRARY,
  normalizeRabatNeighborhood,
  resolveRabatRealPhoto,
  type RabatNeighborhood,
} from "../../../lib/contextual-illustrations/rabat-real-photo-library";

const ROOT = process.cwd();
const source = (path: string) => readFileSync(resolve(ROOT, path), "utf8");
const DISTRICTS: readonly RabatNeighborhood[] = ["Agdal", "Hay Riad", "Souissi", "Océan", "Hassan"];

describe("RABAT-REAL-PHOTO-LIBRARY-1", () => {
  it("ships exactly 8 real-photo entries for each of 5 Rabat districts", () => {
    assert.equal(RABAT_REAL_PHOTO_ASSETS.length, 40);
    assert.equal(new Set(RABAT_REAL_PHOTO_ASSETS.map((asset) => asset.id)).size, 40);
    assert.equal(new Set(RABAT_REAL_PHOTO_ASSETS.map((asset) => asset.sourcePage)).size, 40);

    for (const district of DISTRICTS) {
      const pool = RABAT_REAL_PHOTO_LIBRARY[district];
      assert.equal(pool.length, 8, `${district} must have exactly 8 photos`);
      assert.ok(pool.every((asset) => asset.city === "Rabat" && asset.district === district));
    }
  });

  it("uses only Wikimedia Commons real-photo sources and no generated-image provider", () => {
    for (const asset of RABAT_REAL_PHOTO_ASSETS) {
      assert.match(asset.asset, /^https:\/\/commons\.wikimedia\.org\/wiki\/Special:Redirect\/file\//);
      assert.match(asset.asset, /\?width=960$/);
      assert.match(asset.sourcePage, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      assert.equal(asset.sourceName, "Wikimedia Commons");
      assert.doesNotMatch(`${asset.asset}\n${asset.sourcePage}`, /openai|dall-?e|firefly|midjourney|generated/i);
    }
  });

  it("normalizes only explicit structured district aliases", () => {
    assert.equal(normalizeRabatNeighborhood("Agdal"), "Agdal");
    assert.equal(normalizeRabatNeighborhood("Hay Ryad"), "Hay Riad");
    assert.equal(normalizeRabatNeighborhood("Océan"), "Océan");
    assert.equal(normalizeRabatNeighborhood("quartier ocean"), "Océan");
    assert.equal(normalizeRabatNeighborhood("Hassan II"), null);
    assert.equal(normalizeRabatNeighborhood("Unknown"), null);
  });

  it("is deterministic and can reach all 8 photos in every district", () => {
    for (const district of DISTRICTS) {
      const reached = new Set<string>();
      for (let index = 0; index < 10_000 && reached.size < 8; index += 1) {
        const stableKey = `listing-${district}-${index}`;
        const first = resolveRabatRealPhoto({ stableKey, city: "Rabat", district });
        const second = resolveRabatRealPhoto({ stableKey, city: "Rabat", district });
        assert.deepEqual(first, second);
        if (first) reached.add(first.id);
      }
      assert.equal(reached.size, 8, `${district} must deterministically reach all 8 variants`);
    }
  });

  it("fails closed outside a structured Rabat district", () => {
    assert.equal(resolveRabatRealPhoto({ stableKey: "a", city: "Casablanca", district: "Agdal" }), null);
    assert.equal(resolveRabatRealPhoto({ stableKey: "a", city: "Rabat", district: "Unknown" }), null);
    assert.equal(resolveRabatRealPhoto({ stableKey: "", city: "Rabat", district: "Agdal" }), null);
  });

  it("keeps the legacy contextual illustration catalog untouched", () => {
    const catalog = source("lib/contextual-illustrations/catalog.ts");
    assert.match(catalog, /districtType: \{\}/);
    assert.match(catalog, /district: \{\}/);
    assert.doesNotMatch(catalog, /rabat-real-photo-library|commons\.wikimedia/i);
  });

  it("keeps property photos authoritative and uses neighborhood photos only for fallback_visual", () => {
    const card = source("components/search/SearchListingCardDark.tsx");
    const providerThumbnail = card.indexOf('imageMode === "db_provider_thumbnail"');
    const ownedImage = card.indexOf('imageMode !== "fallback_visual"');
    const neighborhoodPhoto = card.indexOf("showNeighborhoodPhoto ?");

    assert.ok(providerThumbnail >= 0 && ownedImage > providerThumbnail && neighborhoodPhoto > ownedImage);
    assert.match(card, /resolveRabatRealPhoto/);
    assert.match(card, /district: listing\.neighborhood/);

    const resolverStart = card.indexOf("resolveRabatRealPhoto({");
    const resolverEnd = card.indexOf("})", resolverStart);
    assert.ok(resolverStart >= 0 && resolverEnd > resolverStart, "resolver call must be present");
    const resolverCall = card.slice(resolverStart, resolverEnd + 2);
    assert.doesNotMatch(resolverCall, /listing\.(title|description|description_snippet)/);
    assert.match(resolverCall, /stableKey: listing\.listing_url \?\? listing\.id/);
    assert.match(resolverCall, /city: listing\.city/);
    assert.match(resolverCall, /district: listing\.neighborhood/);

    assert.match(card, /Photo d’ambiance/);
    assert.match(card, /Crédit & licence · Wikimedia Commons/);
    assert.match(card, /data-neighborhood-photo-brand-overlay/);
    assert.match(card, /repeat\(2, minmax\(0, 1fr\)\)/);
  });
});
