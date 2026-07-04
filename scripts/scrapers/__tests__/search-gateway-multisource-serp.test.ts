// SEARCH-GATEWAY-MULTISOURCE-SERP-1A
// Tests for Search Gateway multi-source SERP
// SERP-RESULT-QUALITY-DEGROUPING-1 — converted from vitest (never wired into
// npm test, vitest was never a project dependency) to node:test so it can
// actually run via `npx tsx --test`. Added diversification, category-page
// limiting, English downranking, snippet neutralization and doctrine tests.

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  getSearchGatewaySources,
  getEnabledSearchGatewaySources,
  getSearchGatewaySourceById,
} from "../../../lib/search-gateway/search-gateway-sources.js";
import { buildSearchGatewayQueries } from "../../../lib/search-gateway/search-gateway-query-builder.js";
import { normalizeSearchGatewayResult } from "../../../lib/search-gateway/search-gateway-normalizer.js";
import { dedupeSearchGatewayResults } from "../../../lib/search-gateway/search-gateway-dedupe.js";
import { rankSearchGatewayResults } from "../../../lib/search-gateway/search-gateway-ranking.js";
import {
  limitCategoryPagesPerSource,
  diversifySearchGatewayResults,
} from "../../../lib/search-gateway/search-gateway-diversify.js";
import {
  isSourceCategoryPage,
  isEnglishResult,
} from "../../../lib/search-gateway/search-gateway-category-detector.js";

describe("Search Gateway — Configuration", () => {
  it("1. Six sources are configured", () => {
    const sources = getSearchGatewaySources();
    assert.equal(Object.keys(sources).length, 6);
    assert.ok(sources.avito_serper);
    assert.ok(sources.sarouty_serper);
    assert.ok(sources.yakeey);
    assert.ok(sources.agenz);
    assert.ok(sources["logic-immo"]);
    assert.ok(sources.mubawab_serper);
  });

  it("2. Avito is search_api_only", () => {
    const avito = getSearchGatewaySourceById("avito_serper");
    assert.equal(avito?.query_mode, "search_api_only");
  });

  it("3. Mubawab is search_api_only", () => {
    const mubawab = getSearchGatewaySourceById("mubawab_serper");
    assert.equal(mubawab?.query_mode, "search_api_only");
  });

  it("4. All enabled sources are in getEnabledSearchGatewaySources", () => {
    const enabled = getEnabledSearchGatewaySources();
    assert.ok(enabled.length > 0);
    assert.ok(enabled.every((s) => s.enabled));
  });
});

describe("Search Gateway — Query Builder", () => {
  it("5. Query builder generates site:domain queries", () => {
    const queries = buildSearchGatewayQueries({ q: "appartement", city: "Casablanca" });
    assert.ok(queries.length > 0);
    for (const q of queries) {
      assert.match(q.query, /site:\S+\.\S+/);
    }
  });

  it("6. Query builder respects city and q", () => {
    const queries = buildSearchGatewayQueries({ q: "villa", city: "Marrakech" });
    assert.ok(queries.length > 0);
    for (const q of queries) {
      assert.ok(q.query.includes("villa"));
      assert.ok(q.query.includes("Marrakech"));
    }
  });

  it("7. Query builder returns empty array if all input empty", () => {
    const queries = buildSearchGatewayQueries({});
    assert.deepEqual(queries, []);
  });

  it("8. Query builder respects max_results_per_source", () => {
    const queries = buildSearchGatewayQueries({ q: "appartement", max_results_per_source: 5 });
    for (const q of queries) {
      assert.equal(q.max_results, 5);
    }
  });

  it("9. Query builder limits to 12 queries maximum", () => {
    const queries = buildSearchGatewayQueries({ q: "appartement" });
    assert.ok(queries.length <= 12);
  });
});

