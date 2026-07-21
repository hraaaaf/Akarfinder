// AKARFINDER-100K-ROADMAP-AUTONOMOUS-GOAL-1 (#6/10)
// Pure unit tests for the V2 clustering scorer: tier boundaries (url_duplicate
// / same_source_offer / cross_source_high_confidence / possible_match /
// no_match), the >=3-corroborating-signal gate, tolerance math, and blocking.

import test from "node:test";
import assert from "node:assert/strict";
import { scorePair, findCandidatePairs, blockingKey, type ClusterableOffer } from "../../../lib/dedup-clustering/v2-scorer.js";

let nextId = 1;
function offer(overrides: Partial<ClusterableOffer> = {}): ClusterableOffer {
  return {
    source_offer_id: nextId++,
    listing_url: `https://example.com/${nextId}`,
    source_name: "sourceA",
    source_offer_key: null,
    city: "Rabat",
    district: "Agdal",
    property_type: "appartement",
    transaction_type: "vente",
    price_mad: 1200000,
    surface_m2: 90,
    bedrooms_count: 3,
    bathrooms_count: 2,
    title: "Bel appartement a vendre Agdal",
    ...overrides,
  };
}

test("identical listing_url -> url_duplicate regardless of any other field", () => {
  const url = "https://example.com/same";
  const a = offer({ listing_url: url, city: "Rabat" });
  const b = offer({ listing_url: url, city: "Casablanca" }); // deliberately conflicting
  const result = scorePair(a, b);
  assert.equal(result.tier, "url_duplicate");
});

test("same source_name + same source_offer_key (different URLs) -> same_source_offer", () => {
  const a = offer({ source_name: "avito", source_offer_key: "AV123", listing_url: "https://a.com/1" });
  const b = offer({ source_name: "avito", source_offer_key: "AV123", listing_url: "https://a.com/1-updated" });
  const result = scorePair(a, b);
  assert.equal(result.tier, "same_source_offer");
});

test("same source_name but DIFFERENT source_offer_key -> not same_source_offer", () => {
  const a = offer({ source_name: "avito", source_offer_key: "AV123" });
  const b = offer({ source_name: "avito", source_offer_key: "AV999", city: a.city, transaction_type: a.transaction_type, property_type: a.property_type });
  const result = scorePair(a, b);
  assert.notEqual(result.tier, "same_source_offer");
});

test("null source_offer_key on either side never matches (never treat two nulls as equal)", () => {
  const a = offer({ source_name: "avito", source_offer_key: null });
  const b = offer({ source_name: "avito", source_offer_key: null, city: a.city, transaction_type: a.transaction_type, property_type: a.property_type });
  const result = scorePair(a, b);
  assert.notEqual(result.tier, "same_source_offer");
});

test("different city -> no_match even with everything else identical (mandatory gate)", () => {
  const a = offer({ city: "Rabat" });
  const b = offer({ city: "Casablanca" });
  const result = scorePair(a, b);
  assert.equal(result.tier, "no_match");
});

test("different transaction_type -> no_match (vente vs location)", () => {
  const a = offer({ transaction_type: "vente" });
  const b = offer({ transaction_type: "location" });
  const result = scorePair(a, b);
  assert.equal(result.tier, "no_match");
});

test("city+transaction+type match but only 1 corroborating signal -> possible_match, NOT high confidence", () => {
  const a = offer({ district: "Agdal", surface_m2: 90, price_mad: 1200000, bedrooms_count: 3, title: "aaa" });
  const b = offer({ district: "Hay Riad", surface_m2: 200, price_mad: 5000000, bedrooms_count: 5, title: "zzz" }); // only city/transaction/type shared
  const result = scorePair(a, b);
  assert.equal(result.tier, "possible_match");
  assert.equal(result.corroborating_signal_count < 3, true);
});

