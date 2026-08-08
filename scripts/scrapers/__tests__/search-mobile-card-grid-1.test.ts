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

  it("renders internal Search cards as a two-column mobile grid", () => {
    const card = source("components/search/SearchListingCardDark.tsx");

    assert.ok(card.includes("data-mobile-compact-card"));
    assert.ok(card.includes("[data-search-continuous-flow] > div.grid"));
    assert.ok(card.includes("grid-template-columns: repeat(2, minmax(0, 1fr))"));
    assert.ok(card.includes("h-[164px]"));
  });

  it("removes secondary mobile actions while preserving them from sm upward", () => {
    const card = source("components/search/SearchListingCardDark.tsx");

    assert.match(card, /Repérer sur la carte[\s\S]*hidden[\s\S]*sm:flex|hidden[\s\S]*sm:flex[\s\S]*Repérer sur la carte/);
    assert.ok(card.includes('className="mt-4 hidden flex-col gap-2 sm:flex sm:flex-row"'));
    assert.ok(card.includes('className="mt-2 hidden sm:block"'));
  });

  it("aligns gateway cards to the same two-column mobile rhythm", () => {
    const section = source("components/search/ExternalIndexedResultsSection.tsx");
    const card = source("components/search/ExternalIndexedResultCard.tsx");

    assert.ok(section.includes("grid grid-cols-2 gap-x-3 gap-y-6"));
    assert.ok(section.includes("data-search-external-mobile-grid"));
    assert.ok(card.includes("data-mobile-compact-external-card"));
    assert.ok(card.includes("h-[164px]"));
    assert.ok(card.includes('className="hidden sm:block"'));
  });

  it("keeps mobile trust cues instead of hiding provenance", () => {
    const card = source("components/search/SearchListingCardDark.tsx");
    const external = source("components/search/ExternalIndexedResultCard.tsx");

    assert.ok(card.includes("listing.source_name || truth.informationLabel"));
    assert.ok(external.includes("result.source_name"));
    assert.ok(external.includes("Résultats proches"));
  });
});
