import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  PROPERTY_SCHEMA_VERSION,
  PROJECT_SCHEMA_VERSION,
  adaptLegacyListing,
  adaptPartnerListing,
  adaptScrapedListing,
  adaptValidatedFeedRow,
  buildBasePropertyIntelligence,
  computeInformationCompleteness,
  emptyPropertyFacts,
  fact,
  getDynamicOnboardingFields,
  validateOfferIngestion,
  validateProjectIngestion,
  validatePropertyIngestion,
  validatePropertyPublication,
  type CanonicalOfferV1,
  type CanonicalPropertyV1,
  type CanonicalProjectV1,
} from "../../../lib/property-schema/index.js";
import { FICTIONAL_AGENCY_DEMO_RABAT_APARTMENT } from "../../../lib/partners/partner-listing-examples.js";
import type { ValidatedFeedRow } from "../../../lib/feeds/schema.js";
import type { ScrapedListingP0 } from "../types.js";
import type { Listing } from "../../../lib/listings/types.js";

const NOW = "2026-07-21T18:00:00.000Z";

function offer(overrides: Partial<CanonicalOfferV1> = {}): CanonicalOfferV1 {
  return {
    offer_id: "offer-1",
    property_id: "property-1",
    source_id: "partner-1",
    source_name: "Partner 1",
    external_offer_id: "EXT-1",
    source_url: "https://example.ma/listing/1",
    canonical_source_url: "https://example.ma/listing/1",
    acquisition_channel: "partner_feed",
    origin_type: "partner_feed",
    transaction_type: "sale",
    title: fact("Appartement Agdal", { provenance: "DECLARED", confidence: "high" }),
    description: fact("Appartement lumineux", { provenance: "DECLARED", confidence: "high" }),
    price_amount: fact(1_500_000, { provenance: "DECLARED", confidence: "high" }),
    price_currency: "MAD",
    price_period: "total",
    price_status: "valid",
    availability_status: "available",
    published_at_source: null,
    first_observed_at: NOW,
    last_observed_at: NOW,
    updated_at_source: NOW,
    offer_status: "active",
    compliance_status: "allowed",
    media_set_id: null,
    ingestion_run_id: null,
    ...overrides,
  };
}