test("city+transaction+type + exactly 3 corroborating signals -> cross_source_high_confidence", () => {
  const a = offer({ district: "Agdal", surface_m2: 90, price_mad: 1200000, bedrooms_count: 5, title: "xyz" });
  const b = offer({ district: "Agdal", surface_m2: 91, price_mad: 1210000, bedrooms_count: 3, title: "different words entirely" });
  const result = scorePair(a, b);
  // district match + surface within 5% + price within 5% = 3 signals; bedrooms and title differ.
  assert.equal(result.corroborating_signal_count, 3);
  assert.equal(result.tier, "cross_source_high_confidence");
});

test("surface tolerance boundary: 5% difference passes, 6% fails", () => {
  const a = offer({ surface_m2: 100, price_mad: null, bedrooms_count: null, district: "Agdal", title: null });
  const bAt5 = offer({ surface_m2: 105, price_mad: null, bedrooms_count: null, district: "Agdal", title: null });
  const bAt6 = offer({ surface_m2: 106, price_mad: null, bedrooms_count: null, district: "Agdal", title: null });
  assert.equal(scorePair(a, bAt5).matched_signals.includes("surface_m2"), true);
  assert.equal(scorePair(a, bAt6).matched_signals.includes("surface_m2"), false);
});

test("price tolerance boundary: 5% difference passes, 6% fails", () => {
  const a = offer({ price_mad: 1000000, surface_m2: null, bedrooms_count: null, district: "Agdal", title: null });
  const bAt5 = offer({ price_mad: 1050000, surface_m2: null, bedrooms_count: null, district: "Agdal", title: null });
  const bAt6 = offer({ price_mad: 1060000, surface_m2: null, bedrooms_count: null, district: "Agdal", title: null });
  assert.equal(scorePair(a, bAt5).matched_signals.includes("price_mad"), true);
  assert.equal(scorePair(a, bAt6).matched_signals.includes("price_mad"), false);
});

test("null fields on either side never count as a corroborating match (no null==null shortcut)", () => {
  const a = offer({ district: null, surface_m2: null, price_mad: null, bedrooms_count: null, title: null });
  const b = offer({ district: null, surface_m2: null, price_mad: null, bedrooms_count: null, title: null });
  const result = scorePair(a, b);
  assert.equal(result.corroborating_signal_count, 0);
  assert.equal(result.tier, "possible_match");
});

// Regression: the real shadow audit against production data (2026-07-21)
// found clearly DIFFERENT properties (different agencies, different
// surfaces: 60/80/94/98/100 m2) scored cross_source_high_confidence,
// because district = "" (blank, this dataset's "unknown" representation,
// not null) was being treated as a real match between two unknowns.
test("blank string ('') district is treated as unknown, same as null -- never a match between two blanks", () => {
  const a = offer({ district: "", surface_m2: 60, price_mad: null, bedrooms_count: 2 });
  const b = offer({ district: "", surface_m2: 80, price_mad: null, bedrooms_count: 2 }); // different surface, different property
  const result = scorePair(a, b);
  assert.equal(result.matched_signals.includes("district"), false);
  assert.equal(result.tier, "possible_match", "only bedrooms_count matches (1 signal) -- must not reach high confidence");
});

// Regression: same audit -- generic, formulaic titles ("Appartement a
// louer <n> m2 a <ville>") from clearly different listings were inflating
// a title-token-overlap signal. That signal was removed entirely rather
// than tuned, since it isn't one of the mandate's listed corroborating
// signals (district/surface/price/bedrooms/coordinates) and proved
// unreliable for this domain's formulaic titles.
test("title similarity, however strong, is NOT a corroborating signal (removed after real-data false positives)", () => {
  const a = offer({ title: "Appartement a louer 80 m2 a Sale", district: "", surface_m2: null, price_mad: null, bedrooms_count: null });
  const b = offer({ title: "Appartement a louer 80 m2 a Sale", district: "", surface_m2: null, price_mad: null, bedrooms_count: null });
  const result = scorePair(a, b);
  assert.equal(result.matched_signals.some((s) => s.includes("title")), false);
  assert.equal(result.corroborating_signal_count, 0);
});

