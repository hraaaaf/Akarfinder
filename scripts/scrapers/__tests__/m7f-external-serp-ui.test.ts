import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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

test("search toolbar keeps the indexed total as the dominant result count", () => {
  const shell = readFileSync("components/search/LightZillowSearchShell.tsx", "utf8");
  assert.match(shell, /indexedTotalCount/);
  assert.match(shell, /const totalResultCount = indexedTotalCount == null/);
  assert.match(shell, /totalResultCount\.toLocaleString\("fr-FR"\)/);
  assert.match(shell, /setIndexedTotalCount\(payload\.total_count\)/);
});

test("external SERP distinguishes global indexed total from the visible local batch", () => {
  const section = readFileSync("components/search/ExternalIndexedResultsSection.tsx", "utf8");
  assert.doesNotMatch(section, /\$\{results\.length\} charg/);
  assert.match(section, /Résultats du web/);
  assert.match(section, /pages sources chargées/);
  assert.match(section, /GROUP_PAGE_SIZE = 15/);
  assert.match(section, /Afficher 15 suivants/);
});

test("external results render as compact multi-source logical cards", () => {
  const section = readFileSync("components/search/ExternalIndexedResultsSection.tsx", "utf8");
  const card = readFileSync("components/search/ExternalIndexedResultCard.tsx", "utf8");
  assert.match(section, /data-search-external-serp-list/);
  assert.match(section, /space-y-2\.5/);
  assert.match(card, /data-external-serp-group/);
  assert.match(card, /rounded-2xl/);
  assert.match(card, /line-clamp-2/);
  assert.match(card, /Voir les \{sourcePages\.length\} pages/);
  assert.match(card, /Ouvrir la source/);
});

test("minimal logical cards stay source-first and rich-field safe", () => {
  const card = readFileSync("components/search/ExternalIndexedResultCard.tsx", "utf8");
  assert.match(card, /result\.original_url/);
  assert.match(card, /result\.domain/);
  assert.match(card, /result\.normalized_city/);
  assert.match(card, /result\.normalized_property_type/);
  assert.match(card, /result\.normalized_intent/);
  assert.doesNotMatch(card, /result\.title/);
  assert.doesNotMatch(card, /result\.snippet/);
  assert.doesNotMatch(card, /normalized_price_mad/);
  assert.doesNotMatch(card, /normalized_surface_m2/);
  assert.doesNotMatch(card, /thumbnail_url/);
  assert.match(card, /AkarFinder indexe la page et vous renvoie vers la source originale/);
});
