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
<a href="/fr/mpr/casablanca-settat/listing-promotion">Region map</a>
<a href="/fr/mprp/casablanca-settat/prefecture-de-casablanca/listing-promotion">Prefecture map</a>
<a href="/fr/mprpt/casablanca-settat/prefecture-de-casablanca/casablanca/listing-promotion">City map</a>
<a href="/fr/mprptd/casablanca-settat/prefecture-de-casablanca/casablanca/maarif/listing-promotion">District map</a>
<a href="/fr/tw/casablanca/oasis">Oasis all</a>
<a href="/fr/cd/casablanca/oasis/immobilier-a-vendre">Oasis sale</a>
<a href="/fr/sd/casablanca/oasis/villas-et-maisons-de-luxe-a-vendre">Oasis villas</a>
<a href="/fr/sc/locaux-a-vendre">Commercial</a>
<a href="/fr/cc/immobilier-a-louer">All rent</a>
<a href="/fr/pl/cite-ennasr/listing-promotion">Projects</a>
<a href="https://example.com/fr/t/fake">External</a>
`;

describe("Lot 9 Phase 0 dimension discovery", () => {
  it("extracts verified route families, flat geographies and hierarchy paths", () => {
    const result = extractCoverageDimensions(html, "https://www.mubawab.ma/fr");
    assert.deepEqual(result.route_families, ["cc", "cd", "ct", "mpr", "mprp", "mprpt", "mprptd", "pl", "sc", "sd", "st", "t", "tw"]);
    assert.deepEqual(result.geographies, ["casablanca", "rabat", "tetouan"]);
    assert(result.hierarchical_geography_paths.includes("casablanca-settat"));
    assert(result.hierarchical_geography_paths.includes("casablanca-settat/prefecture-de-casablanca"));
    assert(result.hierarchical_geography_paths.includes("casablanca-settat/prefecture-de-casablanca/casablanca"));
    assert(result.hierarchical_geography_paths.includes("casablanca-settat/prefecture-de-casablanca/casablanca/maarif"));
    assert(result.hierarchical_geography_paths.includes("casablanca/oasis"));
    assert(result.category_slugs.includes("appartements-a-vendre"));
    assert(result.category_slugs.includes("immobilier-a-vendre"));
    assert(result.category_slugs.includes("locaux-a-vendre"));
    assert(result.category_slugs.includes("immobilier-a-louer"));
    assert(result.category_slugs.includes("villas-et-maisons-de-luxe-a-vendre"));
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
    assert(gap.hierarchical_geography_paths.includes("casablanca-settat/prefecture-de-casablanca/casablanca/maarif"));
    assert(gap.unconfigured_category_slugs.includes("immobilier-a-vendre"));
    assert(gap.unconfigured_category_slugs.includes("locaux-a-vendre"));
  });
});
