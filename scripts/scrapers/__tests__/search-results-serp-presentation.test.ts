import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const card = readFileSync(join(process.cwd(), "components/search/ExternalIndexedResultCard.tsx"), "utf8");
const section = readFileSync(join(process.cwd(), "components/search/ExternalIndexedResultsSection.tsx"), "utf8");
const shell = readFileSync(join(process.cwd(), "components/search/LightZillowSearchShell.tsx"), "utf8");

describe("Search results SERP presentation", () => {
  it("keeps the real indexed total in the search toolbar", () => {
    assert.match(shell, /indexedTotalCount/);
    assert.match(shell, /Math\.max\(indexedTotalCount, loadedResultCount\)/);
    assert.match(shell, /totalResultCount\.toLocaleString\("fr-FR"\)/);
  });

  it("renders external indexed results as a dense one-column SERP", () => {
    assert.match(section, /data-search-external-serp-list/);
    assert.match(section, /data-search-external-results-list/);
    assert.doesNotMatch(section, /grid-cols-2|lg:grid-cols-3/);
    assert.match(card, /data-external-serp-row/);
  });

  it("does not fabricate rich portal signals for the minimal lane", () => {
    assert.match(card, /external_minimal_index/);
    assert.doesNotMatch(card, /Prix non communiqué/);
    assert.doesNotMatch(card, /deriveIndicativePriceMad/);
    assert.doesNotMatch(card, /ContextualListingArtwork/);
    assert.match(card, /Lien vers la source originale/);
  });

  it("keeps source-first navigation explicit", () => {
    assert.match(card, /Voir sur \{sourceHost\}/);
    assert.match(card, /href=\{result\.original_url\}/);
  });
});
