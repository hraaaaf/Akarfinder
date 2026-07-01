// SEARCH-GATEWAY-MULTISOURCE-SERP-1A (improved)
// Build Search API queries for multi-source Search Gateway
// SEARCH-GATEWAY-QUERY-TUNING-1 — Enhanced query generation for better coverage
// SEARCH-GATEWAY-QUERY-TUNING-QA-1 — Query deduplication verified

import type { SearchGatewayQueryInput, SearchGatewayQuery } from "./search-gateway-types";
import { getEnabledSearchGatewaySources, getSearchGatewaySourceById } from "./search-gateway-sources";

export function buildSearchGatewayQueries(
  input: SearchGatewayQueryInput
): SearchGatewayQuery[] {
  const maxResultsPerSource = input.max_results_per_source ?? 5;
  const q = input.q?.trim() ?? "";
  const city = input.city?.trim() ?? "";
  const propertyType = input.property_type?.trim() ?? "";
  const sources = input.sources ?? [];

  // If everything is empty, return no queries
  if (!q && !city && !propertyType) {
    return [];
  }

  // Get sources to query
  const availableSources =
    sources.length > 0
      ? sources
          .map((s) => getSearchGatewaySourceById(s))
          .filter((s) => s !== null)
      : getEnabledSearchGatewaySources();

  // Build queries with enhanced variations per source
  const queries: SearchGatewayQuery[] = [];
  const maxTotalQueries = 12; // Max 12 total queries to Serper
  const usedQueries = new Set<string>(); // Track to avoid duplicates

  for (const source of availableSources) {
    if (queries.length >= maxTotalQueries) break;

    // Primary query: direct combination
    const primaryTerms: string[] = [];
    if (q) primaryTerms.push(q);
    if (propertyType) primaryTerms.push(propertyType);
    if (city) primaryTerms.push(city);
    const primaryQuery = `site:${source.domain} ${primaryTerms.join(" ")}`;

    // Only add if not a duplicate
    if (!usedQueries.has(primaryQuery)) {
      queries.push({
        source_id: source.source_id,
        query: primaryQuery,
        max_results: maxResultsPerSource,
      });
      usedQueries.add(primaryQuery);
    }

    // Secondary query: alternative formulation for better coverage
    if (queries.length < maxTotalQueries && (propertyType || q) && city) {
      // Try alternative ordering: city first or inverted
      const secondaryTerms: string[] = [];
      if (city) secondaryTerms.push(city);
      if (propertyType) secondaryTerms.push(propertyType);
      if (q && q !== propertyType) secondaryTerms.push(q);
      const secondaryQuery = `site:${source.domain} ${secondaryTerms.join(" ")}`;

      // Only add if different from primary AND not already used
      if (secondaryQuery !== primaryQuery && !usedQueries.has(secondaryQuery)) {
        queries.push({
          source_id: source.source_id,
          query: secondaryQuery,
          max_results: maxResultsPerSource,
        });
        usedQueries.add(secondaryQuery);
      }
    }
  }

  return queries.slice(0, maxTotalQueries);
}
