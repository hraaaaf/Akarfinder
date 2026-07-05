import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  detectQueryTransaction,
  buildQueryVariants,
  buildExpansionQueries,
} from "../../../lib/search-gateway/search-gateway-query-expansion.js";
import {
  getGatewayPageQuality,
  isStagingGatewayUrl,
  isPortalHomepageUrl,
  isBlogGatewayUrl,
  orderGatewayResultsByPageQuality,
} from "../../../lib/search-gateway/search-gateway-page-quality.js";
import { normalizeSearchGatewayResult } from "../../../lib/search-gateway/search-gateway-normalizer.js";
import { dedupeSearchGatewayResults } from "../../../lib/search-gateway/search-gateway-dedupe.js";
import { diversifySearchGatewayResults } from "../../../lib/search-gateway/search-gateway-diversify.js";
import { getEnabledSearchGatewaySources } from "../../../lib/search-gateway/search-gateway-sources.js";

const RENT_MARKERS = ["louer", "location"];
const BUY_MARKERS = ["vendre", "achat", "vente"];

describe("query expansion — transaction detection", () => {
  it("detects rent, new, land, buy", () => {
    assert.equal(detectQueryTransaction("location studio casablanca"), "rent");
    assert.equal(detectQueryTransaction("studio à louer casablanca"), "rent");
    assert.equal(detectQueryTransaction("programme neuf casablanca"), "new");
    assert.equal(detectQueryTransaction("terrain marrakech"), "land");
    assert.equal(detectQueryTransaction("appartement à vendre rabat"), "buy");
    assert.equal(detectQueryTransaction("appartement casablanca"), "buy");
  });
});

describe("query expansion — variants", () => {
  it("buy query produces sale variants", () => {
    const variants = buildQueryVariants("appartement casablanca");
    assert.ok(variants.length >= 1 && variants.length <= 2);
    assert.ok(variants.some((v) => BUY_MARKERS.some((m) => v.includes(m))));
  });

  it("rent query produces rental variants only", () => {
    const variants = buildQueryVariants("location studio casablanca");
    assert.ok(variants.length >= 1);
    for (const v of variants) {
      assert.ok(RENT_MARKERS.some((m) => v.includes(m)), `rent variant expected: ${v}`);
    }
  });

  it("new query produces new-build variants", () => {
    const variants = buildQueryVariants("programme neuf casablanca");
    assert.ok(variants.length >= 1);
    assert.ok(variants.every((v) => v.includes("neuf")));
  });

  it("land query produces sale variants keeping terrain", () => {
    const variants = buildQueryVariants("terrain marrakech");
    assert.ok(variants.length >= 1);
    assert.ok(variants.every((v) => v.includes("terrain")));
  });

  it("never mixes buy and rent intents", () => {
    const rentVariants = buildQueryVariants("location appartement rabat");
    for (const v of rentVariants) {
      assert.ok(!BUY_MARKERS.some((m) => v.includes(m)), `buy word leaked into rent variant: ${v}`);
    }
    const buyVariants = buildQueryVariants("appartement à vendre rabat");
    for (const v of buyVariants) {
      assert.ok(!RENT_MARKERS.some((m) => v.includes(m)), `rent word leaked into buy variant: ${v}`);
    }
  });

  it("caps variants at 2 and dedupes against the original query", () => {
    const variants = buildQueryVariants("appartement à vendre casablanca");
    assert.ok(variants.length <= 2);
    assert.ok(!variants.includes("appartement à vendre casablanca"));
  });
});

describe("query expansion — backfill round", () => {
  const sources = getEnabledSearchGatewaySources();

  it("builds at most one expansion query per source, capped", () => {
    const queries = buildExpansionQueries("appartement casablanca", sources, new Set(), 10);
    assert.ok(queries.length <= 6);
    const bySource = new Set(queries.map((q) => q.source_id));
    assert.equal(bySource.size, queries.length);
    for (const q of queries) {
      assert.ok(q.query.startsWith("site:"));
      assert.equal(q.max_results, 10);
    }
  });

  it("skips queries already used by the primary round", () => {
    const first = buildExpansionQueries("villa rabat", sources, new Set(), 10);
    const used = new Set(first.map((q) => q.query));
    const second = buildExpansionQueries("villa rabat", sources, used, 10);
    assert.equal(second.length, 0);
  });

  it("returns nothing for an empty query", () => {
    assert.deepEqual(buildExpansionQueries("", sources, new Set(), 10), []);
  });
});

