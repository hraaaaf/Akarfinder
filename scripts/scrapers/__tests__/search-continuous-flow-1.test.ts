import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();
const source = (path: string) => readFileSync(resolve(ROOT, path), "utf8");

describe("SEARCH-CONTINUOUS-FLOW-1", () => {
  it("renders one continuous internal listing grid instead of visible commercial sections", () => {
    const shell = source("components/search/LightZillowSearchShell.tsx");

    assert.ok(shell.includes("data-search-continuous-flow"));
    assert.ok(shell.includes("continuousListings.map"));
    assert.ok(!shell.includes("function CommercialListingSection"));
    assert.ok(!shell.includes("function IndexedTruthGroup"));
    assert.ok(!shell.includes("function PublicIndexedResultsSection"));

    for (const heading of [
      "Promoteurs premium",
      "Agences partenaires",
      "Annonces sur AkarFinder",
      "Autres résultats",
      "Informations détaillées",
      "Informations à compléter",
      "Autres annonces",
    ]) {
      assert.ok(!shell.includes(heading), `visible category break still present: ${heading}`);
    }
  });

  it("preserves the exact commercial/truth sequence inside the continuous array", () => {
    const shell = source("components/search/LightZillowSearchShell.tsx");
    const markers = [
      "...commercialGroups.promoterPremium",
      "...commercialGroups.agencyPartner",
      "...commercialGroups.directUser",
      "...commercialGroups.publicIndexed.analyzed",
      "...commercialGroups.publicIndexed.partial",
      "...commercialGroups.publicIndexed.observed",
    ];

    let previous = -1;
    for (const marker of markers) {
      const current = shell.indexOf(marker);
      assert.ok(current > previous, `continuous order changed around ${marker}`);
      previous = current;
    }
  });

  it("does not change the commercial priority contract", () => {
    const priority = source("lib/search/search-commercial-priority.ts");

    assert.match(priority, /1\. premium promoter inventory/);
    assert.match(priority, /2\. authorized agency\/partner inventory/);
    assert.match(priority, /3\. first-party user submissions/);
    assert.match(priority, /4\. public indexed \/ observed inventory/);
    assert.ok(priority.includes("Within each category, the incoming relevance/price/quality order is preserved."));
    assert.ok(priority.includes("const prioritized = prioritizeCommercialSearchListings(listings);"));
  });

  it("keeps gateway results in the same primary list lane without a section header", () => {
    const shell = source("components/search/LightZillowSearchShell.tsx");
    const internalFlow = shell.indexOf("continuousListings.map");
    const gateway = shell.indexOf("<ExternalIndexedResultsSection");

    assert.ok(internalFlow >= 0 && gateway > internalFlow);
    assert.match(shell.slice(gateway, gateway + 220), /showHeader=\{false\}/);
  });

  it("keeps continuous-flow scope presentation-only", () => {
    const shell = source("components/search/LightZillowSearchShell.tsx");

    assert.ok(shell.includes("partitionCommercialSearchListings(filteredListings)"));
    assert.ok(shell.includes("return sortListings(clientFiltered, sortBy);"));
    assert.ok(shell.includes("buildSearchUrl(filters, sortBy)"));
    assert.ok(shell.includes("buildGatewayUrl(filters)"));
  });
});
