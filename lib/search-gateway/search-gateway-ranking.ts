// SEARCH-GATEWAY-MULTISOURCE-SERP-RANKING-1
// Ranking system for external indexed results

import type { SearchGatewayNormalizedResult } from "./search-gateway-types";
import { type SearchGatewayRouteIntent } from "./search-gateway-intent";
import {
  analyzeGatewayQueryContext,
  scoreGatewayResultRelevance,
  type SearchGatewayQueryAnalysis,
  type SearchGatewayRelevanceContext,
} from "./search-gateway-relevance-tuning";

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
  avito_serper: 8,
  sarouty_serper: 7,
  yakeey: 6,
  agenz: 5,
  mubawab_serper: 5,
  "logic-immo": 3,
};

// Quality scoring helpers
function scoreSourcePriority(sourceId: string): number {
  return SOURCE_SCORES[sourceId] || 5;
}

function buildQueryAnalysis(
  queryTermsOrContext: string[] | SearchGatewayRelevanceContext | undefined,
  intent?: SearchGatewayRouteIntent,
): SearchGatewayQueryAnalysis {
  if (!queryTermsOrContext) {
    return analyzeGatewayQueryContext({ intent });
  }

  if (Array.isArray(queryTermsOrContext)) {
    return analyzeGatewayQueryContext({
      q: queryTermsOrContext.filter(Boolean).join(" ").trim(),
      intent,
    });
  }

  return analyzeGatewayQueryContext({
    ...queryTermsOrContext,
    intent: queryTermsOrContext.intent ?? intent,
  });
}

function scoreQuality(
  result: SearchGatewayNormalizedResult,
  analysis: SearchGatewayQueryAnalysis,
): number {
  return scoreGatewayResultRelevance(result, analysis).totalScore;
}

export function rankSearchGatewayResults(
  results: SearchGatewayNormalizedResult[],
  queryTermsOrContext: string[] | SearchGatewayRelevanceContext = [],
  intent?: SearchGatewayRouteIntent
): Array<SearchGatewayNormalizedResult & { _ranking: RankingScore }> {
  const queryAnalysis = buildQueryAnalysis(queryTermsOrContext, intent);

  // Score each result
  const scoredResults = results.map(result => {
    const source_score = scoreSourcePriority(result.source_id);
    const quality_score = scoreQuality(result, queryAnalysis);
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
  queryTermsOrContext: string[] | SearchGatewayRelevanceContext = [],
  intent?: SearchGatewayRouteIntent
): RankingScore {
  const source_score = scoreSourcePriority(result.source_id);
  const quality_score = scoreQuality(result, buildQueryAnalysis(queryTermsOrContext, intent));
  const gateway_rank_score = source_score + quality_score;

  return {
    source_score,
    quality_score,
    gateway_rank_score,
  };
}
