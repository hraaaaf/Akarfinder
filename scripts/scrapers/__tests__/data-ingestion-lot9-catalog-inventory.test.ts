import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  extractCatalogTitle,
  extractVisibleCatalogCount,
  inventoryMubawabCatalog,
  naiveCountMustNotBeUsed,
  type MubawabCatalogSurface,
} from "../../../data-ingestion/sources/mubawab/catalog-inventory.js";

describe("Lot 9 Mubawab catalog inventory", () => {
  it("parses visible result counts with Moroccan/French separators", () => {
    assert.equal(extractVisibleCatalogCount("<h1>Appartement à vendre</h1><div>(14 761 résultats)</div>"), 14761);
    assert.equal(extractVisibleCatalogCount("<div>1-21 de 225 résultats | 1-11 pages</div>"), 225);
    assert.equal(extractVisibleCatalogCount("<div>aucun compteur</div>"), null);
  });

  it("extracts the first h1 as the semantic title", () => {
    assert.equal(extractCatalogTitle("<h1>Location Bureaux au Maroc</h1>"), "Location Bureaux au Maroc");
    assert.equal(extractCatalogTitle("<div>no h1</div>"), null);
  });

  it("keeps route-family observations independent and does not pretend overlapping counters are additive", async () => {
    const surfaces: MubawabCatalogSurface[] = [
      {
        id: "office-rent",
        kind: "national_category",
        url: "https://example.test/sc/offices",
        semantic_family: "offices",
        transaction: "rent",
        property_type: "office",
        overlap_group: "commercial-office",
      },
      {
        id: "all-rent",
        kind: "national_aggregate",
        url: "https://example.test/cc/rent",
        semantic_family: "all-rent",
        transaction: "rent",
        overlap_group: "all-rent",
      },
      {
        id: "commercial-aggregate",
        kind: "national_aggregate",
        url: "https://example.test/cc/commercial",
        semantic_family: "commercial-office-aggregate",
        transaction: "sale",
        overlap_group: "commercial-office",
      },
    ];

    const htmlByUrl = new Map([
      ["https://example.test/sc/offices", "<h1>Bureaux</h1><p>(2 914 résultats)</p>"],
      ["https://example.test/cc/rent", "<h1>Immobilier à louer</h1><p>(22 717 résultats)</p>"],
      ["https://example.test/cc/commercial", "<h1>Commerce</h1><p>(34 586 résultats)</p>"],
    ]);

    const observations = await inventoryMubawabCatalog(
      async (url) => htmlByUrl.get(url) ?? "",
      { surfaces, now: () => "2026-09-04T16:00:00.000Z" },
    );

    assert.deepEqual(observations.map((item) => item.visible_count), [2914, 22717, 34586]);
    const warning = naiveCountMustNotBeUsed(observations);
    assert.equal(warning.visible_count_sum, 60217);
    assert.deepEqual(warning.overlap_groups["commercial-office"], ["office-rent", "commercial-aggregate"]);
  });
});
