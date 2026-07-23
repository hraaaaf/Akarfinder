import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mockListings } from "../../../lib/listings/mock-listings.js";
import { collapseStructuredDuplicateGroups, getSearchTruthPresentation, partitionStructuredListings } from "../../../lib/search/search-truth-tier.js";

function listing(id: string, group?: string) {
  return {
    ...mockListings[0],
    id,
    source_name: "partner_csv",
    source_badge: "premium_partner",
    source_display_type: "partner_source",
    original_source_required: false,
    can_show_contact: true,
    search_result_display_mode: "full_partner_listing",
    duplicate_group_id: group,
    duplicate_score: 0.92,
  };
}

describe("AF-AUDIT-P1-020 visible dedup", () => {
  it("keeps one representative per structured duplicate group in current results", () => {
    const result = collapseStructuredDuplicateGroups([
      listing("a", "group-1"),
      listing("b", "group-1"),
      listing("c", "group-2"),
    ]);
    assert.deepEqual(result.listings.map((item) => item.id), ["a", "c"]);
    assert.equal(result.groupedRepresentations, 1);
    assert.equal(result.groupedCountsByRepresentativeId.a, 2);
  });

  it("shows the number of grouped representations with a cautious identity disclaimer", () => {
    const result = collapseStructuredDuplicateGroups([
      listing("a", "group-1"),
      listing("b", "group-1"),
      listing("c", "group-1"),
    ]);
    const presentation = getSearchTruthPresentation(result.listings[0]);
    assert.equal(presentation.informationLabel, "3 représentations regroupées");
    assert.match(presentation.explanation, /identité physique du bien/i);
    assert.equal(result.listings[0].duplicate_score, undefined);
  });

  it("partitions the collapsed loaded set, not the noisy representations", () => {
    const groups = partitionStructuredListings([
      listing("a", "group-1"),
      listing("b", "group-1"),
      listing("c", "group-2"),
    ]);
    assert.equal(groups.groupedRepresentations, 1);
    assert.deepEqual(groups.partial.map((item) => item.id), ["a", "c"]);
  });
});
