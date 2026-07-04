// SEARCH-GATEWAY-MULTISOURCE-SERP-RANKING-1
// Ranking system for external indexed results

import type { SearchGatewayNormalizedResult } from "./search-gateway-types";
import { isSourceCategoryPage, isEnglishResult } from "./search-gateway-category-detector";

export interface RankingScore {
  source_score: number;
  quality_score: number;
  gateway_rank_score: number;
}

// Source priority scores — keys must match the actual source_id values from
// search-gateway-sources.ts (previously mismatched: "avito"/"sarouty"/"mubawab"
// never matched "avito_serper"/"sarouty_serper"/"mubawab_serper" and silently
// fell back to the default score, which skewed ranking toward Agenz/Yakeey).
const SOURCE_SCORES: Record<string, number> = {
  avito_serper: 30,
  sarouty_serper: 25,
  yakeey: 20,
  agenz: 15,
  mubawab_serper: 15,
  "logic-immo": 10,
};

// Quality scoring helpers
function scoreSourcePriority(sourceId: string): number {
  return SOURCE_SCORES[sourceId] || 5;
}

function scoreQuality(result: SearchGatewayNormalizedResult, queryTerms: string[]): number {
  let score = 0;
  const titleLower = result.title?.toLowerCase() ?? "";
  const snippetLower = result.snippet?.toLowerCase() ?? "";

  // Title contains city/location
  queryTerms.forEach(term => {
    if (titleLower.includes(term.toLowerCase())) {
      score += 15;
    }
  });

  // Title contains property type keywords
  const propertyKeywords = [
    "appartement",
    "apartment",
    "villa",
    "terrain",
    "maison",
    "studio",
    "duplex",
    "penthouse",
    "loft",
  ];
  propertyKeywords.forEach(keyword => {
    if (titleLower.includes(keyword)) {
      score += 15;
    }
  });

  // Useful snippet (longer, more detailed)
  if (snippetLower && snippetLower.length > 100) {
    score += 10;
  }

  // Valid URL
  if (result.original_url && result.original_url.startsWith("http")) {
    score += 10;
  }

  // Demote generic/category pages
  const genericPatterns = [
    "categor",
    "list",
    "toutes les",
    "all ",
    "browse",
    "voir plus",
    "search results",
  ];
  genericPatterns.forEach(pattern => {
    if (titleLower.includes(pattern)) {
      score -= 10;
    }
  });

  // Demote source category/listing pages (e.g. "23 Apartments for rent in
  // Agadir") — SERP-RESULT-QUALITY-DEGROUPING-1. These stay eligible but rank
  // behind more specific results; never removed outright.
  if (isSourceCategoryPage(result.title ?? "", result.original_url ?? "")) {
    score -= 20;
  }

  // Demote English-language pages when a French/comparable alternative may
  // exist — SERP-RESULT-QUALITY-DEGROUPING-1. Never removed, only deprioritized.
  if (isEnglishResult(result.title ?? "", result.original_url ?? "")) {
    score -= 12;
  }

  // Demote overly generic titles
  if (titleLower.length < 15 || titleLower.includes("...")) {
    score -= 15;
  }

  return Math.max(score, 0); // Never negative
}

export function rankSearchGatewayResults(
  results: SearchGatewayNormalizedResult[],
  queryTerms: string[] = []
): Array<SearchGatewayNormalizedResult & { _ranking: RankingScore }> {
  // Score each result
  const scoredResults = results.map(result => {
    const source_score = scoreSourcePriority(result.source_id);
    const quality_score = scoreQuality(result, queryTerms);
    const gateway_rank_score = source_score + quality_score;

    return {
      ...result,
      _ranking: {
        source_score,
        quality_score,
        gateway_rank_score,
      },
    };
  });

  // Sort by: rank_score (desc), source_priority (desc), title (asc)
  scoredResults.sort((a, b) => {
    // Primary: rank score descending
    if (b._ranking.gateway_rank_score !== a._ranking.gateway_rank_score) {
      return b._ranking.gateway_rank_score - a._ranking.gateway_rank_score;
    }

    // Secondary: source score descending
    if (b._ranking.source_score !== a._ranking.source_score) {
      return b._ranking.source_score - a._ranking.source_score;
    }

    // Tertiary: title ascending (alphabetical)
    return (a.title ?? "").localeCompare(b.title ?? "");
  });

  return scoredResults;
}

// Helper to get ranking info for a single result
export function getResultRankingScore(
  result: SearchGatewayNormalizedResult,
  queryTerms: string[] = []
): RankingScore {
  const source_score = scoreSourcePriority(result.source_id);
  const quality_score = scoreQuality(result, queryTerms);
  const gateway_rank_score = source_score + quality_score;

  return {
    source_score,
    quality_score,
    gateway_rank_score,
  };
}
