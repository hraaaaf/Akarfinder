import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolvePartnerListingV2Geo } from "../../../lib/geo/national-partner-geo-resolver.js";
import { GEO_CITIES, GEO_NEIGHBORHOODS } from "../../../lib/geo/geo-entity-registry.js";
import { findMarketBenchmark } from "../../../lib/market/market-benchmark-registry.js";
import {
  aggregatePartnerMarketSnapshot,
  comparePartnerMarketSnapshots,
  partnerPropertiesToMarketObservations,
} from "../../../lib/market/partner-market-aggregator-v2.js";
import {
  PARTNER_LISTING_V2_VERSION,
  adaptPartnerListingV2,
  type PartnerListingV2,
} from "../../../lib/partners/partner-listing-v2.js";

const SNAPSHOT_AT = "2026-08-24T12:00:00.000Z";

function listing(input: {
  id: string;
  city?: string;
  district?: string;
  transaction?: "sale" | "rent";
  propertyType?: PartnerListingV2["property_type"];
  price?: number;
  surface?: number;
  updatedAt?: string;
  availability?: PartnerListingV2["availability_status"];
  partnerId?: string;
  sourceUrl?: string;
}): PartnerListingV2 {
  return {
    schema_version: PARTNER_LISTING_V2_VERSION,
    partner_listing_id: input.id,
    acquisition_channel: "partner_api",
    partner_id: input.partnerId ?? "agence-atlas",
    partner_type: "agency",
    partner_tier: "agency_partner",
    authorization_status: "partner_authorized",
    source_authorization_note: "API partenaire autorisée.",
    transaction_type: input.transaction ?? "sale",
    property_type: input.propertyType ?? "apartment",
    city: input.city ?? "Casablanca",
    district: input.district ?? "Maârif",
    location_level: "district_only",
    approximate_area_label: `${input.district ?? "Maârif"}, ${input.city ?? "Casablanca"}`,
    address_public_allowed: false,
    price_amount: input.price ?? 1_200_000,
    currency: "MAD",
    price_display_mode: "exact",
    surface_m2: input.surface ?? 100,
    bedrooms: 2,
    bathrooms: 1,
    floor: 2,
    elevator: true,
    parking: false,
    terrace: false,
    furnished: false,
    condition: "good",
    availability_status: input.availability ?? "available",
    last_partner_update_at: input.updatedAt ?? "2026-08-23T12:00:00.000Z",
    photos_authorized: false,
    photo_count: 0,
    media_usage_scope: "none",
    contact_authorized: false,
    contact_mode: "hidden",
    title: `Annonce ${input.id}`,
    short_description: "Annonce partenaire.",
    normalized_description: "Annonce partenaire.",
    highlights: [],
    points_to_verify: [],
    proximity_allowed: false,
    neighborhood_context_allowed: true,
    mobility_context_allowed: false,
    floor_plan_authorized: false,
    floor_plan_available: false,
    floor_plan_type: "none",
    floor_plan_display_mode: "hidden",
    floor_plan_source: "partner_provided",
    floor_plan_scope: "unknown",
    floor_plan_has_dimensions: false,
    floor_plan_has_room_labels: false,
    floor_plan_has_orientation: false,
    floor_plan_has_surface_breakdown: false,
    source_url: input.sourceUrl ?? `https://${input.partnerId ?? "agence-atlas"}.ma/${input.id}`,
  };
}

function resolved(input: Parameters<typeof listing>[0]) {
  const raw = listing(input);
  const property = adaptPartnerListingV2(raw, SNAPSHOT_AT);
  return { property, geo: resolvePartnerListingV2Geo(raw) };
}