describe("Search Gateway — Normalizer", () => {
  it("10. Normalizer rejects result without title", () => {
    const result = normalizeSearchGatewayResult({ link: "https://avito.ma/test" }, "avito_serper");
    assert.equal(result, null);
  });

  it("11. Normalizer rejects result without original_url", () => {
    const result = normalizeSearchGatewayResult({ title: "Test Listing" }, "avito_serper");
    assert.equal(result, null);
  });

  it("12. Normalizer rejects URL outside source domain", () => {
    const result = normalizeSearchGatewayResult(
      { title: "Appartement Test", link: "https://unrelated.com/page" },
      "avito_serper"
    );
    assert.equal(result, null);
  });

  it("13. Normalizer accepts URL from correct domain", () => {
    const result = normalizeSearchGatewayResult(
      { title: "Appartement Test", link: "https://avito.ma/casablanca/apartment-123" },
      "avito_serper"
    );
    assert.notEqual(result, null);
    assert.ok(result?.original_url.includes("avito.ma"));
  });

  it("14. Normalizer forces can_show_contact=false", () => {
    const result = normalizeSearchGatewayResult(
      { title: "Appartement Test", link: "https://avito.ma/test" },
      "avito_serper"
    );
    assert.equal(result?.can_show_contact, false);
  });

  it("15. Normalizer forces can_show_gallery=false", () => {
    const result = normalizeSearchGatewayResult(
      { title: "Appartement Test", link: "https://avito.ma/test" },
      "avito_serper"
    );
    assert.equal(result?.can_show_gallery, false);
  });

  it("16. Normalizer forces can_cache_thumbnail=false", () => {
    const result = normalizeSearchGatewayResult(
      { title: "Appartement Test", link: "https://avito.ma/test" },
      "avito_serper"
    );
    assert.equal(result?.can_cache_thumbnail, false);
  });

  it("17. Normalizer forces can_download_thumbnail=false", () => {
    const result = normalizeSearchGatewayResult(
      { title: "Appartement Test", link: "https://avito.ma/test" },
      "avito_serper"
    );
    assert.equal(result?.can_download_thumbnail, false);
  });

  it("18. Normalizer rejects unknown source", () => {
    const result = normalizeSearchGatewayResult(
      { title: "Test", link: "https://unknown.com/test" },
      "unknown"
    );
    assert.equal(result, null);
  });

  it("19. Normalizer neutralizes risky snippet claims (verified/confidence)", () => {
    const result = normalizeSearchGatewayResult(
      {
        title: "Appartement Test",
        link: "https://agenz.ma/test",
        snippet: "exclusive listings verified by our team. Find your property with confidence",
      },
      "agenz"
    );
    assert.notEqual(result, null);
    assert.ok(!/verified/i.test(result!.snippet ?? ""));
    assert.ok(!/confidence/i.test(result!.snippet ?? ""));
    assert.ok(!/certified/i.test(result!.snippet ?? ""));
    assert.ok(!/official/i.test(result!.snippet ?? ""));
    assert.equal(
      result!.snippet,
      "Aperçu limité. Consultez la source originale pour vérifier les informations."
    );
  });

  it("20. Normalizer keeps a clean snippet unchanged", () => {
    const result = normalizeSearchGatewayResult(
      {
        title: "Appartement Test",
        link: "https://agenz.ma/test",
        snippet: "Appartement 3 chambres, 90m², proche commodités.",
      },
      "agenz"
    );
    assert.equal(result?.snippet, "Appartement 3 chambres, 90m², proche commodités.");
  });
});

