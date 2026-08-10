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
    ["image", "data-card-image"],
    ["price", "data-card-price"],
    ["title", "data-card-title"],
    ["location", "data-card-location"],
    ["facts", "data-card-facts"],
    ["provenance", "data-card-provenance"],
  ]);
  assert.ok(source.indexOf("data-neighborhood-photo-credit") > source.indexOf("data-card-provenance"));
  assert.ok(source.includes("data-mobile-compact-card"));
  assert.ok(source.includes("line-clamp-2"));
});

test("UX-SEARCH-3 external card uses the same hierarchy and keeps source transparency", () => {
  const source = read("components/search/ExternalIndexedResultCard.tsx");
  assertOrdered(source, [
    ["image", "data-card-image"],
    ["price", "data-card-price"],
    ["title", "data-card-title"],
    ["location", "data-card-location"],
    ["facts", "data-card-facts"],
    ["provenance", "data-card-provenance"],
    ["action", "data-card-action"],
  ]);
  assert.ok(source.includes("data-public-attribution-source"));
  assert.ok(source.includes("data-card-provenance-detail"));
  assert.ok(source.includes('variant="serp"'));
  assert.ok(source.includes("data-mobile-compact-external-card"));
});

test("SERP AkarInfo presentation is intentionally compact without weakening full views", () => {
  const source = read("components/akarinfo/AkarInfoPassportCard.tsx");
  assert.ok(source.includes('variant?: "serp" | "compact" | "full"'));
  assert.ok(source.includes("data-akarinfo-serp"));
  assert.ok(source.includes('const compact = variant !== "full"'));
  assert.ok(source.includes("Informations AkarFinder"));
  assert.ok(source.includes("À vérifier · {points[0]}"));
});
