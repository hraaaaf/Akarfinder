import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path: string) => fs.readFileSync(path, "utf8");

function assertOrdered(source: string, labels: Array<[string, string]>) {
  let previous = -1;
  for (const [label, marker] of labels) {
    const position = source.indexOf(marker);
    assert.ok(position >= 0, `${label} marker missing`);
    assert.ok(position > previous, `${label} must follow the previous card layer`);
    previous = position;
  }
}

test("UX-SEARCH-3 internal Search card follows the canonical scan hierarchy", () => {
  const source = read("components/search/SearchListingCardDark.tsx");
  assertOrdered(source, [
    ["image", "data-card-image"], ["price", "data-card-price"], ["title", "data-card-title"],
    ["location", "data-card-location"], ["facts", "data-card-facts"], ["provenance", "data-card-provenance"],
  ]);
  assert.ok(source.includes("data-mobile-compact-card"));
});

test("UX-SEARCH-3 external indexed results use a distinct search-engine hierarchy", () => {
  const source = read("components/search/ExternalIndexedResultCard.tsx");
  assert.ok(source.includes("data-external-serp-row"));
  assert.ok(source.includes("data-card-provenance"));
  assert.ok(source.includes("data-card-title"));
  assert.ok(source.includes("data-card-facts"));
  assert.ok(source.includes("data-card-action"));
  assert.ok(source.includes("data-public-attribution-source"));
  assert.ok(source.includes("data-public-attribution-type"));
  assert.ok(source.includes("data-card-provenance-detail"));
  assert.ok(source.includes("data-mobile-compact-external-card"));
  assert.doesNotMatch(source, /AkarInfoPassportCard|ContextualListingArtwork|data-card-price/);
});

test("full AkarInfo views remain available outside the external SERP row", () => {
  const source = read("components/akarinfo/AkarInfoPassportCard.tsx");
  assert.ok(source.includes('variant?: "serp" | "compact" | "full"'));
  assert.ok(source.includes("data-akarinfo-serp"));
  assert.ok(source.includes('const compact = variant !== "full"'));
});