describe("Partner Market Aggregator V2", () => {
  it("builds observed sale metrics with median, categories, freshness and dedup", () => {
    const a = resolved({ id: "A", price: 1_000_000, surface: 100, partnerId: "source-a" });
    const b = resolved({ id: "B", price: 1_200_000, surface: 100, partnerId: "source-b" });
    const c = resolved({ id: "C", price: 1_400_000, surface: 100, partnerId: "source-c" });

    const snapshot = aggregatePartnerMarketSnapshot({
      resolved_properties: [a, b, c, a],
      snapshot_version: "snap-1",
      snapshot_at: SNAPSHOT_AT,
      freshness_window_days: 30,
    });

    assert.equal(snapshot.rows.length, 1);
    const row = snapshot.rows[0];
    assert.equal(row.listing_count, 3);
    assert.equal(row.price_sample_count, 3);
    assert.equal(row.median_price_per_m2_mad, 12_000);
    assert.equal(row.categories.apartment, 3);
    assert.equal(row.fresh_listing_percent, 100);
    assert.equal(row.freshness_status, "fresh_confirmed");
    assert.equal(row.source_count, 3);
    assert.equal(row.market_representativeness, "uncertified");
  });

  it("never mixes sale and rent", () => {
    const snapshot = aggregatePartnerMarketSnapshot({
      resolved_properties: [
        resolved({ id: "SALE", price: 1_000_000, surface: 100, transaction: "sale" }),
        resolved({ id: "RENT", price: 8_000, surface: 80, transaction: "rent" }),
      ],
      snapshot_version: "snap-segment",
      snapshot_at: SNAPSHOT_AT,
      freshness_window_days: 30,
    });

    const sale = snapshot.rows.find((row) => row.transaction_type === "sale");
    const rent = snapshot.rows.find((row) => row.transaction_type === "rent");
    assert.equal(sale?.listing_count, 1);
    assert.equal(sale?.median_price_per_m2_mad, 10_000);
    assert.equal(rent?.listing_count, 1);
    assert.equal(rent?.median_price_per_m2_mad, 100);
    assert.equal(rent?.benchmarks.apartment, null);
  });

  it("fails density closed without one certified positive area", () => {
    const item = resolved({ id: "DENSITY" });
    const withoutArea = aggregatePartnerMarketSnapshot({
      resolved_properties: [item],
      snapshot_version: "snap-no-area",
      snapshot_at: SNAPSHOT_AT,
      freshness_window_days: 30,
    }).rows[0];
    assert.equal(withoutArea.area_certified, false);
    assert.equal(withoutArea.listing_density_km2, null);

    const uncertified = aggregatePartnerMarketSnapshot({
      resolved_properties: [item],
      certified_areas: [{
        canonical_neighborhood_id: item.geo.canonical_neighborhood_id!,
        area_km2: 2,
        certified: false,
        source_ref: "uncertified-shape",
      }],
      snapshot_version: "snap-uncertified",
      snapshot_at: SNAPSHOT_AT,
      freshness_window_days: 30,
    }).rows[0];
    assert.equal(uncertified.listing_density_km2, null);
  });

  it("computes density only from the certified area for the same canonical neighborhood", () => {
    const one = resolved({ id: "D1" });
    const two = resolved({ id: "D2" });
    const snapshot = aggregatePartnerMarketSnapshot({
      resolved_properties: [one, two],
      certified_areas: [{
        canonical_neighborhood_id: one.geo.canonical_neighborhood_id!,
        area_km2: 2,
        certified: true,
        source_ref: "geometry-registry:maarif:v-certified",
      }],
      snapshot_version: "snap-density",
      snapshot_at: SNAPSHOT_AT,
      freshness_window_days: 30,
    });

    const row = snapshot.rows[0];
    assert.equal(row.listing_count, 2);
    assert.equal(row.area_certified, true);
    assert.equal(row.area_km2, 2);
    assert.equal(row.listing_density_km2, 1);
    assert.ok(row.provenance.includes("geometry-registry:maarif:v-certified"));
  });

  it("keeps missing/invalid price out of the median without dropping listing volume", () => {
    const valid = resolved({ id: "P1", price: 1_000_000, surface: 100 });
    const missing = resolved({ id: "P2", price: 1_100_000, surface: 100 });
    missing.property.offers[0].price_status = "not_disclosed";
    missing.property.offers[0].price_amount.value = null;

    const snapshot = aggregatePartnerMarketSnapshot({
      resolved_properties: [valid, missing],
      snapshot_version: "snap-null-price",
      snapshot_at: SNAPSHOT_AT,
      freshness_window_days: 30,
    });
    const row = snapshot.rows[0];
    assert.equal(row.listing_count, 2);
    assert.equal(row.price_sample_count, 1);
    assert.equal(row.median_price_per_m2_mad, 10_000);
  });

  it("excludes sold/reserved inventory and unresolved neighborhoods", () => {
    const available = resolved({ id: "ACTIVE" });
    const sold = resolved({ id: "SOLD", availability: "sold" });
    const reserved = resolved({ id: "RESERVED", availability: "reserved" });
    const unknown = resolved({ id: "UNKNOWN", district: "Quartier totalement inconnu 555" });

    const observations = partnerPropertiesToMarketObservations({
      resolved_properties: [available, sold, reserved, unknown],
      snapshot_at: SNAPSHOT_AT,
      freshness_window_days: 30,
    });
    assert.deepEqual(observations.map((row) => row.offer_id), [available.property.offers[0].offer_id]);
  });

  it("uses Yakeey only as a sale benchmark and never as area", () => {
    const candidate = GEO_NEIGHBORHOODS.flatMap((neighborhood) => {
      const city = GEO_CITIES.find((item) => item.slug === neighborhood.city_slug);
      if (!city) return [];
      const benchmark = findMarketBenchmark({
        city: city.canonical_name,
        neighborhood: neighborhood.canonical_name,
        property_type: "apartment",
      });
      return benchmark ? [{ city: city.canonical_name, neighborhood: neighborhood.canonical_name, benchmark }] : [];
    })[0];
    assert.ok(candidate, "un quartier canonique avec benchmark Yakeey appartement est attendu");

    const snapshot = aggregatePartnerMarketSnapshot({
      resolved_properties: [resolved({
        id: "BENCH",
        city: candidate.city,
        district: candidate.neighborhood,
        price: 1_000_000,
        surface: 100,
      })],
      snapshot_version: "snap-benchmark",
      snapshot_at: SNAPSHOT_AT,
      freshness_window_days: 30,
    });
    const row = snapshot.rows[0];
    assert.equal(row.benchmarks.apartment?.source, "yakeey");
    assert.equal(row.benchmarks.apartment?.price_per_m2_mad, candidate.benchmark.benchmark_price_per_m2);
    assert.equal(row.area_km2, null);
    assert.equal(row.listing_density_km2, null);
  });

  it("marks stale observations without rewriting them as missing", () => {
    const snapshot = aggregatePartnerMarketSnapshot({
      resolved_properties: [resolved({ id: "OLD", updatedAt: "2025-01-01T00:00:00.000Z" })],
      snapshot_version: "snap-stale",
      snapshot_at: SNAPSHOT_AT,
      freshness_window_days: 30,
    });
    const row = snapshot.rows[0];
    assert.equal(row.listing_count, 1);
    assert.equal(row.fresh_listing_percent, 0);
    assert.equal(row.freshness_status, "stale");
  });

  it("builds deterministic snapshot deltas while preserving NULL density", () => {
    const first = aggregatePartnerMarketSnapshot({
      resolved_properties: [resolved({ id: "H1", price: 1_000_000 })],
      snapshot_version: "history-1",
      snapshot_at: "2026-08-01T12:00:00.000Z",
      freshness_window_days: 30,
    });
    const second = aggregatePartnerMarketSnapshot({
      resolved_properties: [
        resolved({ id: "H1", price: 1_200_000 }),
        resolved({ id: "H2", price: 1_400_000 }),
      ],
      snapshot_version: "history-2",
      snapshot_at: SNAPSHOT_AT,
      freshness_window_days: 30,
    });

    const delta = comparePartnerMarketSnapshots(first, second)[0];
    assert.equal(delta.listing_count_delta, 1);
    assert.equal(delta.median_price_per_m2_delta, 3_000);
    assert.equal(delta.listing_density_km2_delta, null);
    assert.equal(delta.previous_snapshot_version, "history-1");
    assert.equal(delta.current_snapshot_version, "history-2");
  });
});
