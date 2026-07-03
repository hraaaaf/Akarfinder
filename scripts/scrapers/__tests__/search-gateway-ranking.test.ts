// SEARCH-GATEWAY-MULTISOURCE-SERP-RANKING-1
// Tests for result ranking

import { describe, it, expect } from "vitest";
import {
  rankSearchGatewayResults,
  getResultRankingScore,
} from "@/lib/search-gateway/search-gateway-ranking";
import type { SearchGatewayNormalizedResult } from "@/lib/search-gateway/search-gateway-types";

describe("Search Gateway Ranking", () => {
  const mockResult = (
    sourceId: string,
    title: string,
    snippet: string = "Sample snippet"
  ): SearchGatewayNormalizedResult => ({
    id: `test_${sourceId}_${Math.random()}`,
    title,
    snippet,
    original_url: `https://${sourceId}.ma/listing`,
    display_url: `${sourceId}.ma`,
    source_id: sourceId,
    source_name: sourceId.toUpperCase(),
    can_show_contact: false,
    can_show_gallery: false,
    can_cache_thumbnail: false,
    can_download_thumbnail: false,
    primary_cta: "view_original",
    primary_cta_label: `Voir sur ${sourceId}`,
    search_result_display_mode: "thin_indexed_result",
    result_attribution_label: "Résultat web externe",
  });

  describe("Source scoring", () => {
    it("should score Avito highest (30 points)", () => {
      const score = getResultRankingScore(mockResult("avito", "Test"));
      expect(score.source_score).toBe(30);
    });

    it("should score Sarouty second (25 points)", () => {
      const score = getResultRankingScore(mockResult("sarouty", "Test"));
      expect(score.source_score).toBe(25);
    });

    it("should score Yakeey third (20 points)", () => {
      const score = getResultRankingScore(mockResult("yakeey", "Test"));
      expect(score.source_score).toBe(20);
    });

    it("should score Logic-Immo lowest (10 points)", () => {
      const score = getResultRankingScore(mockResult("logic-immo", "Test"));
      expect(score.source_score).toBe(10);
    });

    it("should score Agenz and Mubawab equally (15 points each)", () => {
      const agenzScore = getResultRankingScore(mockResult("agenz", "Test"));
      const mubawabScore = getResultRankingScore(mockResult("mubawab", "Test"));
      expect(agenzScore.source_score).toBe(15);
      expect(mubawabScore.source_score).toBe(15);
    });
  });

  describe("Quality scoring", () => {
    it("should boost title containing city", () => {
      const withCity = getResultRankingScore(
        mockResult("avito", "Appartement à Casablanca"),
        ["Casablanca"]
      );
      const withoutCity = getResultRankingScore(
        mockResult("avito", "Appartement")
      );
      expect(withCity.quality_score).toBeGreaterThan(withoutCity.quality_score);
    });

    it("should boost title containing property type", () => {
      const withType = getResultRankingScore(
        mockResult("avito", "Villa à vendre")
      );
      const withoutType = getResultRankingScore(
        mockResult("avito", "Bien immobilier à vendre")
      );
      expect(withType.quality_score).toBeGreaterThan(
        withoutType.quality_score
      );
    });

    it("should boost longer, detailed snippets", () => {
      const detailed = getResultRankingScore(
        mockResult(
          "avito",
          "Apartment",
          "This is a very detailed snippet with lots of useful information about the property"
        )
      );
      const short = getResultRankingScore(mockResult("avito", "Apartment", "Short"));
      expect(detailed.quality_score).toBeGreaterThan(short.quality_score);
    });

    it("should demote generic category pages", () => {
      const generic = getResultRankingScore(
        mockResult("avito", "Browse all apartments - Casablanca")
      );
      const specific = getResultRankingScore(
        mockResult("avito", "Beautiful apartment in Casablanca")
      );
      expect(specific.quality_score).toBeGreaterThan(generic.quality_score);
    });

    it("should demote very short/generic titles", () => {
      const tooShort = getResultRankingScore(mockResult("avito", "Apt"));
      const proper = getResultRankingScore(
        mockResult("avito", "Apartment for sale in Marrakech")
      );
      expect(proper.quality_score).toBeGreaterThan(tooShort.quality_score);
    });
  });

  describe("Ranking order", () => {
    it("should rank Avito/Sarouty higher than Logic-Immo", () => {
      const results = [
        mockResult("logic-immo", "Apartment in Casablanca"),
        mockResult("avito", "Apartment in Casablanca"),
        mockResult("sarouty", "Apartment in Casablanca"),
      ];

      const ranked = rankSearchGatewayResults(results, ["Casablanca"]);
      expect(ranked[0].source_id).toBe("avito");
      expect(ranked[1].source_id).toBe("sarouty");
      expect(ranked[2].source_id).toBe("logic-immo");
    });

    it("should rank by total score descending", () => {
      const results = [
        mockResult("logic-immo", "Category page with lists"),
        mockResult("yakeey", "Beautiful villa in Marrakech"),
        mockResult("avito", "Bad result......"),
      ];

      const ranked = rankSearchGatewayResults(results, ["villa", "Marrakech"]);
      // Yakeey (20) + quality should beat Logic-Immo (10) and Avito (30) with bad quality
      expect(ranked[0].source_id).toBe("yakeey");
    });

    it("should demote Logic-Immo weak results", () => {
      const results = [
        mockResult("logic-immo", "Search results for apartments"),
        mockResult("agenz", "Apartment for sale"),
        mockResult("logic-immo", "Apartment in Fez"),
      ];

      const ranked = rankSearchGatewayResults(results);
      // Agenz result should rank above generic Logic-Immo
      const agenzIndex = ranked.findIndex((r) => r.source_id === "agenz");
      const logicFirstIndex = ranked.findIndex(
        (r) => r.source_id === "logic-immo" && r.title.includes("Search")
      );
      expect(agenzIndex).toBeLessThan(logicFirstIndex);
    });

    it("should always keep can_show_contact false", () => {
      const results = [
        mockResult("avito", "Test 1"),
        mockResult("sarouty", "Test 2"),
      ];

      const ranked = rankSearchGatewayResults(results);
      ranked.forEach((result) => {
        expect(result.can_show_contact).toBe(false);
        expect(result.can_show_gallery).toBe(false);
      });
    });
  });

  describe("Edge cases", () => {
    it("should handle empty results", () => {
      const ranked = rankSearchGatewayResults([]);
      expect(ranked).toEqual([]);
    });

    it("should handle missing query terms", () => {
      const results = [
        mockResult("avito", "Apartment in Casablanca"),
        mockResult("sarouty", "Villa in Marrakech"),
      ];

      const ranked = rankSearchGatewayResults(results, []);
      expect(ranked).toHaveLength(2);
      expect(ranked[0].source_id).toBe("avito"); // Higher source score
    });

    it("should never return negative quality scores", () => {
      const results = [
        mockResult(
          "avito",
          "...",
          "Very short bad title that should be demoted significantly but never negative"
        ),
      ];

      const ranked = rankSearchGatewayResults(results);
      expect(ranked[0]._ranking.quality_score).toBeGreaterThanOrEqual(0);
    });
  });
});