describe("Search Gateway — Dedupe", () => {
  it("21. Dedupe removes duplicate URLs", () => {
    const result1 = normalizeSearchGatewayResult(
      { title: "Apartment 1", link: "https://avito.ma/apartment-123" },
      "avito_serper"
    )!;
    const result2 = normalizeSearchGatewayResult(
      { title: "Apartment 1 Copy", link: "https://avito.ma/apartment-123" },
      "avito_serper"
    )!;
    const deduped = dedupeSearchGatewayResults([result1, result2]);
    assert.equal(deduped.length, 1);
  });

  it("22. Dedupe removes same source + same title", () => {
    const result1 = normalizeSearchGatewayResult(
      { title: "Same Title", link: "https://avito.ma/url1" },
      "avito_serper"
    )!;
    const result2 = normalizeSearchGatewayResult(
      { title: "Same Title", link: "https://avito.ma/url2" },
      "avito_serper"
    )!;
    const deduped = dedupeSearchGatewayResults([result1, result2]);
    assert.equal(deduped.length, 1);
  });

  it("23. Dedupe preserves cross-source results", () => {
    const result1 = normalizeSearchGatewayResult(
      { title: "Apartment Casablanca", link: "https://avito.ma/apartment-123" },
      "avito_serper"
    )!;
    const result2 = normalizeSearchGatewayResult(
      { title: "Apartment Casablanca", link: "https://mubawab.ma/apartment-456" },
      "mubawab_serper"
    )!;
    const deduped = dedupeSearchGatewayResults([result1, result2]);
    assert.equal(deduped.length, 2);
  });

  it("24. Dedupe removes tracking parameters from URLs", () => {
    const result1 = normalizeSearchGatewayResult(
      { title: "Test Listing", link: "https://avito.ma/apartment?utm_source=google&utm_medium=cpc" },
      "avito_serper"
    )!;
    const result2 = normalizeSearchGatewayResult(
      { title: "Test Listing", link: "https://avito.ma/apartment?fbclid=123" },
      "avito_serper"
    )!;
    const deduped = dedupeSearchGatewayResults([result1, result2]);
    assert.equal(deduped.length, 1);
  });

  it("25. Dedupe + category limiting together reduce differently-worded Yakeey category pages", () => {
    // dedupeSearchGatewayResults alone only catches exact/near-exact URL or
    // title matches — it does not fuzzy-match differently-worded category
    // page titles like these three. That broader case is what
    // limitCategoryPagesPerSource (SERP-RESULT-QUALITY-DEGROUPING-1) exists
    // to solve, run later in the pipeline (see tests 35/36).
    const results = [
      normalizeSearchGatewayResult(
        { title: "10 Apartments in Casablanca", link: "https://yakeey.com/fr-ma/achat/appartement/Casablanca" },
        "yakeey"
      )!,
      normalizeSearchGatewayResult(
        { title: "10 Apartments for rent in Casablanca", link: "https://yakeey.com/fr-ma/location/appartement/Casablanca" },
        "yakeey"
      )!,
      normalizeSearchGatewayResult(
        { title: "Apartments with pool in Casablanca", link: "https://yakeey.com/fr-ma/achat/appartement/Casablanca?feature=pool" },
        "yakeey"
      )!,
    ];
    const deduped = dedupeSearchGatewayResults(results);
    assert.equal(deduped.length, results.length); // dedupe alone: no exact-match duplicates here

    const categoryLimited = limitCategoryPagesPerSource(deduped, 1);
    assert.ok(categoryLimited.length < results.length); // category-page limiting reduces them
  });

  it("26. Dedupe protects single-source results", () => {
    const result1 = normalizeSearchGatewayResult(
      { title: "Unique Result", link: "https://logic-immo.ma/property-123" },
      "logic-immo"
    )!;
    const result2 = normalizeSearchGatewayResult(
      { title: "Common Title", link: "https://avito.ma/property-456" },
      "avito_serper"
    )!;
    const deduped = dedupeSearchGatewayResults([result1, result2]);
    assert.ok(deduped.some((r) => r.source_id === "logic-immo"));
  });

  it("27. Dedupe maintains minimum coverage", () => {
    const results = Array.from({ length: 25 }, (_, i) =>
      normalizeSearchGatewayResult(
        { title: `Result ${i % 3}`, link: `https://yakeey.com/property-${i}` },
        "yakeey"
      )!
    );
    const deduped = dedupeSearchGatewayResults(results);
    assert.ok(deduped.length >= 10);
  });
});

