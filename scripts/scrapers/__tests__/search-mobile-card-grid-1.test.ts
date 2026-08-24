import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();
const source = (path: string) => readFileSync(resolve(ROOT, path), "utf8");

describe("SEARCH-MOBILE-CARD-GRID-1", () => {
  it("keeps Search order logic untouched and changes presentation only", () => {
    const shell = source("components/search/LightZillowSearchShell.tsx");
    const priority = source("lib/search/search-commercial-priority.ts");
    assert.ok(shell.includes("partitionCommercialSearchListings(filteredListings)"));
    assert.ok(shell.includes("data-search-continuous-flow"));
    assert.match(priority, /premium promoter inventory[\s\S]*authorized agency\/partner inventory[\s\S]*first-party user submissions[\s\S]*public indexed \/ observed inventory/i);
  });

  it("keeps internal Search cards on their existing mobile grid", () => {
    const card = source("components/search/SearchListingCardDark.tsx");
    assert.ok(card.includes("data-mobile-compact-card"));
    assert.ok(card.includes("[data-search-continuous-flow] > div.grid"));
    assert.ok(card.includes("grid-template-columns: repeat(2, minmax(0, 1fr))"));
  });

  it("renders external indexed results as a dense one-column SERP", () => {
    const section = source("components/search/ExternalIndexedResultsSection.tsx");
    const card = source("components/search/ExternalIndexedResultCard.tsx");
    assert.ok(section.includes("data-external-serp-list"));
    assert.ok(card.includes("data-external-serp-row"));
    assert.ok(card.includes("data-mobile-compact-external-card"));
    assert.doesNotMatch(section, /grid-cols-2|lg:grid-cols-3/);
    assert.doesNotMatch(card, /h-\[164px\]/);
  });

  it("keeps compact provenance visible on external rows", () => {
    const external = source("components/search/ExternalIndexedResultCard.tsx");
    assert.ok(external.includes("data-public-attribution-type"));
    assert.ok(external.includes("data-public-attribution-source"));
    assert.ok(external.includes("data-public-attribution-cta"));
    assert.doesNotMatch(external, /\{result\.source_name\}|\{result\.result_attribution_label\}/);
  });
});
