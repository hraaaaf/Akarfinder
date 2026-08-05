import assert from "node:assert/strict";
import test from "node:test";
import { mapPartnerFeedRow } from "../../partner-feeds/canonical-mapping.js";
import { decidePartnerDedup } from "../../partner-feeds/dedup-change-detection.js";
import { buildQuarantineSnapshot, planReviewQueue } from "../../partner-feeds/quarantine-review-queue.js";

const validRow = (overrides: Record<string, string> = {}) => mapPartnerFeedRow({
  reference: "AG-100",
  transaction: "vente",
  type_bien: "Appartement",
  ville: "Rabat",
  quartier: "Agdal",
  surface: "110",
  prix: "1800000",
  chambres: "3",
  etat: "bon_etat",
  description: "Appartement lumineux avec séjour spacieux, cuisine rénovée et excellente proximité des écoles et commerces.",
  nombre_photos: "6",
  photos_valides: "6",
  telephone: "0612345678",
  ...overrides,
});

test("snapshot remains immutable by construction and fail closed", () => {
  const mapped = validRow();
  const dedup = decidePartnerDedup(mapped, []);
  const snapshot = buildQuarantineSnapshot(mapped, dedup);
  assert.equal(snapshot.snapshot_version, "b3.4.5-v1");
  assert.equal(snapshot.dedup_decision.decision, "new_property");
  assert.equal(snapshot.publication_eligible, false);
});

test("invalid rows enter critical review", () => {
  const mapped = validRow({ ville: "" });
  const plan = planReviewQueue(mapped, decidePartnerDedup(mapped, []));
  assert.deepEqual(plan, {
    required: true,
    status: "pending",
    priority: "critical",
    reason_code: "invalid_partner_row",
    publication_eligible: false,
  });
});

test("ambiguous matches enter high priority manual review", () => {
  const mapped = validRow({ reference: "AG-200" });
  const candidate = {
    property_id: "property-1",
    offer_id: "offer-1",
    source_kind: "partner_declared",
    external_reference: "OLD-1",
    declared_facts: mapped.canonical_payload.declared_facts,
  };
  const second = { ...candidate, property_id: "property-2", offer_id: "offer-2", external_reference: "OLD-2" };
  const plan = planReviewQueue(mapped, decidePartnerDedup(mapped, [candidate, second]));
  assert.equal(plan.required, true);
  assert.equal(plan.priority, "high");
  assert.equal(plan.reason_code, "ambiguous_property_match");
  assert.equal(plan.publication_eligible, false);
});

test("exact duplicates do not create actionable review work", () => {
  const mapped = validRow();
  const candidate = {
    property_id: "property-1",
    offer_id: "offer-1",
    source_kind: "partner_declared",
    external_reference: "AG-100",
    declared_facts: mapped.canonical_payload.declared_facts,
  };
  const plan = planReviewQueue(mapped, decidePartnerDedup(mapped, [candidate]));
  assert.equal(plan.required, false);
  assert.equal(plan.status, "merged");
  assert.equal(plan.reason_code, "exact_duplicate_no_action");
  assert.equal(plan.publication_eligible, false);
});

test("material offer updates require high priority review", () => {
  const old = validRow();
  const candidate = {
    property_id: "property-1",
    offer_id: "offer-1",
    source_kind: "partner_declared",
    external_reference: "AG-100",
    declared_facts: old.canonical_payload.declared_facts,
  };
  const changed = validRow({ prix: "1750000" });
  const plan = planReviewQueue(changed, decidePartnerDedup(changed, [candidate]));
  assert.equal(plan.required, true);
  assert.equal(plan.priority, "high");
  assert.equal(plan.reason_code, "material_offer_change");
});
