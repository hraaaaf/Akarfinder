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

  it("keeps mobile free of secondary actions while desktop exposes only one primary action", () => {
    const card = source("components/search/SearchListingCardDark.tsx");

    assert.ok(card.includes("data-card-primary-action"));
    assert.ok(card.includes("sm:flex"));
    assert.doesNotMatch(card, /Repérer sur la carte|CompareToggleButton/);
    assert.ok(card.includes("data-secondary-source-link"));
  });

  it("renders gateway Option B as a compact stacked SERP instead of forcing the internal card grid", () => {
    const section = source("components/search/ExternalIndexedResultsSection.tsx");
    const card = source("components/search/ExternalIndexedResultCard.tsx");

    assert.ok(section.includes("data-search-external-serp-list"));
    assert.ok(section.includes("space-y-2.5"));
    assert.ok(card.includes("data-external-serp-group"));
    assert.ok(card.includes("rounded-2xl"));
    assert.ok(card.includes("line-clamp-2"));
    assert.doesNotMatch(section, /data-search-external-mobile-grid|grid grid-cols-2 gap-x-3 gap-y-6/);
    assert.doesNotMatch(card, /data-mobile-compact-external-card|h-\[164px\]/);
  });

  it("keeps mobile trust cues and original-source provenance visible in Option B", () => {
    const card = source("components/search/SearchListingCardDark.tsx");
    const external = source("components/search/ExternalIndexedResultCard.tsx");

    assert.ok(card.includes("publicAttribution.combinedLabel"));
    assert.doesNotMatch(card, /listing\.source_name\s*\|\|\s*truth\.informationLabel/);
    assert.ok(external.includes("getSourceDomain"));
    assert.ok(external.includes("sourcePages"));
    assert.ok(external.includes("result.original_url"));
    assert.ok(external.includes("AkarFinder indexe la page et vous renvoie vers la source originale."));
    assert.ok(external.includes("Ouvrir la source"));
    assert.doesNotMatch(external, /\{result\.source_name\}|\{result\.result_attribution_label\}/);
  });
});
