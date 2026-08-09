import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import {
  CONTEXTUAL_ILLUSTRATION_CATALOG,
  contextualKey,
} from "../../../lib/contextual-illustrations/catalog";
import { resolveContextualIllustration } from "../../../lib/contextual-illustrations/resolver";

const ROOT = process.cwd();
const source = (path: string) => readFileSync(resolve(ROOT, path), "utf8");

const EXPECTED_IDS = [
  "agadir-city-01", "agadir-city-02", "agadir-city-03", "agadir-city-04",
  "agadir-apartment-01", "agadir-apartment-02", "agadir-apartment-03", "agadir-apartment-04",
  "agadir-villa-01", "agadir-villa-02", "agadir-villa-03", "agadir-villa-04",
] as const;

const fixtures = [
  ["https://example.com/agadir/appartement/0", "Appartement", "agadir-apartment-01", "city_type"],
  ["https://example.com/agadir/appartement/1", "Appartement", "agadir-apartment-02", "city_type"],
  ["https://example.com/agadir/appartement/2", "Appartement", "agadir-apartment-03", "city_type"],
  ["https://example.com/agadir/appartement/3", "Appartement", "agadir-apartment-04", "city_type"],
  ["https://example.com/agadir/villa/0", "Villa", "agadir-villa-01", "city_type"],
  ["https://example.com/agadir/villa/1", "Villa", "agadir-villa-02", "city_type"],
  ["https://example.com/agadir/villa/2", "Villa", "agadir-villa-03", "city_type"],
  ["https://example.com/agadir/villa/3", "Villa", "agadir-villa-04", "city_type"],
  ["https://example.com/agadir/maison/0", "Maison", "agadir-city-04", "city"],
  ["https://example.com/agadir/maison/3", "Maison", "agadir-city-01", "city"],
  ["https://example.com/agadir/maison/5", "Maison", "agadir-city-02", "city"],
  ["https://example.com/agadir/maison/6", "Maison", "agadir-city-03", "city"],
] as const;

