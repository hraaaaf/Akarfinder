import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { buildCertifiedNeighborhoodComparisonModel } from "../../../lib/ux/certified-neighborhood-comparison";

const zones = [
  { key: "casa:maarif:appartement", city: "Casablanca", neighborhood: "Maarif", scope: "neighborhood", pricePerM2: 19000, relativeIndex: 0.5, band: "middle", sourceUrl: "https://example.com/maarif", observedAt: "2026-07-01" },
  { key: "casa:gauthier:appartement", city: "Casablanca", neighborhood: "Gauthier", scope: "neighborhood", pricePerM2: 23000, relativeIndex: 1, band: "highest", sourceUrl: "https://example.com/gauthier", observedAt: "2026-07-01" },
] as any;

const listings = [
  { id: "a", city: "Casablanca", neighborhood: "Maarif", price_per_m2: 18000, duplicate_group_id: "same" },
  { id: "a2", city: "Casablanca", neighborhood: "Maarif", price_per_m2: 20000, duplicate_group_id: "same" },
  { id: "b", city: "Casablanca", neighborhood: "Gauthier", price_per_m2: 24000 },
] as any;

test("comparison requires two published neighborhoods", () => {
  const model = buildCertifiedNeighborhoodComparisonModel({ city: "Casablanca", zones, selectedKeys: [zones[0].key], visibleListings: listings });
  assert.equal(model.status, "unavailable");
});

test("comparison counts one visible property per canonical identity", () => {
  const model = buildCertifiedNeighborhoodComparisonModel({ city: "Casablanca", zones, selectedKeys: zones.map((zone: any) => zone.key), visibleListings: listings });
  assert.equal(model.status, "available");
  assert.equal(model.columns[0].visibleCanonicalProperties, 1);
  assert.equal(model.columns[1].visibleCanonicalProperties, 1);
});

test("comparison keeps published reference separate from visible median", () => {
  const model = buildCertifiedNeighborhoodComparisonModel({ city: "Casablanca", zones, selectedKeys: zones.map((zone: any) => zone.key), visibleListings: listings });
  assert.equal(model.columns[0].publishedPricePerM2, 19000);
  assert.equal(model.columns[0].visibleMedianPricePerM2, 20000);
});

test("comparison never declares a best neighborhood or market performance", () => {
  const model = buildCertifiedNeighborhoodComparisonModel({ city: "Casablanca", zones, selectedKeys: zones.map((zone: any) => zone.key), visibleListings: listings });
  const text = JSON.stringify(model).toLowerCase();
  assert.ok(!text.includes("meilleur quartier"));
  assert.ok(!text.includes("rentable"));
  assert.ok(!text.includes("forte demande"));
  assert.match(model.disclosure, /ne désigne pas un meilleur quartier/);
});

test("search explorer mounts the certified neighborhood comparator", () => {
  const dock = readFileSync(resolve(process.cwd(), "components/search/SearchPriceExplorerDock.tsx"), "utf8");
  const panel = readFileSync(resolve(process.cwd(), "components/search/CertifiedNeighborhoodComparisonPanel.tsx"), "utf8");
  assert.match(dock, /<CertifiedNeighborhoodComparisonPanel/);
  assert.match(panel, /Comparateur de quartiers/);
  assert.match(panel, /Non renseigné/);
});
