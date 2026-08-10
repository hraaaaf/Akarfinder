import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { CONTEXTUAL_ILLUSTRATION_CATALOG, contextualKey } from "../../../lib/contextual-illustrations/catalog";
import { resolveContextualIllustration } from "../../../lib/contextual-illustrations/resolver";

const ROOT = process.cwd();
const source = (path: string) => readFileSync(resolve(ROOT, path), "utf8");
const scale2Cities = ["Rabat", "Tanger", "Fès"] as const;

const fixtures = [
  ["Rabat", "Appartement", "https://example.com/rabat/appartement/5", "rabat-apartment-01", "city_type"],
  ["Rabat", "Appartement", "https://example.com/rabat/appartement/3", "rabat-apartment-02", "city_type"],
  ["Rabat", "Appartement", "https://example.com/rabat/appartement/4", "rabat-apartment-03", "city_type"],
  ["Rabat", "Appartement", "https://example.com/rabat/appartement/0", "rabat-apartment-04", "city_type"],
  ["Rabat", "Villa", "https://example.com/rabat/villa/0", "rabat-villa-01", "city_type"],
  ["Rabat", "Villa", "https://example.com/rabat/villa/5", "rabat-villa-02", "city_type"],
  ["Rabat", "Villa", "https://example.com/rabat/villa/6", "rabat-villa-03", "city_type"],
  ["Rabat", "Villa", "https://example.com/rabat/villa/1", "rabat-villa-04", "city_type"],
  ["Rabat", "Maison", "https://example.com/rabat/maison/0", "rabat-city-01", "city"],
  ["Rabat", "Maison", "https://example.com/rabat/maison/1", "rabat-city-02", "city"],
  ["Rabat", "Maison", "https://example.com/rabat/maison/6", "rabat-city-03", "city"],
  ["Rabat", "Maison", "https://example.com/rabat/maison/2", "rabat-city-04", "city"],
  ["Tanger", "Appartement", "https://example.com/tanger/appartement/5", "tanger-apartment-01", "city_type"],
  ["Tanger", "Appartement", "https://example.com/tanger/appartement/4", "tanger-apartment-02", "city_type"],
  ["Tanger", "Appartement", "https://example.com/tanger/appartement/3", "tanger-apartment-03", "city_type"],
  ["Tanger", "Appartement", "https://example.com/tanger/appartement/0", "tanger-apartment-04", "city_type"],
  ["Tanger", "Villa", "https://example.com/tanger/villa/5", "tanger-villa-01", "city_type"],
  ["Tanger", "Villa", "https://example.com/tanger/villa/4", "tanger-villa-02", "city_type"],
  ["Tanger", "Villa", "https://example.com/tanger/villa/3", "tanger-villa-03", "city_type"],
  ["Tanger", "Villa", "https://example.com/tanger/villa/0", "tanger-villa-04", "city_type"],
  ["Tanger", "Maison", "https://example.com/tanger/maison/1", "tanger-city-01", "city"],
  ["Tanger", "Maison", "https://example.com/tanger/maison/0", "tanger-city-02", "city"],
  ["Tanger", "Maison", "https://example.com/tanger/maison/3", "tanger-city-03", "city"],
  ["Tanger", "Maison", "https://example.com/tanger/maison/2", "tanger-city-04", "city"],
  ["Fès", "Appartement", "https://example.com/fes/appartement/0", "fes-apartment-01", "city_type"],
  ["Fès", "Appartement", "https://example.com/fes/appartement/2", "fes-apartment-02", "city_type"],
  ["Fès", "Appartement", "https://example.com/fes/appartement/5", "fes-apartment-03", "city_type"],
  ["Fès", "Appartement", "https://example.com/fes/appartement/1", "fes-apartment-04", "city_type"],
  ["Fès", "Villa", "https://example.com/fes/villa/1", "fes-villa-01", "city_type"],
  ["Fès", "Villa", "https://example.com/fes/villa/0", "fes-villa-02", "city_type"],
  ["Fès", "Villa", "https://example.com/fes/villa/10", "fes-villa-03", "city_type"],
  ["Fès", "Villa", "https://example.com/fes/villa/2", "fes-villa-04", "city_type"],
  ["Fès", "Maison", "https://example.com/fes/maison/1", "fes-city-01", "city"],
  ["Fès", "Maison", "https://example.com/fes/maison/4", "fes-city-02", "city"],
  ["Fès", "Maison", "https://example.com/fes/maison/3", "fes-city-03", "city"],
  ["Fès", "Maison", "https://example.com/fes/maison/0", "fes-city-04", "city"],
] as const;

