import assert from "node:assert/strict";
import test from "node:test";
import { mapPartnerFeedRow } from "../../partner-feeds/canonical-mapping.js";
import { decidePartnerDedup } from "../../partner-feeds/dedup-change-detection.js";

const row = (overrides: Record<string, string> = {}) => mapPartnerFeedRow({
  reference: "AG-1", transaction: "vente", type_bien: "Appartement", ville: "Rabat", quartier: "Agdal",
  surface: "110", prix: "1800000", chambres: "3", description: "Appartement lumineux avec séjour spacieux, cuisine rénovée et excellente proximité des écoles.",
  nombre_photos: "6", photos_valides: "6", telephone: "0612345678", ...overrides,
});

function candidate(overrides: Partial<{ property_id: string; offer_id: string; external_reference: string; declared_facts: Record<string, string | number | boolean> }> = {}) {
  const mapped = row();
  return {
    property_id: overrides.property_id ?? "property-1",
    offer_id: overrides.offer_id ?? "offer-1",
    source_kind: "partner_declared",
    external_reference: overrides.external_reference ?? "AG-1",
    declared_facts: overrides.declared_facts ?? mapped.canonical_payload.declared_facts,
  };
}

test("invalid canonical rows remain invalid and fail closed", () => {
  const result = decidePartnerDedup(row({ ville: "" }), []);
  assert.equal(result.decision, "invalid");
  assert.equal(result.publication_eligible, false);
});

test("same reference and same facts is a duplicate", () => {
  const result = decidePartnerDedup(row(), [candidate()]);
  assert.equal(result.decision, "duplicate");
  assert.equal(result.confidence, "high");
});

test("same reference with changed price is an offer update", () => {
  const old = candidate();
  const result = decidePartnerDedup(row({ prix: "1750000" }), [old]);
  assert.equal(result.decision, "update_offer");
});

test("same property with another reference is a new offer", () => {
  const result = decidePartnerDedup(row({ reference: "AG-2", prix: "1790000" }), [candidate()]);
  assert.equal(result.decision, "new_offer");
  assert.equal(result.matched_property_id, "property-1");
});

test("no matching property candidate is a new property", () => {
  const result = decidePartnerDedup(row({ reference: "AG-NEW", quartier: "Hay Riad", surface: "240" }), [candidate()]);
  assert.equal(result.decision, "new_property");
});

test("ambiguous candidate properties require manual review", () => {
  const c1 = candidate({ property_id: "property-1", external_reference: "OLD-1" });
  const c2 = candidate({ property_id: "property-2", offer_id: "offer-2", external_reference: "OLD-2" });
  const result = decidePartnerDedup(row({ reference: "AG-3", prix: "1820000" }), [c1, c2]);
  assert.equal(result.decision, "manual_review");
  assert.equal(result.publication_eligible, false);
});
