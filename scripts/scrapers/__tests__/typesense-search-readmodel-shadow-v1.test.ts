import assert from "node:assert/strict";
import test from "node:test";
import { isTypesensePublicCandidate, typesenseSearchCollectionSchema, type TypesenseSearchDocument } from "../../../lib/typesense/search-readmodel";

const base: TypesenseSearchDocument = {
  id: "representation-1",
  canonical_property_id: "property-1",
  title: "Appartement à vendre à Casablanca",
  searchable_text: "appartement casablanca maarif vente",
  city: "Casablanca",
  property_type: "apartment",
  transaction_type: "sale",
  quality_tier: "B",
  quality_score: 80,
  reliability_score: 70,
  freshness_score: 90,
  display_eligibility: "eligible_primary",
  document_kind: "LISTING",
  source_count: 2,
  best_source_name: "mubawab.ma",
  production_allowed: true,
  updated_at: 1_785_582_000,
};

test("collection keeps quality, reliability and commercial status separate", () => {
  const names = typesenseSearchCollectionSchema.fields.map((field) => field.name);
  assert.ok(names.includes("quality_score"));
  assert.ok(names.includes("reliability_score"));
  assert.ok(!names.includes("premium_score"));
  assert.ok(!names.includes("partner_score"));
});

test("only eligible listing documents are public candidates", () => {
  assert.equal(isTypesensePublicCandidate(base), true);
  assert.equal(isTypesensePublicCandidate({ ...base, document_kind: "CATEGORY" }), false);
  assert.equal(isTypesensePublicCandidate({ ...base, display_eligibility: "ineligible" }), false);
  assert.equal(isTypesensePublicCandidate({ ...base, production_allowed: false }), false);
});

test("canonical identity is facet-enabled for visible grouping", () => {
  const field = typesenseSearchCollectionSchema.fields.find((entry) => entry.name === "canonical_property_id");
  assert.equal(field?.facet, true);
});
