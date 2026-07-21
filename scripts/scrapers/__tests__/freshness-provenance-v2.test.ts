import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  LISTING_AGING_MAX_AGE_DAYS,
  LISTING_FRESH_MAX_AGE_DAYS,
  evaluateFreshnessProvenanceV2,
} from "../../../lib/intelligence/freshness-provenance-v2.js";
import { runStructuredListingIntelligencePipeline } from "../../../lib/intelligence/structured-listing-pipeline.js";
import { adaptValidatedFeedRow } from "../../../lib/property-schema/adapters.js";
import type { ValidatedFeedRow } from "../../../lib/feeds/schema.js";
import type { Listing } from "../../../lib/listings/types.js";

const NOW = "2026-07-21T20:00:00.000Z";
const DAY_MS = 86_400_000;

function isoDaysAgo(days: number) {
  return new Date(new Date(NOW).getTime() - days * DAY_MS).toISOString();
}

function feedRow(overrides: Partial<ValidatedFeedRow> = {}): ValidatedFeedRow {
  return {
    external_id: "feed-freshness-1",
    source_name: "Agency Feed",
    source_domain: "agency.example.ma",
    source_url: "https://agency.example.ma/listings/freshness-1",
    transaction_type: "sale",
    property_type: "apartment",
    title: "Appartement Maârif",
    description: "Annonce structurée pour test de fraîcheur.",
    city: "Casablanca",
    district: "Maârif",
    price_mad: 900000,
    surface_m2: 100,
    bedrooms_count: 2,
    coordinates: null,
    image_urls: [],
    updated_at_source: NOW,
    update_signal: null,
    ...overrides,
  };
}

function context(id: string, observedAt: string) {
  return {
    property_id: `property-${id}`,
    offer_id: `offer-${id}`,
    source_id: `source-${id}`,
    source_name: `Source ${id}`,
    external_offer_id: id,
    source_url: `https://source.example.ma/${id}`,
    compliance_status: "allowed" as const,
    now: observedAt,
  };
}

function runFeed(daysAgo: number, overrides: Partial<ValidatedFeedRow> = {}) {
  return runStructuredListingIntelligencePipeline({
    origin: "direct_feed",
    row: feedRow(overrides),
    context: context(`feed-${daysAgo}`, isoDaysAgo(daysAgo)),
  }, NOW);
}

const LEGACY_ROW = {
  id: "legacy-freshness",
  title: "Appartement ancien",
  city: "Casablanca",
  neighborhood: "Maârif",
  district: "Maârif",
  price: 900000,
  price_mad: 900000,
  currency: "DH",
  surface_m2: 100,
  price_per_m2: 9000,
  property_type: "Appartement",
  transaction_type: "buy",
  bedrooms: 2,
  bathrooms: 1,
  freshness_label: "Mise à jour récente",
  source_type: "Source analysée",
  reliability_label: "Infos limitées",
  reliability_score: 50,
  is_mre_friendly: false,
  description: "Legacy row",
  image_url: "",
  reliability_explanation: "",
  listing_url: "https://legacy.example.ma/1",
  source_name: "legacy-source",
} as Listing;

