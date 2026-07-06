import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAkarInfoPassportForGatewayResult,
  buildAkarInfoPassportForListing,
} from "@/lib/akarinfo/akarinfo-passport";
import type { Listing } from "@/lib/listings/types";
import type { SearchGatewayNormalizedResult } from "@/lib/search-gateway/search-gateway-types";

function createListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: "listing-test",
    title: "Appartement test",
    city: "Casablanca",
    neighborhood: "Maarif",
    price: 1200000,
    currency: "DH",
    surface_m2: 82,
    price_per_m2: 14634,
    property_type: "Appartement",
    transaction_type: "buy",
    bedrooms: 2,
    bathrooms: 2,
    freshness_label: "Récent",
    source_type: "Agence",
    reliability_label: "Informations complètes",
    reliability_score: 82,
    is_mre_friendly: false,
    description: "Test",
    image_url: "",
    reliability_explanation: "Test",
    source_name: "akarfinder",
    display_depth: "full",
    can_show_contact: true,
    ...overrides,
  };
}

test("gateway passport stays limited and references original source", () => {
  const result: SearchGatewayNormalizedResult = {
    id: "gw-1",
    title: "Appartement Casablanca",
    original_url: "https://example.com/listing",
    display_url: "example.com/listing",
    source_id: "mubawab_serper",
    source_name: "Mubawab",
    domain: "mubawab.ma",
    result_origin: "search_api",
    search_result_display_mode: "thin_indexed_result",
    source_badge: "public_indexed",
    production_allowed: true,
    can_show_result: true,
    can_show_thumbnail: false,
    can_show_contact: false,
    can_show_gallery: false,
    can_cache_thumbnail: false,
    can_download_thumbnail: false,
    primary_cta: "view_original",
    primary_cta_label: "Voir l'annonce originale",
    result_attribution_label: "Source originale",
    thumbnail_risk_accepted: false,
  };

  const passport = buildAkarInfoPassportForGatewayResult(result);

  assert.equal(passport.kind, "gateway_external");
  assert.equal(passport.information_level_label, "Aperçu limité");
  assert.equal(passport.source_original_label, "Source originale obligatoire");
  assert.equal(passport.lifestyle_summary, null);
  assert.match(passport.summary, /source originale/i);
});

test("structured listing passport exposes only qualitative lifestyle labels", () => {
  const passport = buildAkarInfoPassportForListing(createListing());
  const serialized = JSON.stringify(passport);

  assert.equal(passport.kind, "structured_internal");
  assert.equal(passport.information_level_label, "Fiche structurée");
  assert.ok(passport.lifestyle_summary);
  assert.equal(passport.lifestyle_summary?.city, "Casablanca");
  assert.match(
    passport.lifestyle_summary?.lifestyle_indicators.urban_calm ?? "",
    /Animation/i,
  );
  assert.equal(serialized.includes("value_low"), false);
  assert.equal(serialized.includes("value_median"), false);
  assert.equal(serialized.includes("value_high"), false);
  assert.equal(serialized.includes("evidence_ref"), false);
});

test("partner listing passport upgrades to enriched information level", () => {
  const passport = buildAkarInfoPassportForListing(
    createListing({
      source_name: "partner_csv",
      source_access_level: "partner_full",
    }),
  );

  assert.equal(passport.kind, "partner_authorized");
  assert.equal(passport.information_level_label, "Fiche enrichie");
  assert.equal(passport.source_type_label, "Page partenaire autorisée");
});

test("limited preview listing keeps gateway-style guardrails", () => {
  const passport = buildAkarInfoPassportForListing(
    createListing({
      source_name: "mubawab",
      display_depth: "limited_preview",
      can_show_contact: false,
    }),
  );

  assert.equal(passport.kind, "gateway_external");
  assert.equal(passport.information_level_label, "Aperçu limité");
  assert.match(passport.points_to_verify.join(" "), /source originale/i);
});
