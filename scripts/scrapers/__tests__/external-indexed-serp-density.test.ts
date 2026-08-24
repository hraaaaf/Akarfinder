import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const card = readFileSync("components/search/ExternalIndexedResultCard.tsx", "utf8");
const section = readFileSync("components/search/ExternalIndexedResultsSection.tsx", "utf8");
const shell = readFileSync("components/search/LightZillowSearchShell.tsx", "utf8");

test("external indexed results use a dense SERP row instead of portal-style cards", () => {
  assert.match(card, /data-external-serp-row/);
  assert.match(section, /data-external-serp-list/);
  assert.doesNotMatch(section, /grid-cols-2|lg:grid-cols-3/);
  assert.doesNotMatch(card, /ContextualListingArtwork/);
  assert.doesNotMatch(card, /AkarInfoPassportCard/);
});

test("minimal external results never invent price or artwork", () => {
  assert.doesNotMatch(card, /deriveIndicativePriceMad|Prix indicatif/);
  assert.match(card, /THUMBNAILS_ENABLED && result\.can_show_thumbnail/);
  assert.doesNotMatch(card, /Illustration/);
});

test("the global count remains distinct from the loaded external slice", () => {
  assert.match(shell, /indexedTotalCount/);
  assert.match(shell, /totalResultCount/);
  assert.match(shell, /hasMoreIndexed/);
  assert.match(shell, /Afficher plus de résultats/);
  assert.match(section, /results\.length\.toLocaleString\("fr-FR"\)/);
});
