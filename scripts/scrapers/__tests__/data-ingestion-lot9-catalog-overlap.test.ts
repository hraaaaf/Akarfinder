import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  paginatedCatalogUrl,
  probeCatalogOverlap,
} from "../../../data-ingestion/sources/mubawab/catalog-overlap.js";

function html(ids: string[]) {
  return ids.map((id) => `<a href="/fr/a/${id}/listing-${id}">x</a>`).join("\n");
}

describe("Lot 9 catalog overlap probe", () => {
  it("compares national surface ids against known classic ids without double counting cross-surface duplicates", async () => {
    const pages = new Map<string, string>([
      ["https://example.test/sc-a", html(["1", "2", "3"])],
      ["https://example.test/sc-a:p:2", html(["3", "4"])],
      ["https://example.test/cc-b", html(["2", "4", "5"])],
    ]);

    const result = await probeCatalogOverlap({
      knownSourceIds: ["1", "2"],
      surfaces: [
        { id: "sc-a", base_url: "https://example.test/sc-a", pages: 2 },
        { id: "cc-b", base_url: "https://example.test/cc-b", pages: 1 },
      ],
      fetchPage: async (url) => pages.get(url) ?? "",
    });

    assert.equal(result.surfaces[0].unique_ids, 4);
    assert.equal(result.surfaces[0].already_known_ids, 2);
    assert.equal(result.surfaces[0].new_ids, 2);
    assert.equal(result.surfaces[1].unique_ids, 3);
    assert.equal(result.total_unique_ids, 5);
    assert.equal(result.total_already_known_ids, 2);
    assert.equal(result.total_new_ids, 3);
    assert.equal(result.cross_surface_duplicates, 2);
  });

  it("supports deterministic bounded deep page windows", async () => {
    const requested: string[] = [];
    const result = await probeCatalogOverlap({
      knownSourceIds: [],
      surfaces: [{ id: "deep", base_url: "https://example.test/x", start_page: 3, pages: 3 }],
      fetchPage: async (url) => {
        requested.push(url);
        return html([String(requested.length)]);
      },
    });

    assert.deepEqual(requested, [
      "https://example.test/x:p:3",
      "https://example.test/x:p:4",
      "https://example.test/x:p:5",
    ]);
    assert.equal(result.total_unique_ids, 3);
  });

  it("builds deterministic pagination and rejects unsafe page windows", async () => {
    assert.equal(paginatedCatalogUrl("https://example.test/x", 1), "https://example.test/x");
    assert.equal(paginatedCatalogUrl("https://example.test/x", 3), "https://example.test/x:p:3");
    assert.throws(() => paginatedCatalogUrl("https://example.test/x", 0), /invalid_page/);

    await assert.rejects(
      probeCatalogOverlap({
        knownSourceIds: [],
        surfaces: [{ id: "too-many-pages", base_url: "https://example.test/x", pages: 11 }],
        fetchPage: async () => "",
      }),
      /invalid_pages/,
    );

    await assert.rejects(
      probeCatalogOverlap({
        knownSourceIds: [],
        surfaces: [{ id: "too-deep", base_url: "https://example.test/x", start_page: 48, pages: 4 }],
        fetchPage: async () => "",
      }),
      /unsafe_page_window/,
    );
  });
});