describe("#13 Freshness & Provenance V2", () => {
  it("marks a real recent structured observation as fresh without claiming current availability", () => {
    const result = runFeed(1);

    assert.equal(result.stages.freshness, "completed");
    assert.equal(result.freshness.freshness_state, "fresh");
    assert.equal(result.freshness.freshness_score, 100);
    assert.equal(result.property.intelligence?.freshness_score, 100);
    assert.equal(result.freshness.public_freshness_label, "Vu récemment");
    assert.equal(result.freshness.availability_signal, "declared_available");
    assert.equal(result.freshness.availability_label, "Disponibilité déclarée par la source");
    assert.equal(result.freshness.can_claim_current_availability, false);
    assert.equal(result.freshness.contract_validation.valid, true);
    assert.doesNotMatch(result.freshness.claim.explanation.toLowerCase(), /encore disponible|toujours disponible/);
  });

  it("uses strict listing freshness boundaries: 7 days fresh, 8 aging, 30 aging, 31 stale", () => {
    assert.equal(runFeed(LISTING_FRESH_MAX_AGE_DAYS).freshness.freshness_state, "fresh");
    assert.equal(runFeed(LISTING_FRESH_MAX_AGE_DAYS + 1).freshness.freshness_state, "aging");
    assert.equal(runFeed(LISTING_AGING_MAX_AGE_DAYS).freshness.freshness_state, "aging");
    assert.equal(runFeed(LISTING_AGING_MAX_AGE_DAYS + 1).freshness.freshness_state, "stale");
  });

  it("does not turn a newer source_updated_at into a fabricated fresh observation", () => {
    const result = runFeed(40, { updated_at_source: NOW });

    assert.equal(result.freshness.source_updated_at, NOW);
    assert.equal(result.freshness.freshness_state, "stale");
    assert.equal(result.freshness.freshness_score, 20);
    assert.equal(result.freshness.observation_age_days, 40);
  });

  it("does not manufacture freshness for legacy DB rows from adapter execution time", () => {
    const result = runStructuredListingIntelligencePipeline({
      origin: "legacy_db",
      row: LEGACY_ROW,
      context: context("legacy", NOW),
    }, NOW);

    assert.equal(result.freshness.verification_channel, "legacy_import");
    assert.equal(result.freshness.freshness_state, "unknown");
    assert.equal(result.freshness.freshness_score, null);
    assert.equal(result.property.intelligence?.freshness_score, null);
    assert.equal(result.stages.freshness, "unavailable");
    assert.equal(result.freshness.claim.strength, "unavailable");
  });

  it("keeps observation freshness separate from an explicit withdrawal signal", () => {
    const result = runFeed(0, { update_signal: "unpublish" });

    assert.equal(result.freshness.freshness_state, "fresh");
    assert.equal(result.freshness.availability_signal, "explicitly_unavailable");
    assert.equal(result.freshness.availability_label, "Indisponibilité déclarée");
    assert.equal(result.freshness.can_claim_current_availability, false);
  });

  it("preserves first_seen, last_seen and source_updated_at as separate clocks", () => {
    const property = adaptValidatedFeedRow(feedRow({ updated_at_source: isoDaysAgo(2) }), context("clock", isoDaysAgo(5)));
    property.offers[0].first_observed_at = isoDaysAgo(20);
    property.offers[0].last_observed_at = isoDaysAgo(5);

    const result = evaluateFreshnessProvenanceV2(property, property.offers[0], "direct_feed", NOW);

    assert.equal(result.first_seen_at, isoDaysAgo(20));
    assert.equal(result.last_seen_at, isoDaysAgo(5));
    assert.equal(result.source_updated_at, isoDaysAgo(2));
    assert.equal(result.observation_age_days, 5);
    assert.equal(result.freshness_state, "fresh");
  });

  it("treats no observation evidence as unknown rather than guessing from active offer status", () => {
    const property = adaptValidatedFeedRow(feedRow(), context("unknown", NOW));
    const offer = property.offers[0];
    offer.first_observed_at = null;
    offer.last_observed_at = null;
    offer.title.observed_at = null;
    offer.description.observed_at = null;
    offer.price_amount.observed_at = null;
    property.facts.classification.property_type.observed_at = null;
    property.facts.classification.market_segment.observed_at = null;
    property.facts.location.city.observed_at = null;
    if (property.facts.location.district) property.facts.location.district.observed_at = null;
    if (property.facts.surfaces.surface_total_m2) property.facts.surfaces.surface_total_m2.observed_at = null;

    const result = evaluateFreshnessProvenanceV2(property, offer, "first_party", NOW);

    assert.equal(result.freshness_state, "unknown");
    assert.equal(result.claim.strength, "unavailable");
    assert.equal(result.availability_signal, "declared_available");
    assert.equal(result.can_claim_current_availability, false);
  });
});
