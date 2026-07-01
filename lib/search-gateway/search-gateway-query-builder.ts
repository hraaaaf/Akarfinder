// SEARCH-GATEWAY-MULTISOURCE-SERP-1A (improved)
// Build Search API queries for multi-source Search Gateway
// SEARCH-GATEWAY-QUERY-TUNING-1 — Enhanced query generation for better coverage

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
  const maxQueriesPerSource = 2; // Allow up to 2 query variants per source
  const maxTotalQueries = 12; // Max 12 total queries to Serper

  for (const source of availableSources) {
    if (queries.length >= maxTotalQueries) break;

    // Primary query: direct combination
    const primaryTerms: string[] = [];
    if (q) primaryTerms.push(q);
    if (propertyType) primaryTerms.push(propertyType);
    if (city) primaryTerms.push(city);
    const primaryQuery = `site:${source.domain} ${primaryTerms.join(" ")}`;

    queries.push({
      source_id: source.source_id,
      query: primaryQuery,
      max_results: maxResultsPerSource,
    });

    // Secondary query: alternative formulation for better coverage
    // This helps catch results with different keyword ordering
    if (queries.length < maxTotalQueries && propertyType && city) {
      const secondaryQuery = `site:${source.domain} ${propertyType} ${city}`;
      // Only add if different from primary
      if (secondaryQuery !== primaryQuery) {
        queries.push({
          source_id: source.source_id,
          query: secondaryQuery,
          max_results: maxResultsPerSource,
        });
      }
    }
  }

  return queries.slice(0, maxTotalQueries);
}