describe("page quality — rejections", () => {
  it("rejects third-party staging URLs", () => {
    assert.equal(isStagingGatewayUrl("https://stage-v1.yakeey.com/fr-ma/location/appartement/tanger"), true);
    assert.equal(isStagingGatewayUrl("https://staging.avito.ma/annonce"), true);
    assert.equal(isStagingGatewayUrl("https://www.yakeey.com/fr-ma/achat/villa/rabat"), false);
  });

  it("rejects portal homepages", () => {
    assert.equal(isPortalHomepageUrl("https://www.logic-immo.ma/"), true);
    assert.equal(isPortalHomepageUrl("https://www.sarouty.ma/"), true);
    assert.equal(isPortalHomepageUrl("https://yakeey.com/fr-ma"), true);
    assert.equal(isPortalHomepageUrl("https://www.avito.ma/fr/rabat/villa--%C3%A0_vendre"), false);
  });

  it("rejects blog articles", () => {
    assert.equal(isBlogGatewayUrl("https://www.sarouty.ma/blog/investir-a-marrakech/"), true);
    assert.equal(isBlogGatewayUrl("https://www.sarouty.ma/louer/rabat/appartements-a-louer/"), false);
  });

  it("classifies price-reference pages as weak, listings as individual", () => {
    assert.equal(
      getGatewayPageQuality("Carte des prix de l'immobilier à Agadir", "https://yakeey.com/fr-ma/referentiel-de-prix-immobilier/agadir"),
      "weak",
    );
    assert.equal(
      getGatewayPageQuality("Appartement 95 m² à louer à Casablanca", "https://yakeey.com/louer-appartement-casablanca-ain-diab-ia189157"),
      "individual",
    );
    assert.equal(
      getGatewayPageQuality("Appartements à louer à Rabat - Sarouty.ma", "https://www.sarouty.ma/louer/rabat/appartements-a-louer/"),
      "category",
    );
  });

  it("orders weak pages last and drops rejected pages", () => {
    const items = [
      { title: "Carte des prix de l'immobilier à Fès", original_url: "https://yakeey.com/fr-ma/referentiel-de-prix-immobilier/fes" },
      { title: "Accueil - Logic Immo", original_url: "https://www.logic-immo.ma/" },
      { title: "Appartements à louer à Rabat", original_url: "https://www.sarouty.ma/louer/rabat/appartements-a-louer/" },
      { title: "2 Appartements en location à Tanger", original_url: "https://stage-v1.yakeey.com/fr-ma/location/appartement/tanger" },
      { title: "Appartement 90 m² à louer à Agadir", original_url: "https://yakeey.com/fr-ma/louer-appartement-agadir-AI167012" },
    ];
    const ordered = orderGatewayResultsByPageQuality(items);
    assert.equal(ordered.length, 3);
    assert.equal(ordered[ordered.length - 1].original_url.includes("referentiel-de-prix"), true);
    assert.ok(!ordered.some((r) => r.original_url.includes("stage-v1")));
    assert.ok(!ordered.some((r) => r.original_url === "https://www.logic-immo.ma/"));
  });
});

describe("gateway doctrine — unchanged", () => {
  it("normalized results never allow contact or gallery", () => {
    const normalized = normalizeSearchGatewayResult(
      {
        title: "Appartement à vendre à Casablanca Maârif",
        link: "https://www.avito.ma/fr/casablanca/appartement-a-vendre-123.htm",
        snippet: "Bel appartement 90 m2",
      },
      "avito_serper",
    );
    assert.ok(normalized);
    assert.equal(normalized.can_show_contact, false);
    assert.equal(normalized.can_show_gallery, false);
    assert.equal(normalized.primary_cta, "view_original");
    assert.equal(normalized.result_attribution_label, "Résultat web externe");
  });

  it("dedupe still removes exact URL duplicates across rounds", () => {
    const make = (id: string) => ({
      id,
      title: "Appartement à vendre à Casablanca",
      snippet: "",
      original_url: "https://www.avito.ma/fr/casablanca/appartement-1.htm",
      display_url: "avito.ma/fr/casablanca/appartement-1.htm",
      source_id: "avito_serper",
      source_name: "Avito",
      domain: "avito.ma",
      result_origin: "search_api" as const,
      search_result_display_mode: "thin_indexed_result",
      source_badge: "external_indexed",
      production_allowed: true,
      can_show_result: true,
      can_show_thumbnail: false,
      can_show_contact: false,
      can_show_gallery: false,
      can_cache_thumbnail: false as const,
      can_download_thumbnail: false as const,
      primary_cta: "view_original" as const,
      primary_cta_label: "Voir sur Avito",
      result_attribution_label: "Résultat web externe",
      thumbnail_risk_accepted: true,
    });
    const other = { ...make("b"), original_url: "https://www.sarouty.ma/louer/rabat/x/", source_id: "sarouty_serper", source_name: "Sarouty", domain: "sarouty.ma", title: "Autre annonce Rabat" };
    const deduped = dedupeSearchGatewayResults([make("a"), make("b"), other]);
    assert.equal(deduped.length, 2);
  });

  it("source diversification still interleaves sources", () => {
    const item = (source: string, n: number) => ({ source_id: source, n });
    const diversified = diversifySearchGatewayResults(
      [item("a", 1), item("a", 2), item("a", 3), item("b", 1), item("b", 2)],
      1,
    );
    for (let i = 1; i < diversified.length - 1; i++) {
      if (diversified[i].source_id === diversified[i - 1].source_id) {
        // allowed only when the other source is exhausted (tail)
        assert.ok(i >= 3, "premature same-source run");
      }
    }
  });
});
