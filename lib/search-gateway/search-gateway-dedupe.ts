// SEARCH-GATEWAY-MULTISOURCE-SERP-1A
// Deduplicate Search Gateway results

import type { SearchGatewayNormalizedResult } from "./search-gateway-types";

export function dedupeSearchGatewayResults(
  results: SearchGatewayNormalizedResult[]
): SearchGatewayNormalizedResult[] {
  const seen = new Set<string>();
  const deduped: SearchGatewayNormalizedResult[] = [];

  for (const result of results) {
    // Normalize URL for comparison (remove trailing slash, lowercase domain)
    const normalizedUrl = normalizeUrl(result.original_url);

    // Also check for same source + same title
    const titleKey = `${result.source_id}:${result.title
      .toLowerCase()
      .trim()}`;

    // Prioritize URL dedupe, then title dedupe
    const dedupeKey = `url:${normalizedUrl}`;
    const titleDedupeKey = `title:${titleKey}`;

    if (!seen.has(dedupeKey) && !seen.has(titleDedupeKey)) {
      seen.add(dedupeKey);
      seen.add(titleDedupeKey);
      deduped.push(result);
    }
  }

  return deduped;
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Normalize: lowercase domain, remove trailing slash
    return (
      parsed.hostname.toLowerCase() +
      (parsed.pathname.endsWith("/") ? parsed.pathname.slice(0, -1) : parsed.pathname) +
      parsed.search
    );
  } catch {
    // Fallback: simple lowercase
    return url.toLowerCase().replace(/\/$/, "");
  }
}
