import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { buildCertifiedSimilarNeighborhoodsModel } from "../../../lib/ux/certified-similar-neighborhoods";

const heatmap = {
  status: "available",
  city: "Casablanca",
  propertyType: "appartement",
  minPricePerM2: 18000,
  maxPricePerM2: 24000,
  disclosure: "test",
  reason: null,
  zones: [
    { key: "casa:maarif:appartement", city: "Casablanca", neighborhood: "Maarif", scope: "neighborhood", pricePerM2: 19000, relativeIndex: 0.2, band: "lowest", sourceUrl: "https://example.com/maarif", observedAt: "2026-07-01" },
    { key: "casa:gauthier:appartement", city: "Casablanca", neighborhood: "Gauthier", scope: "neighborhood", pricePerM2: 20000, relativeIndex: 0.4, band: "lower", sourceUrl: "https://example.com/gauthier", observedAt: "2026-07-01" },
    { key: "casa:racine:appartement", city: "Casablanca", neighborhood: "Racine", scope: "neighborhood", pricePerM2: 24000, relativeIndex: 1, band: "highest", sourceUrl: "https://example.com/racine", observedAt: "2026-07-01" },
  ],
} as any;

const listings = [
  { id: "a", city: "Casablanca", neighborhood: "Gauthier", duplicate_group_id: "same" },
  { id: "a2", city: "Casablanca", neighborhood: "Gauthier", duplicate_group_id: "same" },
  { id: "b", city: "Casablanca", neighborhood: "Racine" },
] as any;

test("similar neighborhoods require a selected published neighborhood", () => {
  const model = buildCertifiedSimilarNeighborhoodsModel({ heatmap, selectedNeighborhood: null, visibleListings: listings });
  assert.equal(model.status, "unavailable");
});

test("similar neighborhoods are ordered by published price proximity", () => {
  const model = buildCertifiedSimilarNeighborhoodsModel({ heatmap, selectedNeighborhood: "Maarif", visibleListings: listings });
  assert.equal(model.status, "available");
  assert.equal(model.candidates[0].neighborhood, "Gauthier");
  assert.equal(model.candidates[1].neighborhood, "Racine");
});

test("visible coverage counts canonical properties once", () => {
  const model = buildCertifiedSimilarNeighborhoodsModel({ heatmap, selectedNeighborhood: "Maarif", visibleListings: listings });
  assert.equal(model.candidates[0].visibleCanonicalProperties, 1);
});

test("similarity never becomes a recommendation or attractiveness ranking", () => {
  const model = buildCertifiedSimilarNeighborhoodsModel({ heatmap, selectedNeighborhood: "Maarif", visibleListings: listings });
  const text = JSON.stringify(model).toLowerCase();
  assert.ok(!text.includes("meilleur quartier"));
  assert.ok(!text.includes("forte demande"));
  assert.ok(!text.includes("rentable"));
  assert.match(model.disclosure, /n’est ni une recommandation/);
});

test("search explorer mounts certified similar neighborhoods", () => {
  const dock = readFileSync(resolve(process.cwd(), "components/search/SearchPriceExplorerDock.tsx"), "utf8");
  const panel = readFileSync(resolve(process.cwd(), "components/search/CertifiedSimilarNeighborhoodsPanel.tsx"), "utf8");
  assert.match(dock, /<CertifiedSimilarNeighborhoodsPanel/);
  assert.match(panel, /Quartiers similaires/);
  assert.match(panel, /Des quartiers aux prix proches/);
  assert.match(panel, /Écart de prix/);
});