function property(overrides: Partial<CanonicalPropertyV1> = {}): CanonicalPropertyV1 {
  const facts = emptyPropertyFacts();
  facts.classification.property_type = fact("apartment");
  facts.classification.market_segment = fact("resale");
  facts.location.city = fact("Rabat");
  facts.location.district = fact("Agdal");
  facts.surfaces.surface_total_m2 = fact(100);
  facts.layout.bedrooms_count = fact(3);
  facts.layout.bathrooms_count = fact(2);
  return {
    property_id: "property-1",
    schema_version: PROPERTY_SCHEMA_VERSION,
    canonical_status: "active",
    project_id: null,
    project_unit_id: null,
    facts,
    offers: [offer()],
    media: [],
    intelligence: null,
    display_policies: [],
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

describe("#10B PROPERTY SCHEMA V1", () => {
  it("separates physical property facts from offers, intelligence and display policy", () => {
    const p = property();
    assert.equal(p.facts.location.city.value, "Rabat");
    assert.equal(p.offers[0].price_amount.value, 1_500_000);
    assert.equal(p.intelligence, null);
    assert.deepEqual(p.display_policies, []);
    assert.equal(p.schema_version, "1.0");
  });

  it("uses null for unknown and never requires false as the unknown boolean state", () => {
    const facts = emptyPropertyFacts();
    facts.features.has_pool = fact<boolean>(null);
    assert.equal(facts.features.has_pool.value, null);
    assert.equal(facts.features.has_pool.confidence, "unknown");
  });
});

describe("#10B2 PROJECT SCHEMA V1", () => {
  it("validates a canonical project independently from property units", () => {
    const project: CanonicalProjectV1 = {
      project_id: "project-1",
      schema_version: PROJECT_SCHEMA_VERSION,
      project_name: fact("Résidence Atlas"),
      project_type: fact("residential"),
      status: fact("under_construction"),
      developer: { developer_id: "dev-1", developer_name: fact("Atlas Développement"), partner_status: "partner" },
      location: { country: fact("Morocco"), city: fact("Casablanca") },
      timeline: {},
      inventory: { min_price_mad: fact(900_000), max_price_mad: fact(2_100_000) },
      product: {},
      legal: {},
      commercial: {},
      media: [],
      unit_property_ids: [],
      created_at: NOW,
      updated_at: NOW,
    };
    assert.equal(validateProjectIngestion(project).valid, true);
    project.inventory.min_price_mad = fact(3_000_000);
    assert.equal(validateProjectIngestion(project).valid, false);
  });
});

describe("#10C COMPLETENESS CONTRACT", () => {
  it("measures information completeness, never reliability", () => {
    const full = computeInformationCompleteness(property());
    const sparse = property();
    sparse.facts.location.district = fact(null);
    sparse.facts.surfaces.surface_total_m2 = fact(null);
    sparse.facts.layout.bedrooms_count = fact(null);
    sparse.offers[0].price_amount = fact(null);
    sparse.offers[0].price_status = "not_disclosed";
    const low = computeInformationCompleteness(sparse);
    assert.equal(full.measured_as, "information_completeness");
    assert.ok(full.score > low.score);
    assert.ok(full.notes.every((note) => !/certifi/i.test(note) || /ne doit jamais/i.test(note)));
  });
});

describe("#10D DYNAMIC PARTNER ONBOARDING", () => {
  it("keeps each contextual form at or below 45 fields and removes irrelevant questions", () => {
    const apartment = getDynamicOnboardingFields({ property_type: "apartment", transaction_type: "sale", market_segment: "resale" });
    const land = getDynamicOnboardingFields({ property_type: "land", transaction_type: "sale", market_segment: "resale" });
    assert.ok(apartment.length <= 45);
    assert.ok(land.length <= 45);
    assert.equal(land.some((field) => field.key === "bedrooms_count"), false);
    assert.equal(land.some((field) => field.key === "zoning_type"), true);
    assert.equal(apartment.some((field) => field.key === "has_elevator"), true);
  });
});

describe("#10E AUTOMATIC PROPERTY ENRICHMENT", () => {
  it("derives only deterministic price per m2 and leaves market intelligence unknown", () => {
    const intelligence = buildBasePropertyIntelligence(property(), offer(), NOW);
    assert.equal(intelligence.price_per_m2, 15_000);
    assert.equal(intelligence.market_position, null);
    assert.equal(intelligence.akar_score, null);
  });

  it("does not invent price per m2 when price is undisclosed", () => {
    const o = offer({ price_amount: fact(null), price_status: "not_disclosed" });
    assert.equal(buildBasePropertyIntelligence(property({ offers: [o] }), o, NOW).price_per_m2, null);
  });
});

describe("#10F LISTING VALIDATION ENGINE", () => {
  it("allows sparse ingestion but blocks unsafe publication", () => {
    const p = property();
    p.facts.classification.property_type = fact("unknown");
    p.facts.location.city = fact(null);
    const o = offer({ compliance_status: "review_required" });
    assert.equal(validatePropertyIngestion(p).valid, true);
    assert.equal(validatePropertyPublication(p, o).valid, false);
  });

  it("rejects false zero prices and title-only offer identity", () => {
    const o = offer({ external_offer_id: null, source_url: null, canonical_source_url: null, price_amount: fact(0), price_status: "not_disclosed" });
    const validation = validateOfferIngestion(o);
    assert.equal(validation.valid, false);
    assert.equal(validation.issues.some((issue) => issue.code === "false_zero_price"), true);
    assert.equal(validation.issues.some((issue) => issue.code === "missing_offer_identity"), true);
  });
});

describe("#10G CANONICAL ADAPTER LAYER", () => {
  it("adapts direct feeds without converting missing price to zero", () => {
    const row: ValidatedFeedRow = {
      external_id: "AG-1",
      source_name: "agency",
      source_domain: "agency.example.ma",
      source_url: "https://agency.example.ma/1",
      transaction_type: "sale",
      property_type: "apartment",
      title: "Appartement Agdal",
      description: null,
      city: "Rabat",
      district: "Agdal",
      price_mad: null,
      surface_m2: 90,
      bedrooms_count: 2,
      coordinates: null,
      image_urls: [],
      updated_at_source: NOW,
      update_signal: null,
    };
    const adapted = adaptValidatedFeedRow(row, { property_id: "p-feed", offer_id: "o-feed", source_id: "agency", now: NOW });
    assert.equal(adapted.offers[0].price_amount.value, null);
    assert.equal(adapted.offers[0].price_status, "not_disclosed");
    assert.equal(adapted.facts.surfaces.surface_total_m2?.value, 90);
  });

  it("adapts partner standard with declared provenance", () => {
    const adapted = adaptPartnerListing(FICTIONAL_AGENCY_DEMO_RABAT_APARTMENT, { property_id: "p-partner", offer_id: "o-partner", source_id: "partner", now: NOW });
    assert.equal(adapted.facts.location.city.provenance, "DECLARED");
    assert.equal(adapted.offers[0].compliance_status, "allowed");
  });

  it("preserves scraper confidence and never turns absent booleans into explicit false", () => {
    const row: ScrapedListingP0 = {
      source_name: "mubawab",
      source_url: "https://mubawab.ma",
      listing_url: "https://mubawab.ma/a/1",
      title: "Appartement test",
      price_raw: null,
      price_mad: null,
      city: "Rabat",
      district: null,
      property_type: "apartment",
      transaction_type: "sale",
      surface_raw: "90 m2",
      surface_m2: 90,
      rooms_count: 3,
      bedrooms_count: 2,
      bathrooms: null,
      description_snippet: null,
      images_count: 0,
      thumbnail_url: null,
      seller_name: null,
      published_at_raw: null,
      scraped_at: NOW,
      data_completeness_score: 50,
      field_confidence: { price: "missing", city: "high", district: "missing", surface: "high", rooms: "medium", bedrooms: "medium", bathrooms: "missing", description: "missing", seller: "missing" },
      built_surface_m2: null,
      plot_surface_m2: null,
      condition: null,
      property_age_range: null,
      orientation: null,
      floor_type: null,
      floors_count: null,
      garden_m2: null,
      terrace_m2: null,
      garage_spaces: null,
      has_pool: false,
      has_concierge: false,
      has_moroccan_living_room: false,
      has_european_living_room: false,
      has_equipped_kitchen: false,
      premium_features: [],
    };
    const adapted = adaptScrapedListing(row, { property_id: "p-scrape", offer_id: "o-scrape", source_id: "mubawab", now: NOW });
    assert.equal(adapted.facts.location.city.confidence, "high");
    assert.equal(adapted.facts.features.has_pool?.value, null);
    assert.equal(adapted.offers[0].price_amount.value, null);
  });

  it("adapts legacy Listing as low-confidence compatibility data and strips false zeros", () => {
    const legacy = {
      id: "legacy-1",
      title: "Bien legacy",
      city: "Casablanca",
      neighborhood: "",
      price: null,
      currency: "DH",
      surface_m2: 0,
      price_per_m2: null,
      property_type: "Appartement",
      transaction_type: "new",
      bedrooms: 0,
      bathrooms: 0,
      freshness_label: "",
      source_type: "Source analysée",
      reliability_label: "Infos limitées",
      reliability_score: 0,
      is_mre_friendly: false,
      description: "",
      image_url: "",
      reliability_explanation: "",
    } as Listing;
    const adapted = adaptLegacyListing(legacy, { property_id: "p-legacy", offer_id: "o-legacy", source_id: "legacy", now: NOW });
    assert.equal(adapted.facts.surfaces.surface_total_m2?.value, null);
    assert.equal(adapted.facts.layout.bedrooms_count?.value, null);
    assert.equal(adapted.facts.classification.market_segment.value, "new_build");
    assert.equal(adapted.offers[0].transaction_type, "sale");
    assert.equal(adapted.display_policies.length, 0);
  });
});
