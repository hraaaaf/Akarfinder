import assert from "node:assert/strict";
import test from "node:test";

import {
  EMPTY_PROPERTY_SELECTION,
  clearPropertyHover,
  getCanonicalPropertyId,
  hoverProperty,
  isListingInSelectedProperty,
  propertySelectionChangesRanking,
  selectProperty,
} from "../../../lib/ux/property-selection";

const listingA = { id: "listing-a", duplicate_group_id: "cluster-42" };
const listingB = { id: "listing-b", duplicate_group_id: "cluster-42" };
const listingC = { id: "listing-c", duplicate_group_id: undefined };

test("representations from one certified duplicate group share one property identity", () => {
  assert.equal(getCanonicalPropertyId(listingA), "property-group:cluster-42");
  assert.equal(getCanonicalPropertyId(listingA), getCanonicalPropertyId(listingB));
});

test("an unclustered listing remains its own presentation identity", () => {
  assert.equal(getCanonicalPropertyId(listingC), "listing:listing-c");
});

test("selecting a representation selects the canonical property while preserving the representative listing", () => {
  const selection = selectProperty(listingA, "list");

  assert.equal(selection.canonicalPropertyId, "property-group:cluster-42");
  assert.equal(selection.representativeListingId, "listing-a");
  assert.equal(selection.interaction, "selected");
  assert.equal(selection.origin, "list");
  assert.equal(isListingInSelectedProperty(listingB, selection), true);
  assert.equal(isListingInSelectedProperty(listingC, selection), false);
});

test("clearing hover never clears an explicit selection", () => {
  const hovered = hoverProperty(listingA, "map");
  assert.deepEqual(clearPropertyHover(hovered), EMPTY_PROPERTY_SELECTION);

  const selected = selectProperty(listingA, "map");
  assert.deepEqual(clearPropertyHover(selected), selected);
});

test("property selection is presentation-only and cannot alter ranking", () => {
  assert.equal(propertySelectionChangesRanking(), false);
});
