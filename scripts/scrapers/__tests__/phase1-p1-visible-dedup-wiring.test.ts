import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { mockListings } from "../../../lib/listings/mock-listings.js";
import { collapseStructuredDuplicateGroups } from "../../../lib/search/search-truth-tier.js";

describe("AF-AUDIT-P1-020 boundaries", () => {
  it("does not group external observed offers silently", () => {
    const base = {
      ...mockListings[0],
      duplicate_group_id: "group-x",
      source_badge: "external_web_result",
      source_display_type: "external_web_result",
      original_source_required: true,
      can_show_contact: false,
      search_result_display_mode: "thin_indexed_result",
    };
    const result = collapseStructuredDuplicateGroups([
      { ...base, id: "x1" },
      { ...base, id: "x2" },
    ]);
    assert.deepEqual(result.listings.map((item) => item.id), ["x1", "x2"]);
    assert.equal(result.groupedRepresentations, 0);
  });

  it("applies visible dedup to both database and Typesense Search projections", () => {
    const source = readFileSync(join(process.cwd(), "lib/search/index.ts"), "utf8");
    assert.ok(source.includes("collapseStructuredDuplicateGroups"));
    assert.ok(source.includes("projectVisibleDedup"));
    assert.ok(source.includes("searchTypesense"));
    assert.ok(source.includes("searchDatabase"));
  });
});
