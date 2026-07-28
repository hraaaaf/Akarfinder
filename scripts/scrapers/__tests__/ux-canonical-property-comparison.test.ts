import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { buildCanonicalPropertyComparisonModel } from "../../../lib/ux/canonical-property-comparison";

const listing = {
  id: "listing-a",
  title: "Appartement Maarif",
  city: "Casablanca",
  neighborhood: "Maarif",
  property_type: "Appartement",
  transaction_type: "buy",
  price: 1800000,
  currency: "DH",
  surface_m2: 95,
  price_per_m2: 18947,
  bedrooms: 2,
  bathrooms: 1,
  freshness_label: "Récent",
  reliability_score: 82,
  reliability_available: true,
  duplicate_group_id: "canonical-a",
  source_name: "Source A",
} as any;

test("comparison keeps one representation per certified canonical property", () => {
  const model = buildCanonicalPropertyComparisonModel([
    listing,
    { ...listing, id: "listing-a-duplicate", source_name: "Source B" },
    { ...listing, id: "listing-b", duplicate_group_id: "canonical-b", title: "Appartement Gauthier" },
  ]);
  assert.equal(model.properties.length, 2);
  assert.deepEqual(model.properties.map((property) => property.canonicalPropertyId), [
    "property-group:canonical-a",
    "property-group:canonical-b",
  ]);
});

test("comparison omits wholly unavailable rows and marks individual gaps", () => {
  const model = buildCanonicalPropertyComparisonModel([
    { ...listing, price: null, price_per_m2: null, reliability_available: false },
    { ...listing, id: "listing-b", duplicate_group_id: "canonical-b", price: null, price_per_m2: null, reliability_available: false },
  ]);
  assert.ok(!model.rows.some((row) => row.code === "price"));
  assert.ok(!model.rows.some((row) => row.code === "price_per_m2"));
  assert.ok(!model.rows.some((row) => row.code === "reliability"));
});

test("comparison never declares a winner or fabricates market judgment", () => {
  const model = buildCanonicalPropertyComparisonModel([listing]);
  const text = JSON.stringify(model).toLowerCase();
  assert.ok(!text.includes("meilleur choix"));
  assert.ok(!text.includes("bonne affaire"));
  assert.ok(!text.includes("recommandé"));
  assert.match(model.limitation, /ne désigne pas un meilleur bien/);
});

test("search mounts the canonical comparison dock and cards pass the whole listing", () => {
  const page = readFileSync(resolve(process.cwd(), "app/search/page.tsx"), "utf8");
  const card = readFileSync(resolve(process.cwd(), "components/search/SearchListingCardDark.tsx"), "utf8");
  const dock = readFileSync(resolve(process.cwd(), "components/search/SearchCompareDock.tsx"), "utf8");
  assert.match(page, /<SearchCompareDock \/>/);
  assert.match(card, /<CompareToggleButton listing={listing}/);
  assert.match(dock, /Comparaison canonique/);
  assert.match(dock, /Non renseigné/);
});
