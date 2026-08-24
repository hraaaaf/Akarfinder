import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  resolveNationalPartnerGeo,
  resolvePartnerListingV2Geo,
} from "../../../lib/geo/national-partner-geo-resolver.js";
import {
  normalizeGeoText,
  resolveNeighborhoodEntity,
} from "../../../lib/geo/geo-entity-registry.js";
import {
  getNationalNeighborhoodsForPlace,
  getNationalTerritoryPlace,
} from "../../../lib/map/national-territory-runtime.server.js";
import { PARTNER_LISTING_V2_VERSION, type PartnerListingV2 } from "../../../lib/partners/partner-listing-v2.js";

function basePartnerListing(overrides: Partial<PartnerListingV2> = {}): PartnerListingV2 {
  return {
    schema_version: PARTNER_LISTING_V2_VERSION,
    partner_listing_id: "GEO-42",
    acquisition_channel: "partner_api",
    partner_id: "agence-atlas",
    partner_type: "agency",
    partner_tier: "agency_partner",
    authorization_status: "partner_authorized",
    source_authorization_note: "Feed partenaire autorisé.",
    transaction_type: "sale",
    property_type: "apartment",
    city: "Casablanca",
    district: "Maârif",
    location_level: "district_only",
    approximate_area_label: "Maârif, Casablanca",
    address_public_allowed: false,
    price_amount: 1_850_000,
    currency: "MAD",
    price_display_mode: "exact",
    surface_m2: 110,
    bedrooms: 3,
    bathrooms: 2,
    floor: 4,
    elevator: true,
    parking: true,
    terrace: true,
    furnished: false,
    condition: "good",
    availability_status: "available",
    last_partner_update_at: "2026-08-24T10:00:00.000Z",
    photos_authorized: false,
    photo_count: 0,
    media_usage_scope: "none",
    contact_authorized: false,
    contact_mode: "hidden",
    title: "Appartement Maârif",
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
    ...overrides,
  };
}

describe("National Partner Geo Resolver V2", () => {
  it("resolves city aliases and conservative quartier prefixes to the canonical registry", () => {
    const result = resolveNationalPartnerGeo({
      city_raw: "Casa",
      neighborhood_raw: "QUARTIER MAARIF",
    });

    assert.equal(result.status, "resolved_neighborhood");
    assert.equal(result.reason, "canonical_registry_match");
    assert.equal(result.city?.name, "Casablanca");
    assert.equal(result.canonical_neighborhood_id, "district_casablanca_maarif");
    assert.equal(result.neighborhood_name, "Maârif");
    assert.equal(result.boundary_certified, false);
  });

  it("uses the national N2 sourced catalog for a unique non-registry Casablanca label", () => {
    const place = getNationalTerritoryPlace("casablanca");
    assert.ok(place);
    const rows = getNationalNeighborhoodsForPlace(place);
    assert.ok(rows.length >= 1500);

    const counts = new Map<string, number>();
    for (const row of rows) {
      const key = normalizeGeoText(row.name);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const candidate = rows.find(
      (row) =>
        (counts.get(normalizeGeoText(row.name)) ?? 0) === 1 &&
        resolveNeighborhoodEntity("Casablanca", row.name) === null,
    );
    assert.ok(candidate, "un label N2 unique hors petit registre canonique doit exister");

    const result = resolveNationalPartnerGeo({
      city_raw: "Casablanca",
      neighborhood_raw: candidate.name,
    });

    assert.equal(result.status, "resolved_neighborhood");
    assert.equal(result.reason, "national_n2_label_match");
    assert.equal(result.neighborhood_name, candidate.name);
    assert.ok(result.canonical_neighborhood_id?.startsWith("district_national_casablanca_"));
    assert.equal(result.neighborhood_source, "national_territory_v5");
    assert.equal(result.boundary_certified, false);
  });

  it("never infers a neighborhood from nearest point when the declared neighborhood is unknown", () => {
    const result = resolveNationalPartnerGeo({
      city_raw: "Casablanca",
      neighborhood_raw: "Quartier totalement inconnu 987654",
      latitude: 33.585,
      longitude: -7.632,
    });

    assert.equal(result.status, "resolved_exact");
    assert.equal(result.reason, "unknown_neighborhood");
    assert.equal(result.canonical_neighborhood_id, null);
    assert.equal(result.geo_precision, "exact_coordinates");
    assert.equal(result.position_publication_allowed, false);
  });

  it("keeps valid coordinates private unless publication is explicitly allowed", () => {
    const hidden = resolveNationalPartnerGeo({
      city_raw: "Rabat",
      neighborhood_raw: "Agdal",
      latitude: 34.004,
      longitude: -6.852,
    });
    assert.equal(hidden.coordinate_status, "valid");
    assert.equal(hidden.position_publication_allowed, false);

    const publicPoint = resolveNationalPartnerGeo({
      city_raw: "Rabat",
      neighborhood_raw: "Agdal",
      latitude: 34.004,
      longitude: -6.852,
      coordinates_public_allowed: true,
    });
    assert.equal(publicPoint.position_publication_allowed, true);
  });

  it("ignores invalid coordinates while preserving a proven neighborhood resolution", () => {
    const result = resolveNationalPartnerGeo({
      city_raw: "Rabat",
      neighborhood_raw: "Agdal",
      latitude: 95,
      longitude: -6.852,
    });

    assert.equal(result.coordinate_status, "invalid");
    assert.equal(result.latitude, null);
    assert.equal(result.longitude, null);
    assert.equal(result.status, "resolved_neighborhood");
    assert.equal(result.canonical_neighborhood_id, "district_rabat_agdal");
  });

  it("fails closed on an unknown city even when coordinates are present", () => {
    const result = resolveNationalPartnerGeo({
      city_raw: "Ville imaginaire 12345",
      neighborhood_raw: "Centre",
      latitude: 33.5,
      longitude: -7.6,
    });

    assert.equal(result.status, "unresolved");
    assert.equal(result.reason, "unknown_city");
    assert.equal(result.city, null);
    assert.equal(result.canonical_neighborhood_id, null);
  });

  it("adapts a PartnerListingV2 without leaking its private address or coordinates", () => {
    const result = resolvePartnerListingV2Geo(basePartnerListing({
      address_private: "12 rue privée, Maârif, Casablanca",
      latitude: 33.585,
      longitude: -7.632,
      location_level: "exact_address_authorized",
    }));

    assert.equal(result.canonical_neighborhood_id, "district_casablanca_maarif");
    assert.equal(result.position_publication_allowed, false);
    assert.equal(result.private_address_used_for_resolution, false);
    assert.equal("address_private" in result, false);
  });
});
