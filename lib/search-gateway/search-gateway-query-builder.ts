// SEARCH-GATEWAY-MULTISOURCE-SERP-1A (improved)
// Build Search API queries for multi-source Search Gateway
// SEARCH-GATEWAY-QUERY-TUNING-1 — Enhanced query generation for better coverage
// SEARCH-GATEWAY-QUERY-VARIANTS-REAL-1 — Real query variants per source

import type { SearchGatewayQueryInput, SearchGatewayQuery } from "./search-gateway-types";
import { getEnabledSearchGatewaySources, getSearchGatewaySourceById } from "./search-gateway-sources";
import { analyzeGatewayQueryContext, type SearchGatewayPropertyType } from "./search-gateway-relevance-tuning";

function renderPropertyType(propertyType: SearchGatewayPropertyType | undefined): string | undefined {
  switch (propertyType) {
    case "appartement":
      return "appartement";
    case "studio":
      return "studio";
    case "villa":
      return "villa";
    case "terrain":
      return "terrain";
    case "maison":
      return "maison";
    case "programme":
      return "programme neuf";
    default:
      return undefined;
  }
}

function buildSecondaryQueryText(input: SearchGatewayQueryInput): string | undefined {
  const hasStructuredContext = Boolean(input.city?.trim() || input.property_type?.trim() || input.intent?.trim());
  if (!hasStructuredContext) return undefined;

  const analysis = analyzeGatewayQueryContext(input);
  const city = input.city?.trim() || analysis.city;
  const propertyType = renderPropertyType(analysis.property_type) ?? input.property_type?.trim();

  const baseTerms = [propertyType, city].filter(Boolean).join(" ").trim();
  if (!baseTerms) return undefined;

  switch (analysis.intent) {
    case "rent":
      return propertyType
        ? `${propertyType} a louer ${city ?? ""}`.trim()
        : `location ${city ?? ""}`.trim();
    case "new":
      return city ? `programme neuf ${city}` : "programme neuf";
    case "land":
      return city ? `terrain a vendre ${city}` : "terrain a vendre";
    case "buy":
    default:
      return propertyType
        ? `${propertyType} a vendre ${city ?? ""}`.trim()
        : `achat ${city ?? ""}`.trim();
  }
}

export function buildSearchGatewayQueries(
  input: SearchGatewayQueryInput
): SearchGatewayQuery[] {
  const maxResultsPerSource = input.max_results_per_source ?? 5;
  const q = input.q?.trim() ?? "";
  const city = input.city?.trim() ?? "";
  const propertyType = input.property_type?.trim() ?? "";
  const sources = input.sources ?? [];
  const secondaryQueryText = buildSecondaryQueryText(input);

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
      if (secondaryQueryText) {
        switch (source.source_id) {
          case "yakeey":
            secondaryQuery = `site:yakeey.com/fr-ma ${secondaryQueryText}`;
            break;
          case "mubawab_serper":
            secondaryQuery = `site:${source.domain}/fr ${secondaryQueryText}`;
            break;
          default:
            secondaryQuery = `site:${source.domain} ${secondaryQueryText}`;
            break;
        }
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
