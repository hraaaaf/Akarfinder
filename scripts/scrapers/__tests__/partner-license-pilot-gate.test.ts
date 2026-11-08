import test from "node:test";
import assert from "node:assert/strict";
import { assessPartnerPilot, type ReviewedPartnerLicense, type IndependentOfferCheck } from "../../../lib/feeds/pilot-license-gate.js";
import type { RawFeedRow } from "../../../lib/feeds/schema.js";

const NOW = new Date("2026-11-08T20:00:00.000Z");
const license: ReviewedPartnerLicense = {
  sourceName: "partner_exampleagency",
  agreementSha256: "a".repeat(64),
  reviewerId: "reviewer-example",
  reviewedAt: "2026-11-07T00:00:00Z",
  validFrom: "2026-11-01T00:00:00Z",
  validUntil: "2027-11-01T00:00:00Z",
  allowedOriginalDomains: ["example.invalid"],
  rights: {
    storeMetadata: true,
    showCommercialMetadata: true,
    redirectOriginal: true,
    upstreamRightsVerified: true,
    photographs: false,
  },
};
const row: RawFeedRow = {
  source_name: "partner_exampleagency",
  external_id: "DEMO-1",
  source_domain: "example.invalid",
  source_url: "https://example.invalid/offer/1",
  title: "Appartement fictif à Rabat",
  city: "Rabat",
  district: "Agdal",
  transaction_type: "sale",
  property_type: "apartment",
  price_mad: 950000,
  surface_m2: 72,
  bedrooms_count: 2,
  description: "Jeu de données entièrement fictif",
  image_urls: ["https://images.example.invalid/demo.jpg"],
  images_rights_confirmed: true,
  coordinates: null,
  updated_at_source: "2026-11-07T10:00:00Z",
  update_signal: null,
};
const check: IndependentOfferCheck = {
  sourceId: "DEMO-1",
  sourceUrl: "https://example.invalid/offer/1",
  checkedAt: "2026-11-08T10:00:00Z",
  live: true,
  evidenceRef: "fixture-review-not-real",
};
const assess = (l: ReviewedPartnerLicense | null = license, r: RawFeedRow[] = [row], c: IndependentOfferCheck[] = [check]) =>
  assessPartnerPilot(r, l, c, NOW);

test("private positive fixture: staging only, image URLs withheld without licensed rights", () => {
  const result = assess();
  assert.equal(result.status, "ready_private_staging");
  assert.equal(result.staged?.action_counts.create, 1);
  assert.equal(result.picturesRetained, 0);
  assert.deepEqual(result.staged?.staged[0].row.image_urls, []);
});
test("no license means no staging", () => {
  assert.deepEqual(assess(null).reasons, ["license_missing"]);
});
test("invalid digest or reviewer identity rejects a claimed agreement", () => {
  assert.equal(assess({ ...license, agreementSha256: "x" }).status, "blocked");
  assert.equal(assess({ ...license, reviewerId: "" }).status, "blocked");
});
test("invalid or expired license rejects", () => {
  assert.equal(assess({ ...license, validUntil: "2026-11-07T00:00:00Z" }).status, "blocked");
  assert.equal(assess({ ...license, reviewedAt: "2026-11-09T00:00:00Z" }).status, "blocked");
});
test("upstream rights and required scopes fail closed", () => {
  for (const k of ["storeMetadata", "showCommercialMetadata", "redirectOriginal", "upstreamRightsVerified"] as const) {
    assert.equal(assess({ ...license, rights: { ...license.rights, [k]: false } }).status, "blocked", k);
  }
});
test("source must be partner-specific, not the shared publication alias", () => {
  assert.deepEqual(assess({ ...license, sourceName: "partner_csv" }).reasons, ["partner_specific_source_required"]);
});
test("deny cross-provider spoofing of a source name", () => {
  assert.deepEqual(assess(license, [{ ...row, source_name: "mubawab" }]).reasons, ["source_identity_invalid_or_duplicate"]);
});
test("only allowed original HTTPS domains; reject spoofing and external host", () => {
  for (const url of [
    "https://example.invalid.evil.test/offer/1",
    "http://example.invalid/offer/1",
    "https://user:pass@example.invalid/offer/1",
    "https://notlicensed.invalid/offer/1",
  ]) {
    assert.deepEqual(assess(license, [{ ...row, source_url: url }]).reasons, ["original_source_domain_not_authorized"]);
  }
});
test("missing, stale, future, false or mismatched offer evidence rejected", () => {
  assert.deepEqual(assess(license, [row], []).reasons, ["independent_recent_offer_check_missing"]);
  for (const item of [
    { ...check, checkedAt: "2026-09-07T00:00:00Z" },
    { ...check, checkedAt: "2026-11-09T00:00:00Z" },
    { ...check, live: false },
    { ...check, sourceUrl: "https://example.invalid/offer/other" },
  ]) {
    assert.equal(assess(license, [row], [item]).status, "blocked");
  }
});
test("duplicate identity or batch above quota rejected", () => {
  assert.equal(assess(license, [row, row], [check]).status, "blocked");
  assert.deepEqual(assessPartnerPilot([row, { ...row, external_id: "DEMO-2" }], license, [check], NOW, 1).reasons, ["pilot_batch_out_of_bounds"]);
});
test("invalid title/PII is rejected by shared canonical feed validation", () => {
  assert.deepEqual(assess(license, [{ ...row, title: "Contactez 0612345678" }]).reasons, ["feed_schema_or_identity_validation_failed"]);
});
test("image rights require license scope AND per-offer confirmation", () => {
  assert.equal(assess({ ...license, rights: { ...license.rights, photographs: true } }).picturesRetained, 1);
  assert.equal(assess({ ...license, rights: { ...license.rights, photographs: true } }, [{ ...row, images_rights_confirmed: false }]).picturesRetained, 0);
});
test("delete and unpublish do not silently become new listings", () => {
  assert.deepEqual(assess(license, [{ ...row, update_signal: "unpublish" }]).reasons, ["removal_signals_require_separate_pipeline"]);
});
test("unreliable clock never admits a batch", () => {
  assert.deepEqual(assessPartnerPilot([row], license, [check], new Date("invalid")).reasons, ["clock_invalid"]);
});
test("malformed review objects and evidence fail closed instead of throwing", () => {
  assert.deepEqual(
    assess({ ...license, rights: null } as unknown as ReviewedPartnerLicense).reasons,
    ["commercial_and_upstream_rights_not_verified"],
  );
  assert.deepEqual(
    assess({ ...license, allowedOriginalDomains: null } as unknown as ReviewedPartnerLicense).reasons,
    ["origin_domains_not_licensed"],
  );
  assert.deepEqual(
    assess({ ...license, reviewerId: null } as unknown as ReviewedPartnerLicense).reasons,
    ["reviewed_signed_document_required"],
  );
  assert.deepEqual(
    assess(license, [row], [null as unknown as IndependentOfferCheck]).reasons,
    ["offer_evidence_missing_or_ambiguous"],
  );
  assert.deepEqual(
    assess(license, [{ ...row, source_domain: 123 } as unknown as RawFeedRow]).reasons,
    ["original_source_domain_not_authorized"],
  );
});