describe("CONTEXTUAL-ILLUSTRATIONS-AGADIR-PILOT-1", () => {
  it("ships exactly four Agadir city, apartment and villa variants", () => {
    assert.equal(CONTEXTUAL_ILLUSTRATION_CATALOG.city.Agadir?.length, 4);
    assert.equal(CONTEXTUAL_ILLUSTRATION_CATALOG.cityType[contextualKey("Agadir", "Appartement")]?.length, 4);
    assert.equal(CONTEXTUAL_ILLUSTRATION_CATALOG.cityType[contextualKey("Agadir", "Villa")]?.length, 4);
    assert.deepEqual(CONTEXTUAL_ILLUSTRATION_CATALOG.district, {});
    assert.deepEqual(CONTEXTUAL_ILLUSTRATION_CATALOG.districtType, {});
  });

  it("keeps all 12 asset IDs unique, local and backed by repository files", () => {
    const assets = [
      ...(CONTEXTUAL_ILLUSTRATION_CATALOG.city.Agadir ?? []),
      ...(CONTEXTUAL_ILLUSTRATION_CATALOG.cityType[contextualKey("Agadir", "Appartement")] ?? []),
      ...(CONTEXTUAL_ILLUSTRATION_CATALOG.cityType[contextualKey("Agadir", "Villa")] ?? []),
    ];
    assert.deepEqual([...new Set(assets.map((asset) => asset.id))].sort(), [...EXPECTED_IDS].sort());
    for (const asset of assets) {
      assert.match(asset.asset, /^\/images\/.+\.svg$/);
      assert.doesNotMatch(asset.asset, /^https?:/);
      assert.ok(existsSync(resolve(ROOT, "public", asset.asset.replace(/^\//, ""))), `missing ${asset.asset}`);
      assert.equal(asset.label, "Agadir");
    }
  });

  it("deterministically reaches every certified Agadir variant", () => {
    for (const [url, propertyType, expectedId, expectedTier] of fixtures) {
      const resolved = resolveContextualIllustration({
        stableRepresentationKey: url,
        normalizedCity: "Agadir",
        normalizedPropertyType: propertyType,
      });
      assert.equal(resolved?.id, expectedId, `${url} should resolve to ${expectedId}`);
      assert.equal(resolved?.tier, expectedTier);
      assert.equal(
        resolveContextualIllustration({
          stableRepresentationKey: `${url}/?utm_source=pilot#gallery`,
          normalizedCity: "Agadir",
          normalizedPropertyType: propertyType,
        })?.id,
        expectedId,
        "tracking/presentation noise must not remap the asset"
      );
    }
  });

  it("specializes only certified Appartement/Villa types and otherwise falls back to city", () => {
    assert.equal(
      resolveContextualIllustration({
        stableRepresentationKey: "https://example.com/agadir/terrain/10",
        normalizedCity: "Agadir",
        normalizedPropertyType: "Terrain",
      })?.tier,
      "city"
    );
    assert.equal(
      resolveContextualIllustration({
        stableRepresentationKey: "https://example.com/oujda/villa/10",
        normalizedCity: "Oujda",
        normalizedPropertyType: "Villa",
      }),
      null
    );
  });

  it("does not introduce district inference, free-text inference or external assets", () => {
    const catalog = source("lib/contextual-illustrations/catalog.ts");
    const resolver = source("lib/contextual-illustrations/resolver.ts");
    const combined = `${catalog}\n${resolver}`;
    assert.doesNotMatch(combined, /title|snippet|description/i);
    assert.doesNotMatch(catalog, /https?:\/\//);
    assert.doesNotMatch(catalog, /Math\.random|fetch\s*\(/);
    assert.match(catalog, /districtType: \{\}/);
    assert.match(catalog, /district: \{\}/);
  });

  it("preserves truth disclosure and thumbnail authority in the listing card", () => {
    const card = source("components/search/ExternalIndexedResultCard.tsx");
    const thumbnail = card.indexOf("showThumbnail && !thumbError");
    const contextual = card.indexOf("<ContextualListingArtwork");
    assert.ok(thumbnail >= 0 && contextual > thumbnail);
    assert.match(card, /data-contextual-illustration-label/);
    assert.match(card, />\s*Illustration\s*</);
    assert.match(card, /stableRepresentationKey=\{result\.original_url\}/);
  });

  it("keeps the P0 audit extension-safe instead of pinning the old singleton", () => {
    const predecessor = source("scripts/audits/contextual-illustrations-foundation-1-visual.mjs");
    assert.doesNotMatch(predecessor, /certified Agadir asset id drift/);
    assert.match(predecessor, /startsWith\("agadir-"\)/);
  });

  it("certifies five viewports, 12 unique assets and reload stability", () => {
    const audit = source("scripts/audits/contextual-illustrations-agadir-pilot-1-visual.mjs");
    for (const marker of ["360x800", "390x844", "768x900", "1280x900", "1440x900"]) {
      assert.ok(audit.includes(marker), `missing viewport ${marker}`);
    }
    assert.match(audit, /EXPECTED_ASSET_IDS/);
    assert.match(audit, /uniqueAssetIds\.size !== 12/);
    assert.match(audit, /page\.reload/);
    assert.match(audit, /clippedLabels/);
    assert.match(audit, /clippedPrices/);
  });

  it("workflow keeps P0 and Search predecessor contracts", () => {
    const workflow = source(".github/workflows/contextual-illustrations-agadir-pilot-1.yml");
    for (const predecessor of [
      "contextual-illustrations-agadir-pilot-1.test.ts",
      "contextual-illustrations-foundation-1.test.ts",
      "contextual-visual-assets-1.test.ts",
      "unified-listing-card-1.test.ts",
      "search-truth-tier.test.ts",
    ]) {
      assert.ok(workflow.includes(predecessor), `missing predecessor ${predecessor}`);
    }
  });
});