// Regression: real shadow audit found two agenz "Palmier" listings with
// matching district/surface(~4% apart)/bedrooms but an 800k vs 2.2M DH
// price (63% apart) -- 3 nominal signals matched, but the price disagreement
// is strong evidence they are different units, not the same property.
test("a strongly contradicting price (>40% apart) disqualifies high confidence even with 3 other signals matched", () => {
  const a = offer({ district: "Palmier", surface_m2: 89, price_mad: 800000, bedrooms_count: 2 });
  const b = offer({ district: "Palmier", surface_m2: 93, price_mad: 2200000, bedrooms_count: 2 }); // 63% price gap
  const result = scorePair(a, b);
  assert.equal(result.contradicting_signals.includes("price_mad"), true);
  assert.equal(result.tier, "possible_match", "must be downgraded, not cross_source_high_confidence");
});

test("a strongly contradicting surface (>40% apart) also disqualifies high confidence", () => {
  const a = offer({ district: "Agdal", surface_m2: 50, price_mad: 1000000, bedrooms_count: 2 });
  const b = offer({ district: "Agdal", surface_m2: 150, price_mad: 1020000, bedrooms_count: 2 }); // 67% surface gap
  const result = scorePair(a, b);
  assert.equal(result.contradicting_signals.includes("surface_m2"), true);
  assert.equal(result.tier, "possible_match");
});

test("a moderate price gap (e.g. 20%) is neither a match nor a contradiction -- just doesn't corroborate", () => {
  const a = offer({ district: "Agdal", surface_m2: 90, price_mad: 1000000, bedrooms_count: 2 });
  const b = offer({ district: "Agdal", surface_m2: 91, price_mad: 1200000, bedrooms_count: 2 }); // 20% gap: not <=5%, not >40%
  const result = scorePair(a, b);
  assert.equal(result.matched_signals.includes("price_mad"), false);
  assert.equal(result.contradicting_signals.includes("price_mad"), false);
});

test("blockingKey groups by city+transaction_type+property_type exactly", () => {
  const a = offer({ city: "Rabat", transaction_type: "vente", property_type: "appartement" });
  const b = offer({ city: "Rabat", transaction_type: "vente", property_type: "appartement" });
  const c = offer({ city: "Rabat", transaction_type: "location", property_type: "appartement" });
  assert.equal(blockingKey(a), blockingKey(b));
  assert.notEqual(blockingKey(a), blockingKey(c));
});

test("findCandidatePairs never returns a no_match pair from cross-block comparison (blocking actually prunes)", () => {
  const rabat = offer({ city: "Rabat", transaction_type: "vente", property_type: "appartement" });
  const casa = offer({ city: "Casablanca", transaction_type: "vente", property_type: "appartement" });
  const candidates = findCandidatePairs([rabat, casa]);
  assert.equal(candidates.length, 0, "different cities in different blocks should never even be scored as no_match");
});

test("findCandidatePairs finds a url_duplicate across two otherwise-unrelated offers", () => {
  const url = "https://example.com/dup";
  const a = offer({ listing_url: url, city: "Rabat" });
  const b = offer({ listing_url: url, city: "Marrakech" });
  const candidates = findCandidatePairs([a, b]);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].tier, "url_duplicate");
});

test("findCandidatePairs is deterministic regardless of input array order", () => {
  const a = offer({ district: "Agdal", surface_m2: 90, price_mad: 1200000, bedrooms_count: 3 });
  const b = offer({ district: "Agdal", surface_m2: 91, price_mad: 1205000, bedrooms_count: 3 });
  const c = offer({ city: "Fes", district: "Zouagha", transaction_type: "location" });
  const forward = findCandidatePairs([a, b, c]);
  const reversed = findCandidatePairs([c, b, a]);
  assert.deepEqual(forward, reversed);
});
