import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import type { SearchGatewayNormalizedResult } from "../../../lib/search-gateway/search-gateway-types";
import { buildExternalSerpGroups } from "../../../lib/search/external-serp-groups";

const card = readFileSync(
  join(process.cwd(), "components", "search", "ExternalIndexedResultCard.tsx"),
  "utf8",
);
const section = readFileSync(
  join(process.cwd(), "components", "search", "ExternalIndexedResultsSection.tsx"),
  "utf8",
);

function result(
  id: string,
  domain: string,
  title: string,
): SearchGatewayNormalizedResult {
  return {
    id,
    title,
    original_url: `https://${domain}/${id}`,
    display_url: domain,
    source_id: domain,
    source_name: domain,
    domain,
    result_origin: "public_sitemap",
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
    result_attribution_label: "Résultat indexé externe",
    thumbnail_risk_accepted: false,
    normalized_city: "Casablanca",
    normalized_property_type: "Appartement",
    normalized_intent: "buy",
    quality_tier: "Q0_link_only",
    display_eligibility: "eligible_secondary",
    display_eligibility_reason: "external_minimal_index",
  };
}

describe("M7-F external SERP option B", () => {
  it("groups only strong cross-source similarities and preserves singletons", () => {
    const grouped = buildExternalSerpGroups([
      result("a", "mubawab.ma", "Appartement vente Maarif Casablanca 120 m2 1800000 DH"),
      result("b", "agenz.ma", "Appartement vente Maarif Casablanca 118 m2 1810000 DH"),
      result("c", "mubawab.ma", "Appartement vente Casablanca reference-c"),
    ]);

    assert.equal(grouped.length, 2);
    assert.equal(grouped[0].similarPossible, true);
    assert.equal(grouped[0].results.length, 2);
    assert.equal(grouped[1].similarPossible, false);
    assert.equal(grouped[1].results.length, 1);
  });

  it("does not collapse same-site resemblance into the multi-source UI", () => {
    const grouped = buildExternalSerpGroups([
      result("a", "mubawab.ma", "Appartement vente Maarif Casablanca 120 m2 1800000 DH"),
      result("b", "mubawab.ma", "Appartement vente Maarif Casablanca 118 m2 1810000 DH"),
    ]);

    assert.equal(grouped.length, 2);
    assert.ok(grouped.every((group) => group.similarPossible === false));
  });

  it("renders 15 logical results at a time and exposes cautious similarity wording", () => {
    assert.match(section, /GROUP_PAGE_SIZE = 15/);
    assert.match(section, /Afficher 15 suivants/);
    assert.match(card, /pages semblent concerner le même bien/);
    assert.match(card, /Voir les \{sourcePages\.length\} pages/);
  });

  it("keeps external cards link-first without source-content presentation", () => {
    assert.match(card, /result\.original_url/);
    assert.match(card, /result\.domain/);
    assert.match(card, /result\.normalized_city/);
    assert.match(card, /result\.normalized_property_type/);
    assert.match(card, /result\.normalized_intent/);
    assert.doesNotMatch(card, /result\.title/);
    assert.doesNotMatch(card, /result\.snippet/);
    assert.doesNotMatch(card, /thumbnail_url/);
    assert.doesNotMatch(card, /normalized_price_mad/);
    assert.doesNotMatch(card, /normalized_surface_m2/);
  });
});
