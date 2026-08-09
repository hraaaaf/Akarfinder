import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { CONTEXTUAL_ILLUSTRATION_CATALOG, contextualKey } from "../../../lib/contextual-illustrations/catalog";
import { resolveContextualIllustration } from "../../../lib/contextual-illustrations/resolver";

const ROOT = process.cwd();
const source = (path: string) => readFileSync(resolve(ROOT, path), "utf8");
const scaleCities = ["Marrakech", "Casablanca"] as const;

const fixtures = [
  ["Marrakech", "Appartement", "https://example.com/marrakech/appartement/0", "marrakech-apartment-01", "city_type"],
  ["Marrakech", "Appartement", "https://example.com/marrakech/appartement/5", "marrakech-apartment-02", "city_type"],
  ["Marrakech", "Appartement", "https://example.com/marrakech/appartement/2", "marrakech-apartment-03", "city_type"],
  ["Marrakech", "Appartement", "https://example.com/marrakech/appartement/1", "marrakech-apartment-04", "city_type"],
  ["Marrakech", "Villa", "https://example.com/marrakech/villa/1", "marrakech-villa-01", "city_type"],
  ["Marrakech", "Villa", "https://example.com/marrakech/villa/3", "marrakech-villa-02", "city_type"],
  ["Marrakech", "Villa", "https://example.com/marrakech/villa/0", "marrakech-villa-03", "city_type"],
  ["Marrakech", "Villa", "https://example.com/marrakech/villa/2", "marrakech-villa-04", "city_type"],
  ["Marrakech", "Maison", "https://example.com/marrakech/maison/5", "marrakech-city-01", "city"],
  ["Marrakech", "Maison", "https://example.com/marrakech/maison/7", "marrakech-city-02", "city"],
  ["Marrakech", "Maison", "https://example.com/marrakech/maison/0", "marrakech-city-03", "city"],
  ["Marrakech", "Maison", "https://example.com/marrakech/maison/1", "marrakech-city-04", "city"],
  ["Casablanca", "Appartement", "https://example.com/casablanca/appartement/4", "casablanca-apartment-01", "city_type"],
  ["Casablanca", "Appartement", "https://example.com/casablanca/appartement/6", "casablanca-apartment-02", "city_type"],
  ["Casablanca", "Appartement", "https://example.com/casablanca/appartement/1", "casablanca-apartment-03", "city_type"],
  ["Casablanca", "Appartement", "https://example.com/casablanca/appartement/0", "casablanca-apartment-04", "city_type"],
  ["Casablanca", "Villa", "https://example.com/casablanca/villa/4", "casablanca-villa-01", "city_type"],
  ["Casablanca", "Villa", "https://example.com/casablanca/villa/6", "casablanca-villa-02", "city_type"],
  ["Casablanca", "Villa", "https://example.com/casablanca/villa/9", "casablanca-villa-03", "city_type"],
  ["Casablanca", "Villa", "https://example.com/casablanca/villa/0", "casablanca-villa-04", "city_type"],
  ["Casablanca", "Maison", "https://example.com/casablanca/maison/0", "casablanca-city-01", "city"],
  ["Casablanca", "Maison", "https://example.com/casablanca/maison/6", "casablanca-city-02", "city"],
  ["Casablanca", "Maison", "https://example.com/casablanca/maison/5", "casablanca-city-03", "city"],
  ["Casablanca", "Maison", "https://example.com/casablanca/maison/1", "casablanca-city-04", "city"],
] as const;