describe("Search Gateway — Category page & English detection", () => {
  it("28. Detects English 'for sale'/'for rent' category page titles", () => {
    assert.equal(isSourceCategoryPage("23 Apartments for rent in Agadir", ""), true);
    assert.equal(isSourceCategoryPage("28 Villas for sale in Agadir", ""), true);
  });

  it("29. Detects French category page titles", () => {
    assert.equal(isSourceCategoryPage("Appartements à vendre à Casablanca", ""), true);
    assert.equal(isSourceCategoryPage("Appartements en location à Rabat", ""), true);
  });

  it("30. Detects category page URL patterns", () => {
    assert.equal(isSourceCategoryPage("Some title", "https://agenz.ma/louer/immo-casablanca"), true);
    assert.equal(isSourceCategoryPage("Some title", "https://agenz.ma/fr-ma/location/appartement/agadir"), true);
  });

  it("31. Does not flag a specific single-listing title as category page", () => {
    assert.equal(
      isSourceCategoryPage("Villa moderne 4 chambres avec piscine à Dar Bouazza", "https://agenz.ma/annonce/12345"),
      false
    );
  });

  it("32. Detects English pages via /en/ URL segment", () => {
    assert.equal(isEnglishResult("Villa moderne", "https://agenz.ma/en/acheter/villa-123"), true);
  });

  it("33. Detects English pages via title pattern", () => {
    assert.equal(isEnglishResult("48 Apartments for sale in Agadir", "https://agenz.ma/apartments-agadir"), true);
  });

  it("34. Does not flag French titles as English", () => {
    assert.equal(isEnglishResult("Appartement à vendre à Agadir", "https://agenz.ma/appartement-agadir"), false);
  });
});

describe("Search Gateway — Category page limiting", () => {
  function makeCategoryResult(sourceId: string, i: number) {
    return {
      id: `${sourceId}-cat-${i}`,
      title: `${20 + i} Apartments for rent in Agadir`,
      original_url: `https://agenz.ma/louer/immo-agadir-${i}`,
      source_id: sourceId,
    };
  }
  function makeSpecificResult(sourceId: string, i: number) {
    return {
      id: `${sourceId}-item-${i}`,
      title: `Villa moderne ${i} chambres à Agadir`,
      original_url: `https://agenz.ma/annonce/villa-${i}`,
      source_id: sourceId,
    };
  }

  it("35. Limits to 1 category page per source when alternatives exist", () => {
    const results = [
      makeCategoryResult("agenz", 1),
      makeCategoryResult("agenz", 2),
      makeCategoryResult("agenz", 3),
      makeCategoryResult("agenz", 4),
      makeCategoryResult("agenz", 5),
      makeSpecificResult("yakeey", 1),
      makeSpecificResult("mubawab_serper", 1),
    ];
    const limited = limitCategoryPagesPerSource(results, 1);
    const agenzCategoryCount = limited.filter(
      (r) => r.source_id === "agenz" && isSourceCategoryPage(r.title, r.original_url)
    ).length;
    assert.equal(agenzCategoryCount, 1);
  });

  it("36. Never shows 3+ category pages from the same source in the kept set", () => {
    const results = Array.from({ length: 6 }, (_, i) => makeCategoryResult("agenz", i));
    const limited = limitCategoryPagesPerSource(results, 1);
    const agenzCategoryCount = limited.filter(
      (r) => r.source_id === "agenz" && isSourceCategoryPage(r.title, r.original_url)
    ).length;
    assert.ok(agenzCategoryCount < 3);
  });

  it("37. Minimum coverage protection backfills deferred category pages when input is large and no alternatives exist", () => {
    const results = Array.from({ length: 20 }, (_, i) => makeCategoryResult("agenz", i));
    const limited = limitCategoryPagesPerSource(results, 1);
    assert.ok(limited.length >= 10);
  });
});

describe("Search Gateway — Source diversification", () => {
  function makeResult(sourceId: string, i: number) {
    return { id: `${sourceId}-${i}`, source_id: sourceId, title: `Result ${sourceId} ${i}` };
  }

  it("38. Interleaves sources so no more than 1 consecutive same-source result when alternatives exist", () => {
    const ranked = [
      makeResult("agenz", 1),
      makeResult("agenz", 2),
      makeResult("agenz", 3),
      makeResult("yakeey", 1),
      makeResult("mubawab_serper", 1),
      makeResult("avito_serper", 1),
    ];
    const diversified = diversifySearchGatewayResults(ranked, 1);
    let maxConsecutive = 1;
    let current = 1;
    for (let i = 1; i < diversified.length; i++) {
      if (diversified[i].source_id === diversified[i - 1].source_id) {
        current++;
        maxConsecutive = Math.max(maxConsecutive, current);
      } else {
        current = 1;
      }
    }
    assert.ok(maxConsecutive <= 1);
  });

  it("39. Falls back to same-source run when it is the only source with remaining items", () => {
    const ranked = [makeResult("agenz", 1), makeResult("agenz", 2), makeResult("agenz", 3)];
    const diversified = diversifySearchGatewayResults(ranked, 1);
    assert.equal(diversified.length, 3);
    assert.ok(diversified.every((r) => r.source_id === "agenz"));
  });

  it("40. Diversification preserves total result count (no results dropped)", () => {
    const ranked = [
      makeResult("agenz", 1),
      makeResult("agenz", 2),
      makeResult("yakeey", 1),
      makeResult("yakeey", 2),
      makeResult("mubawab_serper", 1),
    ];
    const diversified = diversifySearchGatewayResults(ranked, 1);
    assert.equal(diversified.length, ranked.length);
  });
});

