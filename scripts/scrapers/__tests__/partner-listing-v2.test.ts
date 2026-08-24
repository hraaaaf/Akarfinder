import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  PARTNER_LISTING_V2_VERSION,
  adaptPartnerListingV2,
  buildPartnerListingV2Identity,
  validatePartnerListingV2,
  type PartnerListingV2,
} from "../../../lib/partners/partner-listing-v2.js";

const UPDATED_AT = "2026-08-24T09:45:00.000Z";
const NOW = "2026-08-24T10:00:00.000Z";

function listing(overrides: Partial<PartnerListingV2> = {}): PartnerListingV2 {
  return {
    schema_version: PARTNER_LISTING_V2_VERSION,
    partner_listing_id: "AG-2026-00042",
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
    location_level: "exact_address_authorized",
    approximate_area_label: "Maârif, Casablanca",
    latitude: 33.585,
    longitude: -7.632,
    address_public_allowed: false,
    address_private: "12 rue exemple, Maârif, Casablanca",
    price_amount: 1_850_000,
    currency: "MAD",
    price_display_mode: "exact",
    surface_m2: 110,
    rooms_count: 4,
    bedrooms: 3,
    bathrooms: 2,
    floor: 4,
    elevator: true,
    parking: true,
    terrace: true,
    furnished: false,
    condition: "good",
    availability_status: "available",
    last_partner_update_at: UPDATED_AT,
    photos_authorized: true,
    photo_count: 2,
    media_usage_scope: "akarfinder_partner_page",
    contact_authorized: true,
    contact_mode: "form",
    title: "Appartement lumineux Maârif",
    short_description: "Appartement structuré fourni par une agence partenaire.",
    normalized_description: "Appartement de 110 m² à Maârif avec trois chambres.",
    highlights: ["Quartier renseigné", "Parking"],
    points_to_verify: [],
    proximity_allowed: true,
    neighborhood_context_allowed: true,
    mobility_context_allowed: true,
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
    media: [
      {
        type: "image",
        url: "https://cdn.agence-atlas.ma/AG-2026-00042/1.jpg",
        rights_status: "allowed",
        publication_permission: "allowed",
      },
      {
        type: "image",
        url: "https://cdn.agence-atlas.ma/AG-2026-00042/2.jpg",
        rights_status: "allowed",
        publication_permission: "allowed",
      },
    ],
    ...overrides,
  };
}

describe("PartnerListingV2 identity", () => {
  it("keeps the same identity when price and availability change", () => {
    const before = buildPartnerListingV2Identity(listing());
    const after = buildPartnerListingV2Identity(listing({ price_amount: 1_790_000, availability_status: "reserved" }));
    assert.deepEqual(after, before);
    assert.equal(before.external_offer_id, "AG-2026-00042");
  });

  it("separates the same external id used by different partners", () => {
    const a = buildPartnerListingV2Identity(listing({ partner_id: "agency-a" }));
    const b = buildPartnerListingV2Identity(listing({ partner_id: "agency-b" }));
    assert.notEqual(a.stable_key, b.stable_key);
  });
});

describe("PartnerListingV2 validation", () => {
  it("accepts a rich valid partner listing", () => {
    assert.deepEqual(validatePartnerListingV2(listing()), { valid: true, issues: [] });
  });

  it("rejects missing stable partner listing id", () => {
    const result = validatePartnerListingV2(listing({ partner_listing_id: "" }));
    assert.equal(result.valid, false);
    assert.ok(result.issues.some((issue) => issue.code === "missing_partner_listing_id"));
  });

  it("rejects an invalid exact price", () => {
    const result = validatePartnerListingV2(listing({ price_amount: 0 }));
    assert.equal(result.valid, false);
    assert.ok(result.issues.some((issue) => issue.code === "invalid_exact_price"));
  });

  it("rejects an inverted price range", () => {
    const result = validatePartnerListingV2(listing({
      price_display_mode: "range",
      price_amount: undefined,
      price_range_min: 2_000_000,
      price_range_max: 1_500_000,
    }));
    assert.equal(result.valid, false);
    assert.ok(result.issues.some((issue) => issue.code === "invalid_price_range"));
  });

  it("rejects a public address without explicit permission", () => {
    const result = validatePartnerListingV2(listing({ address_display: "12 rue exemple", address_public_allowed: false }));
    assert.equal(result.valid, false);
    assert.ok(result.issues.some((issue) => issue.code === "private_address_exposed"));
  });

  it("rejects one-sided or out-of-range coordinates", () => {
    const missingLng = validatePartnerListingV2(listing({ longitude: undefined }));
    assert.ok(missingLng.issues.some((issue) => issue.code === "invalid_coordinates"));
    const outOfRange = validatePartnerListingV2(listing({ latitude: 95 }));
    assert.ok(outOfRange.issues.some((issue) => issue.code === "invalid_coordinates"));
  });

  it("rejects public images when media rights are not allowed", () => {
    const result = validatePartnerListingV2(listing({
      media: [{
        type: "image",
        url: "https://cdn.example.ma/1.jpg",
        rights_status: "unknown",
        publication_permission: "allowed",
      }],
    }));
    assert.equal(result.valid, false);
    assert.ok(result.issues.some((issue) => issue.code === "unauthorized_media"));
  });
});

describe("PartnerListingV2 canonical adapter", () => {
  it("maps stable identity, partner channel and lifecycle into the canonical offer", () => {
    const canonical = adaptPartnerListingV2(listing(), NOW);
    const offer = canonical.offers[0];
    assert.equal(canonical.property_id, "partner-property:agence-atlas:ag-2026-00042");
    assert.equal(offer.offer_id, "partner-offer:agence-atlas:ag-2026-00042");
    assert.equal(offer.external_offer_id, "AG-2026-00042");
    assert.equal(offer.acquisition_channel, "partner_api");
    assert.equal(offer.origin_type, "partner_api");
    assert.equal(offer.availability_status, "available");
    assert.equal(offer.updated_at_source, UPDATED_AT);
    assert.equal(offer.last_observed_at, NOW);
  });

  it("preserves exact address privately while keeping public address absent", () => {
    const canonical = adaptPartnerListingV2(listing(), NOW);
    assert.equal(canonical.facts.location.address_private?.value, "12 rue exemple, Maârif, Casablanca");
    assert.equal(canonical.facts.location.address_private?.visibility, "INTERNAL");
    assert.equal(canonical.facts.location.address_display, undefined);
  });

  it("maps rich listing facts and media rights without inventing missing data", () => {
    const canonical = adaptPartnerListingV2(listing({
      surface_habitable_m2: 102,
      construction_year: 2018,
      has_pool: false,
    }), NOW);
    assert.equal(canonical.facts.surfaces.surface_habitable_m2?.value, 102);
    assert.equal(canonical.facts.building.construction_year?.value, 2018);
    assert.equal(canonical.facts.features.has_pool?.value, false);
    assert.equal(canonical.media.length, 2);
    assert.equal(canonical.media[0].publication_permission, "allowed");
    assert.equal(canonical.media[0].rights_status, "allowed");
  });

  it("marks sold/rented/withdrawn offers inactive without changing stable identity", () => {
    for (const state of ["sold", "rented", "withdrawn"] as const) {
      const canonical = adaptPartnerListingV2(listing({ availability_status: state }), NOW);
      assert.equal(canonical.offers[0].availability_status, state);
      assert.equal(canonical.offers[0].offer_status, "inactive");
      assert.equal(canonical.offers[0].external_offer_id, "AG-2026-00042");
    }
  });
});
