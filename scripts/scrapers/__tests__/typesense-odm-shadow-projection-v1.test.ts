import assert from "node:assert/strict";
import test from "node:test";
import {
  TYPESENSE_ODM_SHADOW_SCHEMA,
  isOdmTypesenseShadowCandidate,
  projectOdmRowToTypesense,
  type OdmSearchProjectionRow,
} from "../../../lib/typesense-shadow/odm-projection";

const base: OdmSearchProjectionRow = {
  representation_id: "11111111-1111-4111-8111-111111111111",
  canonical_url: "https://example.ma/a/1",
  canonical_property_id: "property-1",
  source_domain: "example.ma",
  title: "Appartement à Casablanca",
  snippet: "Appartement lumineux",
  normalized_city: "Casablanca",
  normalized_district: "Racine",
  normalized_property_type: "apartment",
  normalized_intent: "sale",
  normalized_price_mad: 1500000,
  normalized_surface_m2: 100,
  quality_tier: "B",
  quality_score: 80,
  reliability_score: 70,
  freshness_score: 90,
  display_eligibility: "eligible_primary",
  document_kind: "LISTING",
  production_allowed: true,
  updated_at: "2026-08-01T12:00:00Z",
};

test("only publishable ODM listings enter the shadow readmodel", () => {
  assert.equal(isOdmTypesenseShadowCandidate(base), true);
  assert.equal(isOdmTypesenseShadowCandidate({ ...base, document_kind: "CATEGORY" }), false);
  assert.equal(isOdmTypesenseShadowCandidate({ ...base, production_allowed: false }), false);
  assert.equal(isOdmTypesenseShadowCandidate({ ...base, display_eligibility: "ineligible" }), false);
});

test("projection preserves separated quality dimensions and canonical identity", () => {
  const doc = projectOdmRowToTypesense(base);
  assert.ok(doc);
  assert.equal(doc.canonical_property_id, "property-1");
  assert.equal(doc.quality_score, 80);
  assert.equal(doc.reliability_score, 70);
  assert.equal(doc.freshness_score, 90);
  assert.equal(doc.document_kind, "LISTING");
});

test("schema supports filtering and canonical grouping without commercial ranking", () => {
  const fields = new Map(TYPESENSE_ODM_SHADOW_SCHEMA.fields.map((field) => [field.name, field]));
  assert.equal(fields.get("canonical_property_id")?.facet, true);
  assert.equal(fields.get("city")?.facet, true);
  assert.equal(fields.has("premium_score"), false);
  assert.equal(fields.has("commercial_priority"), false);
});