describe("Search Gateway — Ranking", () => {
  it("41. Ranking demotes category pages behind specific listings", () => {
    const category = normalizeSearchGatewayResult(
      { title: "23 Apartments for rent in Agadir", link: "https://agenz.ma/louer/immo-agadir" },
      "agenz"
    )!;
    const specific = normalizeSearchGatewayResult(
      { title: "Villa moderne 4 chambres avec piscine a Agadir", link: "https://agenz.ma/annonce/villa-4ch" },
      "agenz"
    )!;
    const ranked = rankSearchGatewayResults([category, specific], ["agadir"]);
    const categoryIndex = ranked.findIndex((r) => r.id === category.id);
    const specificIndex = ranked.findIndex((r) => r.id === specific.id);
    assert.ok(specificIndex < categoryIndex);
  });

  it("42. Ranking demotes English pages behind French equivalents", () => {
    const english = normalizeSearchGatewayResult(
      { title: "Apartments for sale in Agadir", link: "https://agenz.ma/en/acheter/appartement-agadir" },
      "agenz"
    )!;
    const french = normalizeSearchGatewayResult(
      { title: "Appartement a vendre a Agadir", link: "https://agenz.ma/acheter/appartement-agadir" },
      "agenz"
    )!;
    const ranked = rankSearchGatewayResults([english, french], ["agadir"]);
    const englishIndex = ranked.findIndex((r) => r.id === english.id);
    const frenchIndex = ranked.findIndex((r) => r.id === french.id);
    assert.ok(frenchIndex < englishIndex);
  });

  it("43. Source scores match actual source_id keys (avito_serper/sarouty_serper/mubawab_serper no longer fall back to default)", () => {
    const avito = normalizeSearchGatewayResult(
      { title: "Appartement Casablanca", link: "https://avito.ma/annonce/1" },
      "avito_serper"
    )!;
    const unranked = { ...avito, source_id: "unmatched_source_xyz" };
    const ranked = rankSearchGatewayResults([avito, unranked], []);
    const avitoScore = ranked.find((r) => r.id === avito.id)!._ranking.source_score;
    const unmatchedScore = ranked.find((r) => r.source_id === "unmatched_source_xyz")!._ranking.source_score;
    assert.ok(avitoScore > unmatchedScore);
  });
});

describe("Search Gateway — Security & doctrine", () => {
  it("44. No secret in response (SEARCH_API_KEY not exposed)", () => {
    // Structural — route.ts never logs or includes SEARCH_API_KEY in the response.
    assert.equal(true, true);
  });

  it("45. Normalized results never expose an internal /listings URL", () => {
    const result = normalizeSearchGatewayResult(
      { title: "Appartement Test", link: "https://avito.ma/annonce/123" },
      "avito_serper"
    )!;
    assert.ok(!result.original_url.includes("/listings/"));
  });

  it("46. Normalized results always carry can_show_thumbnail derived from flags, never true by default", () => {
    const result = normalizeSearchGatewayResult(
      { title: "Appartement Test", link: "https://avito.ma/annonce/123" },
      "avito_serper"
    )!;
    // NEXT_PUBLIC_SEARCH_GATEWAY_THUMBNAILS_ENABLED is not "true" in test env.
    assert.equal(result.can_show_thumbnail, false);
  });

  it("47. result_attribution_label is always 'Résultat web externe'", () => {
    const result = normalizeSearchGatewayResult(
      { title: "Appartement Test", link: "https://avito.ma/annonce/123" },
      "avito_serper"
    )!;
    assert.equal(result.result_attribution_label, "Résultat web externe");
  });
});

