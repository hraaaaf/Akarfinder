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

  it("renders internal Search cards as a two-column mobile grid and scales to four columns wide", () => {
    const shell = source("components/search/LightZillowSearchShell.tsx");
    const card = source("components/search/SearchListingCardDark.tsx");

    assert.ok(card.includes("data-mobile-compact-card"));
    assert.ok(shell.includes("grid-cols-2"));
    assert.ok(shell.includes("lg:grid-cols-3"));
    assert.ok(shell.includes("xl:grid-cols-4"));
    assert.ok(card.includes("aspect-[4/3]"));
  });

  it("uses the whole card as the primary action without restoring oversized CTAs", () => {
    const card = source("components/search/SearchListingCardDark.tsx");

    assert.ok(card.includes("data-card-primary-link"));
    assert.doesNotMatch(card, /data-card-primary-action/);
    assert.doesNotMatch(card, /Voir le bien[\s\S]*bg-gradient-to-br|Voir l’annonce originale[\s\S]*bg-gradient-to-br/);
    assert.doesNotMatch(card, /Repérer sur la carte|CompareToggleButton/);
    assert.ok(card.includes("data-public-attribution"));
  });

  it("aligns gateway cards to the same responsive inventory rhythm", () => {
    const section = source("components/search/ExternalIndexedResultsSection.tsx");
    const card = source("components/search/ExternalIndexedResultCard.tsx");

    assert.ok(section.includes("grid grid-cols-2 gap-x-3 gap-y-5"));
    assert.ok(section.includes("lg:grid-cols-3 xl:grid-cols-4"));
    assert.ok(section.includes("data-search-external-mobile-grid"));
    assert.ok(card.includes("data-mobile-compact-external-card"));
    assert.ok(card.includes("aspect-[4/3]"));
  });

  it("keeps mobile trust cues instead of hiding provenance", () => {
    const card = source("components/search/SearchListingCardDark.tsx");
    const external = source("components/search/ExternalIndexedResultCard.tsx");

    assert.ok(card.includes("publicAttribution.combinedLabel"));
    assert.doesNotMatch(card, /listing\.source_name\s*\|\|\s*truth\.informationLabel/);
    assert.ok(external.includes("publicAttribution.typeLabel"));
    assert.ok(external.includes("publicAttribution.sourceLabel"));
    assert.ok(external.includes("Informations limitées"));
    assert.ok(external.includes("Informations à compléter"));
    assert.ok(external.includes("Résultats proches"));
    assert.doesNotMatch(external, /\{result\.source_name\}|\{result\.result_attribution_label\}/);
  });
});