describe("CONTEXTUAL-ILLUSTRATIONS-SCALE-2", () => {
  it("scales Rabat, Tanger and Fès to 4+4+4 pools", () => {
    for (const city of scale2Cities) {
      assert.equal(CONTEXTUAL_ILLUSTRATION_CATALOG.city[city]?.length, 4);
      assert.equal(CONTEXTUAL_ILLUSTRATION_CATALOG.cityType[contextualKey(city, "Appartement")]?.length, 4);
      assert.equal(CONTEXTUAL_ILLUSTRATION_CATALOG.cityType[contextualKey(city, "Villa")]?.length, 4);
    }
    assert.deepEqual(CONTEXTUAL_ILLUSTRATION_CATALOG.district, {});
    assert.deepEqual(CONTEXTUAL_ILLUSTRATION_CATALOG.districtType, {});
  });

  it("maps structured Fes and Fès aliases onto the exact same pools", () => {
    assert.deepEqual(CONTEXTUAL_ILLUSTRATION_CATALOG.city.Fes, CONTEXTUAL_ILLUSTRATION_CATALOG.city["Fès"]);
    assert.deepEqual(CONTEXTUAL_ILLUSTRATION_CATALOG.cityType[contextualKey("Fes", "Appartement")], CONTEXTUAL_ILLUSTRATION_CATALOG.cityType[contextualKey("Fès", "Appartement")]);
    assert.deepEqual(CONTEXTUAL_ILLUSTRATION_CATALOG.cityType[contextualKey("Fes", "Villa")], CONTEXTUAL_ILLUSTRATION_CATALOG.cityType[contextualKey("Fès", "Villa")]);
  });

  it("ships exactly 36 unique SCALE-2 asset IDs backed by local SVGs", () => {
    const assets = scale2Cities.flatMap((city) => [
      ...(CONTEXTUAL_ILLUSTRATION_CATALOG.city[city] ?? []),
      ...(CONTEXTUAL_ILLUSTRATION_CATALOG.cityType[contextualKey(city, "Appartement")] ?? []),
      ...(CONTEXTUAL_ILLUSTRATION_CATALOG.cityType[contextualKey(city, "Villa")] ?? []),
    ]);
    assert.equal(assets.length, 36);
    assert.equal(new Set(assets.map((asset) => asset.id)).size, 36);
    for (const asset of assets) {
      assert.match(asset.asset, /^\/images\/.+\.svg$/);
      assert.doesNotMatch(asset.asset, /^https?:/);
      assert.ok(existsSync(resolve(ROOT, "public", asset.asset.replace(/^\//, ""))), `missing ${asset.asset}`);
    }
  });

  it("deterministically reaches all 36 SCALE-2 variants", () => {
    const reached = new Set<string>();
    for (const [city, propertyType, url, expectedId, expectedTier] of fixtures) {
      const resolved = resolveContextualIllustration({ stableRepresentationKey: url, normalizedCity: city, normalizedPropertyType: propertyType });
      assert.equal(resolved?.id, expectedId, `${url} should resolve to ${expectedId}`);
      assert.equal(resolved?.tier, expectedTier);
      assert.equal(resolveContextualIllustration({ stableRepresentationKey: `${url}/?utm_source=scale2#gallery`, normalizedCity: city, normalizedPropertyType: propertyType })?.id, expectedId);
      reached.add(resolved!.id);
    }
    assert.equal(reached.size, 36);
  });

  it("preserves Agadir P1 and SCALE-1 city pools", () => {
    for (const city of ["Agadir", "Marrakech", "Casablanca"] as const) {
      assert.equal(CONTEXTUAL_ILLUSTRATION_CATALOG.city[city]?.length, 4);
      assert.equal(CONTEXTUAL_ILLUSTRATION_CATALOG.cityType[contextualKey(city, "Appartement")]?.length, 4);
      assert.equal(CONTEXTUAL_ILLUSTRATION_CATALOG.cityType[contextualKey(city, "Villa")]?.length, 4);
    }
  });

  it("keeps truth and scope boundaries intact", () => {
    const catalog = source("lib/contextual-illustrations/catalog.ts");
    const resolver = source("lib/contextual-illustrations/resolver.ts");
    const card = source("components/search/ExternalIndexedResultCard.tsx");
    assert.doesNotMatch(`${catalog}\n${resolver}`, /title|snippet|description/i);
    assert.doesNotMatch(catalog, /https?:\/\//);
    assert.doesNotMatch(catalog, /Math\.random|fetch\s*\(/);
    assert.match(catalog, /districtType: \{\}/);
    assert.match(catalog, /district: \{\}/);
    assert.match(card, /showThumbnail && !thumbError/);
    assert.match(card, />\s*Illustration\s*</);
  });

  it("certifies five viewports, 36 SCALE-2 assets, lazy hydration and fallbacks", () => {
    const audit = source("scripts/audits/contextual-illustrations-scale-2-visual.mjs");
    for (const marker of ["360x800", "390x844", "768x900", "1280x900", "1440x900"]) assert.ok(audit.includes(marker));
    assert.match(audit, /EXPECTED_SCALE2_IDS/);
    assert.match(audit, /uniqueScale2Ids\.size !== 36/);
    assert.match(audit, /hydrateLazyVisuals/);
    assert.match(audit, /naturalWidth > 0/);
    assert.match(audit, /page\.reload/);
    assert.match(audit, /clippedLabels/);
    assert.match(audit, /clippedPrices/);
  });

  it("workflow replays SCALE-1, P1/P0 and Search predecessors", () => {
    const workflow = source(".github/workflows/contextual-illustrations-scale-2.yml");
    for (const predecessor of ["contextual-illustrations-scale-2.test.ts", "contextual-illustrations-scale-1.test.ts", "contextual-illustrations-agadir-pilot-1.test.ts", "contextual-illustrations-foundation-1.test.ts", "contextual-visual-assets-1.test.ts", "unified-listing-card-1.test.ts", "search-truth-tier.test.ts"]) assert.ok(workflow.includes(predecessor));
  });
});
