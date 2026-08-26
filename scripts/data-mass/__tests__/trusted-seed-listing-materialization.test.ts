import test from "node:test";
import assert from "node:assert/strict";
import {
  buildLinkOnlyPropertyRow,
  evaluateTrustedSeedListing,
  trustedSeedFingerprint,
  type TrustedSeedListingInput,
} from "../../../lib/data-mass/trusted-seed-listing-materialization";

function base(overrides: Partial<TrustedSeedListingInput> = {}): TrustedSeedListingInput {
  return {
    seedId: "11111111-1111-4111-8111-111111111111",
    canonicalUrl: "https://agenz.ma/fr/annonces/immo-agadir/vente-appartements/riad-salam/795607",
    sourceDomain: "agenz.ma",
    seedProvider: "serper_mass_harvest",
    freshnessStatus: "seed_only",
    firstObservedAt: "2026-08-01T00:00:00Z",
    lastObservedAt: "2026-08-25T00:00:00Z",
    title: "Appartement à vendre 950 000 DH - Riad Salam Agadir",
    snippet: "Appartement à Agadir, Riad Salam.",
    city: "Agadir",
    priceMad: 950000,
    priceConfidence: "trusted",
    propertyType: "apartment",
    intent: "sale",
    documentKind: "LISTING",
    verticalClassification: "real_estate_likely",
    ...overrides,
  };
}

test("admits a trusted listing with explicit city, district and current registry detail URL", () => {
  const decision = evaluateTrustedSeedListing(base());
  assert.equal(decision.admitted, true);
  assert.equal(decision.city, "Agadir");
  assert.equal(decision.district, "Riad Salam");
  assert.equal(decision.priceMad, 950000);
  assert.equal(decision.priceConfidence, "trusted");
});

test("admits a price-to-verify listing while preserving lower confidence", () => {
  const decision = evaluateTrustedSeedListing(base({ priceConfidence: "to_verify", priceMad: 875000 }));
  assert.equal(decision.admitted, true);
  const row = buildLinkOnlyPropertyRow(decision, "2026-08-26T00:00:00Z");
  assert.equal(row.price_mad, 875000);
  assert.equal(row.field_confidence.price, "price_to_verify");
  assert.equal(row.data_completeness_score, 45);
});

test("rejects category pages even when city and price exist", () => {
  const decision = evaluateTrustedSeedListing(base({ canonicalUrl: "https://agenz.ma/fr/annonces/immo-agadir/vente-appartements" }));
  assert.equal(decision.admitted, false);
  assert.ok(decision.reasons.includes("registry_detail_url_not_admissible"));
});

test("rejects inferred or inconsistent city instead of fabricating geography", () => {
  const decision = evaluateTrustedSeedListing(base({ city: "Rabat" }));
  assert.equal(decision.admitted, false);
  assert.ok(decision.reasons.includes("explicit_city_missing_or_mismatch"));
  assert.ok(decision.reasons.includes("explicit_district_missing_or_mismatch"));
});

test("rejects invalid or implausible prices regardless of confidence", () => {
  assert.equal(evaluateTrustedSeedListing(base({ priceMad: null })).admitted, false);
  assert.equal(evaluateTrustedSeedListing(base({ priceMad: 31_000_000, priceConfidence: "to_verify" })).admitted, false);
});

test("link-only projection copies no source title or description", () => {
  const decision = evaluateTrustedSeedListing(base());
  const row = buildLinkOnlyPropertyRow(decision, "2026-08-26T00:00:00Z");
  assert.equal(row.title, null);
  assert.equal(row.description_snippet, null);
  assert.equal(row.city, "Agadir");
  assert.equal(row.district, "Riad Salam");
  assert.equal(row.price_mad, 950000);
  assert.equal(row.field_confidence.copied_source_content, false);
});

test("fingerprint is deterministic and namespace-separated", () => {
  const url = base().canonicalUrl;
  assert.equal(trustedSeedFingerprint(url), trustedSeedFingerprint(url));
  assert.notEqual(trustedSeedFingerprint(url), url);
});
