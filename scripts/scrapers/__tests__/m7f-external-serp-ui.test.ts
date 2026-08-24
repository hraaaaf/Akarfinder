import assert from "node:assert/strict";
import test from "node:test";
import {
  buildExternalResultPresentation,
  isExternalMinimalResult,
} from "../../../lib/search/external-result-presentation";
import type { SearchGatewayNormalizedResult } from "../../../lib/search-gateway/search-gateway-types";

function makeResult(overrides: Partial<SearchGatewayNormalizedResult> = {}): SearchGatewayNormalizedResult {
  return {
    id: "result-1",
    title: "Annonce immobilière · Appartement · Casablanca",
    snippet: "Contenu source qui ne doit pas être affiché",
    original_url: "https://example.ma/annonce/1",
    display_url: "example.ma/annonce/1",
    source_id: "example",
    source_name: "Example",
    domain: "example.ma",
    result_origin: "search_api",
    search_result_display_mode: "thin_indexed_result",
    source_badge: "external_indexed",
    production_allowed: true,
    can_show_result: true,
    can_show_thumbnail: false,
    can_show_contact: false,
    can_show_gallery: false,
    can_cache_thumbnail: false,
    can_download_thumbnail: false,
    primary_cta: "view_original",
    primary_cta_label: "Voir la source originale",
    result_attribution_label: "Source externe",
    thumbnail_risk_accepted: false,
    normalized_city: "Casablanca",
    normalized_property_type: "apartment",
    normalized_intent: "sale",
    normalized_price_mad: 2_150_000,
    normalized_surface_m2: 102,
    price_per_m2_mad: 21_078,
    quality_tier: "Q0_link_only",
    display_eligibility: "eligible_primary",
    display_eligibility_reason: "external_minimal_index",
    ...overrides,
  };
}

test("external minimal presentation strips every rich source field", () => {
  const result = makeResult();
  const presentation = buildExternalResultPresentation(result);

  assert.equal(isExternalMinimalResult(result), true);
  assert.equal(presentation.isMinimal, true);
  assert.equal(presentation.title, "Annonce immobilière · Appartement · Casablanca");
  assert.equal(presentation.sourceHost, "example.ma");
  assert.equal(presentation.city, "Casablanca");
  assert.equal(presentation.propertyType, "Appartement");
  assert.equal(presentation.intentLabel, "Vente");
  assert.equal(presentation.snippet, null);
  assert.equal(presentation.priceMad, null);
  assert.equal(presentation.surfaceM2, null);
  assert.equal(presentation.pricePerM2Mad, null);
});

test("Q0 link-only remains fail-closed even without the explicit display reason", () => {
  const presentation = buildExternalResultPresentation(
    makeResult({ display_eligibility_reason: "legacy_reason", quality_tier: "Q0_link_only" }),
  );

  assert.equal(presentation.isMinimal, true);
  assert.equal(presentation.snippet, null);
  assert.equal(presentation.priceMad, null);
  assert.equal(presentation.surfaceM2, null);
});

test("authorized richer presentation may keep fields supplied by the serving contract", () => {
  const presentation = buildExternalResultPresentation(
    makeResult({
      quality_tier: "Q2_comparable",
      display_eligibility_reason: "authorized_partner_content",
    }),
  );

  assert.equal(presentation.isMinimal, false);
  assert.equal(presentation.snippet, "Contenu source qui ne doit pas être affiché");
  assert.equal(presentation.priceMad, 2_150_000);
  assert.equal(presentation.surfaceM2, 102);
  assert.equal(presentation.pricePerM2Mad, 21_078);
});

test("visible labels scrub direct contact transport markers", () => {
  const presentation = buildExternalResultPresentation(
    makeResult({ title: "Appartement whatsapp à Casablanca", display_url: "tel:example.ma/1" }),
  );

  assert.equal(presentation.title.includes("whatsapp"), false);
  assert.equal(presentation.displayUrl?.includes("tel:"), false);
});
