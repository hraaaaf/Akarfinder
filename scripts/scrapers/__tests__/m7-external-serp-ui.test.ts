import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const card = readFileSync(
  join(process.cwd(), "components", "search", "ExternalIndexedResultCard.tsx"),
  "utf8",
);
const section = readFileSync(
  join(process.cwd(), "components", "search", "ExternalIndexedResultsSection.tsx"),
  "utf8",
);
const shell = readFileSync(
  join(process.cwd(), "components", "search", "LightZillowSearchShell.tsx"),
  "utf8",
);

describe("M7-F external SERP UI", () => {
  it("renders link-only external results from index-safe fields", () => {
    assert.match(card, /result\.original_url/);
    assert.match(card, /result\.domain/);
    assert.match(card, /result\.normalized_city/);
    assert.match(card, /result\.normalized_property_type/);
    assert.match(card, /result\.normalized_intent/);
    assert.match(card, /Index externe/);
    assert.match(card, /Résultat indexé/);
  });

  it("does not surface copied content, fake media, inferred price or hidden measurements", () => {
    assert.doesNotMatch(card, /result\.title/);
    assert.doesNotMatch(card, /result\.snippet/);
    assert.doesNotMatch(card, /thumbnail_url/);
    assert.doesNotMatch(card, /ContextualListingArtwork/);
    assert.doesNotMatch(card, /deriveIndicativePriceMad/);
    assert.doesNotMatch(card, /normalized_price_mad/);
    assert.doesNotMatch(card, /normalized_surface_m2/);
    assert.doesNotMatch(card, /price_per_m2_mad/);
    assert.doesNotMatch(card, /AkarInfoPassportCard/);
  });

  it("uses a dense one-column SERP instead of portal-style image grids", () => {
    assert.match(section, /data-search-external-serp-list/);
    assert.match(section, /divide-y/);
    assert.doesNotMatch(section, /grid-cols-2/);
    assert.doesNotMatch(section, /grid-cols-3/);
    assert.doesNotMatch(section, /buildPublicResultSimilaritySummaries/);
  });

  it("keeps the real indexed total and cursor pagination contract in the search shell", () => {
    assert.match(shell, /indexedTotalCount/);
    assert.match(shell, /totalResultCount/);
    assert.match(shell, /nextCursor/);
    assert.match(shell, /hasMoreIndexed/);
    assert.match(shell, /Afficher plus de résultats/);
  });
});