describe("CONTEXTUAL-ILLUSTRATIONS-SCALE-1", () => {
  it("scales only Marrakech and Casablanca to 4+4+4 pools", () => {
    for (const city of scaleCities) {
      assert.equal(CONTEXTUAL_ILLUSTRATION_CATALOG.city[city]?.length, 4);
      assert.equal(CONTEXTUAL_ILLUSTRATION_CATALOG.cityType[contextualKey(city, "Appartement")]?.length, 4);
      assert.equal(CONTEXTUAL_ILLUSTRATION_CATALOG.cityType[contextualKey(city, "Villa")]?.length, 4);
    }
    assert.equal(CONTEXTUAL_ILLUSTRATION_CATALOG.city.Agadir?.length, 4);
    assert.deepEqual(CONTEXTUAL_ILLUSTRATION_CATALOG.district, {});
    assert.deepEqual(CONTEXTUAL_ILLUSTRATION_CATALOG.districtType, {});
  });

  it("ships exactly 24 unique scale asset IDs backed by local SVGs", () => {
    const assets = scaleCities.flatMap((city) => [
      ...(CONTEXTUAL_ILLUSTRATION_CATALOG.city[city] ?? []),
      ...(CONTEXTUAL_ILLUSTRATION_CATALOG.cityType[contextualKey(city, "Appartement")] ?? []),
      ...(CONTEXTUAL_ILLUSTRATION_CATALOG.cityType[contextualKey(city, "Villa")] ?? []),
    ]);
    assert.equal(assets.length, 24);
    assert.equal(new Set(assets.map((asset) => asset.id)).size, 24);
    for (const asset of assets) {
      assert.match(asset.asset, /^\/images\/.+\.svg$/);
      assert.doesNotMatch(asset.asset, /^https?:/);
      assert.ok(existsSync(resolve(ROOT, "public", asset.asset.replace(/^\//, ""))), `missing ${asset.asset}`);
    }
  });

  it("deterministically reaches all 24 scaled variants", () => {
    const reached = new Set<string>();
    for (const [city, propertyType, url, expectedId, expectedTier] of fixtures) {
      const resolved = resolveContextualIllustration({ stableRepresentationKey: url, normalizedCity: city, normalizedPropertyType: propertyType });
      assert.equal(resolved?.id, expectedId, `${url} should resolve to ${expectedId}`);
      assert.equal(resolved?.tier, expectedTier);
      assert.equal(resolveContextualIllustration({ stableRepresentationKey: `${url}/?utm_source=scale#gallery`, normalizedCity: city, normalizedPropertyType: propertyType })?.id, expectedId);
      reached.add(resolved!.id);
    }
    assert.equal(reached.size, 24);
  });

  it("preserves Agadir P1 and singletons outside the scale cohort", () => {
    assert.equal(CONTEXTUAL_ILLUSTRATION_CATALOG.city.Agadir?.length, 4);
    assert.equal(CONTEXTUAL_ILLUSTRATION_CATALOG.city.Rabat?.length, 1);
    assert.equal(CONTEXTUAL_ILLUSTRATION_CATALOG.city.Tanger?.length, 1);
    assert.equal(CONTEXTUAL_ILLUSTRATION_CATALOG.city["Fès"]?.length, 1);
    assert.equal(CONTEXTUAL_ILLUSTRATION_CATALOG.cityType[contextualKey("Rabat", "Appartement")], undefined);
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

  it("certifies five viewports, 24 scale assets and fallbacks", () => {
    const audit = source("scripts/audits/contextual-illustrations-scale-1-visual.mjs");
    for (const marker of ["360x800", "390x844", "768x900", "1280x900", "1440x900"]) assert.ok(audit.includes(marker));
    assert.match(audit, /EXPECTED_SCALE_IDS/);
    assert.match(audit, /uniqueScaleIds\.size !== 24/);
    assert.match(audit, /page\.reload/);
    assert.match(audit, /clippedLabels/);
    assert.match(audit, /clippedPrices/);
  });

  it("workflow replays P1/P0 and Search predecessors", () => {
    const workflow = source(".github/workflows/contextual-illustrations-scale-1.yml");
    for (const predecessor of ["contextual-illustrations-scale-1.test.ts", "contextual-illustrations-agadir-pilot-1.test.ts", "contextual-illustrations-foundation-1.test.ts", "contextual-visual-assets-1.test.ts", "unified-listing-card-1.test.ts", "search-truth-tier.test.ts"]) assert.ok(workflow.includes(predecessor));
  });
});
