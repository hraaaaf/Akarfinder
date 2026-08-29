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

test("UX-SEARCH-3 external indexed card follows the canonical multi-source hierarchy without third-party media", () => {
  const source = read("components/search/ExternalIndexedResultCard.tsx");
  assert.ok(source.includes("data-external-serp-group"));
  assert.ok(source.includes("getSourceDomain"));
  assert.ok(source.includes("sourcePages"));
  assert.ok(source.includes("result.original_url"));
  assert.ok(source.includes("result.normalized_city"));
  assert.ok(source.includes("result.normalized_property_type"));
  assert.ok(source.includes("result.normalized_intent"));
  assert.ok(source.includes("pages semblent concerner le même bien"));
  assert.ok(source.includes("Voir les {sourcePages.length} pages"));
  assert.ok(source.includes("Ouvrir la source"));

  // Indexed external results may use AkarFinder-owned deterministic artwork,
  // but must never render third-party listing photos or untrusted source copy.
  assert.ok(source.includes("IndexedTransactionArtwork"));
  assert.ok(source.includes("data-indexed-artwork-card"));
  assert.ok(!source.includes("data-card-image"));
  assert.ok(!source.includes("<img"));
  assert.ok(!source.includes("<Image"));
  assert.ok(!source.includes("ContextualListingArtwork"));
  assert.ok(!source.includes("result.title"));
  assert.ok(!source.includes("result.snippet"));

  // Normalized price is allowed only through the explicit verification layer.
  assert.ok(source.includes("formatPriceMad(representative.normalized_price_mad)"));
  assert.ok(source.includes("isPriceToVerify(representative)"));
  assert.ok(source.includes("Prix à vérifier"));
  assert.ok(source.includes("data-price-verification"));
  assert.ok(!source.includes("normalized_surface_m2"));
});

test("SERP AkarInfo presentation is intentionally compact without weakening full views", () => {
  const source = read("components/akarinfo/AkarInfoPassportCard.tsx");
  assert.ok(source.includes('variant?: "serp" | "compact" | "full"'));
  assert.ok(source.includes("data-akarinfo-serp"));
  assert.ok(source.includes('const compact = variant !== "full"'));
  assert.ok(source.includes("Informations AkarFinder"));
  assert.ok(source.includes("À vérifier · {points[0]}"));
});
