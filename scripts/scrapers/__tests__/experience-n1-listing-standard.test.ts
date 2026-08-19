import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Listing } from "../../../lib/listings/types";
import {
  buildListingGeoContractV1,
  buildListingQualityContractV1,
  buildListingSourceContractV1,
  buildListingStandardV1,
} from "../../../lib/listings/listing-standard-v1";
import { buildPublicPropertyDetailV2 } from "../../../lib/property-detail/public-property-detail-v2";
import { getSourceAccessType } from "../../../lib/sources/source-access-registry";

function listing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: "listing-1",
    title: "Appartement à Rabat",
    city: "Rabat",
    neighborhood: "Agdal",
    price: 2_000_000,
    currency: "DH",
    surface_m2: 100,
    price_per_m2: 20_000,
    property_type: "Appartement",
    transaction_type: "buy",
    bedrooms: 2,
    bathrooms: 1,
    freshness_label: "Mise à jour récente",
    source_type: "Source analysée",
    reliability_label: "Infos limitées",
    reliability_score: 72,
    reliability_available: true,
    is_mre_friendly: false,
    description: "Appartement structuré pour le test de contrat.",
    image_url: "",
    reliability_explanation: "Test",
    data_completeness_score: 64,
    ...overrides,
  };
}

describe("AkarFinder Experience N1 — Listing Standard", () => {
  it("uses a stable owner source id without turning the public label into an authorization key", () => {
    assert.equal(getSourceAccessType("owner_declared"), "first_party");
    assert.equal(getSourceAccessType("Propriétaire"), "third_party_legacy");

    const owner = listing({
      source_name: "Propriétaire",
      source_badge: "owner_published",
      result_origin: "owner_declared",
      can_show_result: true,
      production_allowed: true,
      can_show_gallery: true,
    });

    const source = buildListingSourceContractV1(owner);
    assert.equal(source.source_key, "owner_declared");
    assert.equal(source.source_access_type, "first_party");
    assert.equal(source.actor_type, "owner");
    assert.equal(source.internal_detail_allowed, true);
    assert.equal(source.display_depth, "full_internal");
  });

  it("builds an owner detail through source_id while preserving the public label", () => {
    const owner = listing({
      source_name: "Propriétaire",
      source_badge: "owner_published",
      result_origin: "owner_declared",
      can_show_result: true,
      production_allowed: true,
    });

    const rejectedWithoutStableId = buildPublicPropertyDetailV2(owner, {
      source_name: "Propriétaire",
      actor_type: "owner",
      observed_at: "2026-08-19T18:00:00.000Z",
    });
    assert.equal(rejectedWithoutStableId, null);

    const detail = buildPublicPropertyDetailV2(owner, {
      source_id: "owner_declared",
      source_name: "Propriétaire",
      actor_type: "owner",
      observed_at: "2026-08-19T18:00:00.000Z",
    });
    assert.ok(detail);
    assert.equal(detail.provenance.source_id, "owner_declared");
    assert.equal(detail.provenance.source_name, "Propriétaire");
    assert.equal(detail.provenance.source_access_type, "first_party");
    assert.equal(detail.provenance.actor_type, "owner");
    assert.equal(detail.provenance.fact_provenance_label, "Déclaré par le propriétaire");
  });

  it("keeps external and benchmark sources out of internal detail depth", () => {
    const external = buildListingSourceContractV1(listing({
      source_name: "Mubawab",
      can_show_result: true,
      production_allowed: true,
      original_source_required: true,
    }));
    assert.equal(external.source_access_type, "third_party_legacy");
    assert.equal(external.actor_type, "external_source");
    assert.equal(external.internal_detail_allowed, false);
    assert.equal(external.display_depth, "limited_preview");
    assert.equal(external.original_source_required, true);

    const benchmark = buildListingSourceContractV1(listing({ source_name: "Yakeey" }));
    assert.equal(benchmark.source_access_type, "benchmark_source");
    assert.equal(benchmark.actor_type, "benchmark");
    assert.equal(benchmark.display_depth, "market_signal_only");
    assert.equal(benchmark.internal_detail_allowed, false);
    assert.equal(benchmark.search_result_allowed, false);
  });

  it("never makes an individual pin from approximate or coordinate-less geography", () => {
    const districtOnly = buildListingGeoContractV1(listing({
      geo_precision: undefined,
      latitude: undefined,
      longitude: undefined,
      city: "Casablanca",
      neighborhood: "Maârif",
      district: "Maârif",
    }));
    assert.equal(districtOnly.precision, "neighborhood_centroid");
    assert.equal(districtOnly.precision_explicit, false);
    assert.equal(districtOnly.map_scope, "district");
    assert.equal(districtOnly.pin_eligible, false);

    const cityOnly = buildListingGeoContractV1(listing({
      geo_precision: undefined,
      latitude: undefined,
      longitude: undefined,
      city: "Fès",
      neighborhood: "",
      district: undefined,
    }));
    assert.equal(cityOnly.precision, "city_centroid");
    assert.equal(cityOnly.map_scope, "city");
    assert.equal(cityOnly.pin_eligible, false);

    const exactWithoutCoordinates = buildListingGeoContractV1(listing({
      geo_precision: "exact",
      latitude: undefined,
      longitude: undefined,
    }));
    assert.equal(exactWithoutCoordinates.precision, "exact");
    assert.equal(exactWithoutCoordinates.pin_eligible, false);

    const exact = buildListingGeoContractV1(listing({
      geo_precision: "exact",
      latitude: 34.0209,
      longitude: -6.8416,
    }));
    assert.equal(exact.has_coordinates, true);
    assert.equal(exact.pin_eligible, true);
    assert.equal(exact.map_scope, "exact");
  });

  it("keeps completeness and confidence as separate measurements", () => {
    const quality = buildListingQualityContractV1(listing({
      data_completeness_score: 92,
      reliability_score: 41,
      reliability_badge: "Confiance limitée",
    }));
    assert.equal(quality.completeness_score, 92);
    assert.equal(quality.completeness_label, "Informations très détaillées");
    assert.equal(quality.confidence_score, 41);
    assert.equal(quality.confidence_label, "Confiance limitée");
    assert.equal(quality.measured_separately, true);
  });

  it("projects source, geo and quality into one additive standard contract", () => {
    const standard = buildListingStandardV1(listing({
      source_name: "AkarFinder",
      geo_precision: "exact",
      latitude: 33.5731,
      longitude: -7.5898,
      data_completeness_score: 80,
      reliability_score: 88,
    }));
    assert.equal(standard.version, "1.0");
    assert.equal(standard.source.source_access_type, "first_party");
    assert.equal(standard.geo.pin_eligible, true);
    assert.equal(standard.quality.completeness_score, 80);
    assert.equal(standard.quality.confidence_score, 88);
  });
});
