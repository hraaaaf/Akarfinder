// SEARCH-GATEWAY-MULTISOURCE-SERP-1A (improved)
// Build Search API queries for multi-source Search Gateway
// SEARCH-GATEWAY-QUERY-TUNING-1 — Enhanced query generation for better coverage
// SEARCH-GATEWAY-QUERY-VARIANTS-REAL-1 — Real query variants per source

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

  // Build queries with real variants per source
  const queries: SearchGatewayQuery[] = [];
  const maxTotalQueries = 12;
  const usedQueries = new Set<string>();

  for (const source of availableSources) {
    if (queries.length >= maxTotalQueries) break;

    // Primary query: [q] [city] or [q] [propertyType] [city]
    const primaryTerms: string[] = [];
    if (q) primaryTerms.push(q);
    if (propertyType) primaryTerms.push(propertyType);
    if (city) primaryTerms.push(city);
    const primaryQuery = `site:${source.domain} ${primaryTerms.join(" ")}`;

    if (!usedQueries.has(primaryQuery)) {
      queries.push({
        source_id: source.source_id,
        query: primaryQuery,
        max_results: maxResultsPerSource,
      });
      usedQueries.add(primaryQuery);
    }

    // Secondary query: source-specific variant
    if (queries.length < maxTotalQueries) {
      let secondaryQuery = "";

      // Generate source-specific variants
      switch (source.source_id) {
        case "avito":
          // "immobilier Casablanca appartement"
          if (city && q) {
            secondaryQuery = `site:${source.domain} immobilier ${city} ${q}`;
          }
          break;
        case "sarouty":
          // "Casablanca appartements vendre"
          if (city && q) {
            secondaryQuery = `site:${source.domain} ${city} ${q}s vendre`;
          }
          break;
        case "yakeey":
          // Use /fr path variant
          if (city && q) {
            secondaryQuery = `site:yakeey.com/fr ${city} ${q}`;
          }
          break;
        case "agenz":
          // Weak source — enhance with "immobilier" keyword
          if (city && q) {
            secondaryQuery = `site:${source.domain} immobilier ${city} ${q}`;
          }
          break;
        case "logic-immo":
          // Weak source — enhance with "Maroc" keyword
          if (city && q) {
            secondaryQuery = `site:${source.domain} Maroc ${q} ${city}`;
          }
          break;
        case "mubawab":
          // Weak source — try /fr path variant
          if (city && q) {
            secondaryQuery = `site:mubawab.ma/fr ${q} ${city}`;
          }
          break;
      }

      // Only add if it's different and not used
      if (
        secondaryQuery &&
        secondaryQuery !== primaryQuery &&
        !usedQueries.has(secondaryQuery)
      ) {
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
