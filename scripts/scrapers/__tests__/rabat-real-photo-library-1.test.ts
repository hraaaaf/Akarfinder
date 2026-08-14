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
const LEGACY_DISTRICTS: readonly RabatNeighborhood[] = ["Agdal", "Hay Riad", "Souissi", "Océan", "Hassan"];
const NEW_CERTIFIED_DISTRICTS: readonly RabatNeighborhood[] = ["Akkari", "Aviation", "Les Orangers", "Médina", "Yacoub El Mansour"];
const FULL_SEARCH_LEGACY_DISTRICTS: readonly RabatNeighborhood[] = ["Agdal", "Hay Riad", "Océan", "Hassan"];

const legacyAssets = LEGACY_DISTRICTS.flatMap((district) => RABAT_REAL_PHOTO_LIBRARY[district]);
const p2Assets = NEW_CERTIFIED_DISTRICTS.flatMap((district) => RABAT_REAL_PHOTO_LIBRARY[district]);

describe("RABAT-REAL-PHOTO-LIBRARY-1", () => {
  it("preserves the 40-source legacy library and adds five certified 3-scene P2 pools", () => {
    assert.equal(legacyAssets.length, 40);
    assert.equal(p2Assets.length, 15);
    assert.equal(RABAT_REAL_PHOTO_ASSETS.length, 55);
    assert.equal(new Set(RABAT_REAL_PHOTO_ASSETS.map((asset) => asset.id)).size, 55);

    for (const district of LEGACY_DISTRICTS) {
      const pool = RABAT_REAL_PHOTO_LIBRARY[district];
      assert.equal(pool.length, 8, `${district} must keep exactly 8 legacy source photos`);
      assert.ok(pool.every((asset) => asset.city === "Rabat" && asset.district === district));
    }
    for (const district of NEW_CERTIFIED_DISTRICTS) {
      const pool = RABAT_REAL_PHOTO_LIBRARY[district];
      assert.equal(pool.length, 3, `${district} must expose exactly 3 certified P1 scenes`);
      assert.ok(pool.every((asset) => asset.city === "Rabat" && asset.district === district));
    }
  });

  it("keeps the original 40 sources Commons-only and allows only certified Commons/KartaView sources in P2", () => {
    for (const asset of legacyAssets) {
      assert.match(asset.asset, /^https:\/\/commons\.wikimedia\.org\/wiki\/Special:Redirect\/file\//);
      assert.match(asset.asset, /\?width=960$/);
      assert.match(asset.sourcePage, /^https:\/\/commons\.wikimedia\.org\/wiki\/File%3A/i);
      assert.equal(asset.sourceName, "Wikimedia Commons");
    }
    for (const asset of p2Assets) {
      assert.ok(asset.sourceName === "Wikimedia Commons" || asset.sourceName === "KartaView");
      assert.ok(asset.fileName.length > 4);
      assert.doesNotMatch(`${asset.fileName}\n${asset.asset}\n${asset.sourcePage}`, /openai|dall-?e|firefly|midjourney|generated/i);
    }
  });

  it("normalizes only explicit structured district aliases", () => {
    assert.equal(normalizeRabatNeighborhood("Agdal"), "Agdal");
    assert.equal(normalizeRabatNeighborhood("Hay Ryad"), "Hay Riad");
    assert.equal(normalizeRabatNeighborhood("Océan"), "Océan");
    assert.equal(normalizeRabatNeighborhood("quartier ocean"), "Océan");
    assert.equal(normalizeRabatNeighborhood("Akkari"), "Akkari");
    assert.equal(normalizeRabatNeighborhood("Les Orangers"), "Les Orangers");
    assert.equal(normalizeRabatNeighborhood("Medina de Rabat"), "Médina");
    assert.equal(normalizeRabatNeighborhood("Hay El Fath"), "Yacoub El Mansour");
    assert.equal(normalizeRabatNeighborhood("Hay Al Fath"), "Yacoub El Mansour");
    assert.equal(normalizeRabatNeighborhood("Hassan II"), null);
    assert.equal(normalizeRabatNeighborhood("Unknown"), null);
  });

  it("stays deterministic while legacy Search pools preserve their existing reachability", () => {
    for (const district of FULL_SEARCH_LEGACY_DISTRICTS) {
      const reached = new Set<string>();
      for (let index = 0; index < 10_000 && reached.size < 8; index += 1) {
        const stableKey = `listing-${district}-${index}`;
        const first = resolveRabatRealPhoto({ stableKey, city: "Rabat", district });
        const second = resolveRabatRealPhoto({ stableKey, city: "Rabat", district });
        assert.deepEqual(first, second);
        assert.equal(first?.contextScope, "district");
        if (first) reached.add(first.id);
      }
      assert.equal(reached.size, 8, `${district} must deterministically reach all 8 Search variants`);
    }

    const souissiReached = new Set<string>();
    for (let index = 0; index < 10_000 && souissiReached.size < 5; index += 1) {
      const stableKey = `listing-Souissi-${index}`;
      const first = resolveRabatRealPhoto({ stableKey, city: "Rabat", district: "Souissi" });
      const second = resolveRabatRealPhoto({ stableKey, city: "Rabat", district: "Souissi" });
      assert.deepEqual(first, second);
      assert.equal(first?.contextScope, "district");
      assert.equal(first?.district, "Souissi");
      assert.doesNotMatch(first?.fileName.toLowerCase() ?? "", /fanzone|knawa/);
      if (first) souissiReached.add(first.id);
    }
    assert.equal(souissiReached.size, 5);
  });

  it("resolves each P2 certified district deterministically", () => {
    for (const district of NEW_CERTIFIED_DISTRICTS) {
      const input = { stableKey: `p2-${district}`, city: "Rabat", district };
      const first = resolveRabatRealPhoto(input);
      const second = resolveRabatRealPhoto(input);
      assert.ok(first);
      assert.deepEqual(first, second);
      assert.equal(first.contextScope, "district");
      assert.equal(first.district, district);
      assert.ok(RABAT_REAL_PHOTO_LIBRARY[district].some((asset) => asset.id === first.id));
    }
  });

  it("fails closed outside Rabat and keeps the city-only fallback legacy-safe", () => {
    assert.equal(resolveRabatRealPhoto({ stableKey: "a", city: "Casablanca", district: "Agdal" }), null);
    assert.equal(resolveRabatRealPhoto({ stableKey: "", city: "Rabat", district: "Agdal" }), null);
    const unsupported = resolveRabatRealPhoto({ stableKey: "unsupported-rabat-district-a", city: "Rabat", district: "Unknown" });
    const replay = resolveRabatRealPhoto({ stableKey: "unsupported-rabat-district-a", city: "Rabat", district: "Unknown" });
    assert.ok(unsupported);
    assert.deepEqual(unsupported, replay);
    assert.equal(unsupported.contextScope, "city");
    assert.equal(unsupported.city, "Rabat");
    assert.equal(unsupported.label, "Rabat");
    assert.equal(unsupported.sourceName, "Wikimedia Commons");
  });

  it("keeps the legacy contextual illustration catalog untouched", () => {
    const catalog = source("lib/contextual-illustrations/catalog.ts");
    assert.match(catalog, /districtType: \{\}/);
    assert.match(catalog, /district: \{\}/);
    assert.doesNotMatch(catalog, /rabat-real-photo-library|commons\.wikimedia/i);
  });

  it("keeps property photos authoritative and renders the exact ambience source credit", () => {
    const card = source("components/search/SearchListingCardDark.tsx");
    const providerThumbnail = card.indexOf('imageMode === "db_provider_thumbnail"');
    const ownedImage = card.indexOf('imageMode !== "fallback_visual"');
    const neighborhoodPhoto = card.indexOf("showNeighborhoodPhoto ?");
    assert.ok(providerThumbnail >= 0 && ownedImage > providerThumbnail && neighborhoodPhoto > ownedImage);
    assert.match(card, /resolveRabatRealPhoto/);
    assert.match(card, /district: listing\.neighborhood/);
    assert.match(card, /Photo d’ambiance/);
    assert.match(card, /Crédit & licence · \{neighborhoodPhoto\.sourceName\}/);
    assert.match(card, /data-neighborhood-photo-brand-overlay/);
    assert.match(card, /repeat\(2, minmax\(0, 1fr\)\)/);
  });
});
