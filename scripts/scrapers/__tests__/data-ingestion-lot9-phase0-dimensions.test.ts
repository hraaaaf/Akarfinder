import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  compareCoverageDimensions,
  extractCoverageDimensions,
  mergeCoverageDimensions,
} from "../../../data-ingestion/sources/mubawab/coverage-dimensions.js";

const html = `
<a href="/fr/t/casablanca">Casa</a>
<a href="/fr/st/tetouan/appartements-a-vendre">Tetouan apartments</a>
<a href="/fr/ct/rabat/immobilier-a-vendre">Rabat sale</a>
<a href="/fr/crp/rabat-sale-zemmour-zaer/prefecture-de-rabat/immobilier-a-vendre">Rabat hierarchy</a>
<a href="/fr/sc/locaux-a-vendre">Commercial</a>
<a href="/fr/cc/immobilier-a-louer">All rent</a>
<a href="/fr/pl/cite-ennasr/listing-promotion">Projects</a>
<a href="https://example.com/fr/t/fake">External</a>
`;

describe("Lot 9 Phase 0 dimension discovery", () => {
  it("extracts route families, flat and hierarchical geographies and category slugs", () => {
    const result = extractCoverageDimensions(html, "https://www.mubawab.ma/fr");
    assert.deepEqual(result.route_families, ["cc", "crp", "ct", "pl", "sc", "st", "t"]);
    assert.deepEqual(result.geographies, ["casablanca", "rabat", "tetouan"]);
    assert.deepEqual(result.hierarchical_geography_paths, ["rabat-sale-zemmour-zaer/prefecture-de-rabat"]);
    assert(result.category_slugs.includes("appartements-a-vendre"));
    assert(result.category_slugs.includes("immobilier-a-vendre"));
    assert(result.category_slugs.includes("locaux-a-vendre"));
    assert(result.category_slugs.includes("immobilier-a-louer"));
  });

  it("merges seeds and reports geographies/categories absent from the configured matrix", () => {
    const a = extractCoverageDimensions(html, "https://www.mubawab.ma/fr");
    const b = extractCoverageDimensions('<a href="/fr/st/essaouira/riads-a-vendre">x</a>', "https://www.mubawab.ma/fr");
    const discovered = mergeCoverageDimensions([a, b]);
    const gap = compareCoverageDimensions({
      discovered,
      configuredCitySlugs: ["casablanca", "rabat"],
      configuredCategorySlugs: ["appartements-a-vendre", "riads-a-vendre"],
    });
    assert.deepEqual(gap.missing_geographies, ["essaouira", "tetouan"]);
    assert.deepEqual(gap.hierarchical_geography_paths, ["rabat-sale-zemmour-zaer/prefecture-de-rabat"]);
    assert(gap.unconfigured_category_slugs.includes("immobilier-a-vendre"));
    assert(gap.unconfigured_category_slugs.includes("locaux-a-vendre"));
  });
});