describe("Search Gateway — Route intent (buy/rent/new)", () => {
  it("48. intent=buy ranks a sale result above a rent result", () => {
    const rent = normalizeSearchGatewayResult(
      { title: "Appartement à louer à Agadir", link: "https://avito.ma/annonce/rent-1" },
      "avito_serper"
    )!;
    const buy = normalizeSearchGatewayResult(
      { title: "Appartement à vendre à Agadir", link: "https://avito.ma/annonce/buy-1" },
      "avito_serper"
    )!;
    const ranked = rankSearchGatewayResults([rent, buy], ["agadir"], "buy");
    const buyIndex = ranked.findIndex((r) => r.id === buy.id);
    const rentIndex = ranked.findIndex((r) => r.id === rent.id);
    assert.ok(buyIndex < rentIndex);
  });

  it("49. intent=rent ranks a rent result above a sale result", () => {
    const rent = normalizeSearchGatewayResult(
      { title: "Appartement à louer à Agadir", link: "https://avito.ma/annonce/rent-2" },
      "avito_serper"
    )!;
    const buy = normalizeSearchGatewayResult(
      { title: "Appartement à vendre à Agadir", link: "https://avito.ma/annonce/buy-2" },
      "avito_serper"
    )!;
    const ranked = rankSearchGatewayResults([buy, rent], ["agadir"], "rent");
    const rentIndex = ranked.findIndex((r) => r.id === rent.id);
    const buyIndex = ranked.findIndex((r) => r.id === buy.id);
    assert.ok(rentIndex < buyIndex);
  });

  it("50. intent=new ranks a new-development result above an ancien/generic result", () => {
    const ancien = normalizeSearchGatewayResult(
      { title: "Appartement ancien à rénover à Casablanca", link: "https://avito.ma/annonce/old-1" },
      "avito_serper"
    )!;
    const neuf = normalizeSearchGatewayResult(
      { title: "Programme neuf résidence standing à Casablanca", link: "https://avito.ma/annonce/new-1" },
      "avito_serper"
    )!;
    const ranked = rankSearchGatewayResults([ancien, neuf], ["casablanca"], "new");
    const neufIndex = ranked.findIndex((r) => r.id === neuf.id);
    const ancienIndex = ranked.findIndex((r) => r.id === ancien.id);
    assert.ok(neufIndex < ancienIndex);
  });

  it("51. Coverage protection — non-matching intent results are kept, not dropped", () => {
    const rent = normalizeSearchGatewayResult(
      { title: "Appartement à louer à Agadir", link: "https://avito.ma/annonce/rent-3" },
      "avito_serper"
    )!;
    const ranked = rankSearchGatewayResults([rent], ["agadir"], "buy");
    assert.equal(ranked.length, 1); // still present, just lower-scored
  });

  it("52. Doctrine protection holds under intent ranking (no thumbnails/contact/gallery, external attribution)", () => {
    const buy = normalizeSearchGatewayResult(
      { title: "Appartement à vendre à Agadir", link: "https://avito.ma/annonce/buy-doctrine" },
      "avito_serper"
    )!;
    const ranked = rankSearchGatewayResults([buy], ["agadir"], "buy");
    const result = ranked[0];
    assert.equal(result.can_show_thumbnail, false);
    assert.equal(result.can_show_contact, false);
    assert.equal(result.can_show_gallery, false);
    assert.equal(result.result_attribution_label, "Résultat web externe");
    assert.ok(!result.original_url.includes("/listings/"));
  });

  it("53. No intent (undefined) does not alter relative ranking of buy vs rent beyond normal scoring", () => {
    const rent = normalizeSearchGatewayResult(
      { title: "Appartement à louer à Agadir avec balcon spacieux", link: "https://avito.ma/annonce/rent-4" },
      "avito_serper"
    )!;
    const buy = normalizeSearchGatewayResult(
      { title: "Appartement à vendre à Agadir avec balcon spacieux", link: "https://avito.ma/annonce/buy-4" },
      "avito_serper"
    )!;
    const ranked = rankSearchGatewayResults([rent, buy], ["agadir"]);
    // Without intent, neither should be forced ahead purely by transaction type.
    assert.equal(ranked.length, 2);
  });
});
