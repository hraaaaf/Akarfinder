import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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
  const shell = readFileSync(resolve(process.cwd(), "components/search/LightZillowSearchShell.tsx"), "utf8");
  assert.equal((shell.match(/sortListings\(clientFiltered, sortBy\)/g) ?? []).length, 1);
  assert.ok(!shell.includes("canonicalPropertyId"));
});

test("search page provides one shared selection context to cards and map", () => {
  const page = readFileSync(resolve(process.cwd(), "app/search/page.tsx"), "utf8");
  const card = readFileSync(resolve(process.cwd(), "components/search/SearchListingCardDark.tsx"), "utf8");
  const map = readFileSync(resolve(process.cwd(), "components/search/SearchMapPanel.tsx"), "utf8");

  assert.match(page, /<PropertySelectionProvider>/);
  assert.match(card, /usePropertySelection\(\)/);
  assert.match(card, /Aperçu rapide et carte|Repérer sur la carte/);
  assert.match(map, /usePropertySelection\(\)/);
  assert.match(map, /Repère au niveau de la ville uniquement/);
});

test("map bridge never claims exact coordinates without certified data", () => {
  const map = readFileSync(resolve(process.cwd(), "components/search/SearchMapPanel.tsx"), "utf8");
  assert.match(map, /n’affiche pas de position exacte sans coordonnées certifiées/);
  assert.ok(!map.includes("Math.random"));
  assert.ok(!map.includes("latitude ??"));
  assert.ok(!map.includes("longitude ??"));
});
