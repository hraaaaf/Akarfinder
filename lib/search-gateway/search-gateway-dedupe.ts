// SEARCH-GATEWAY-MULTISOURCE-SERP-1A
// Deduplicate Search Gateway results with improved Yakeey deduplication

import type { SearchGatewayNormalizedResult } from "./search-gateway-types";

export function dedupeSearchGatewayResults(
  results: SearchGatewayNormalizedResult[]
): SearchGatewayNormalizedResult[] {
  const seen = new Set<string>();
  const deduped: SearchGatewayNormalizedResult[] = [];
  const sourceCount = new Map<string, number>();

  for (const result of results) {
    // Exact URL dedupe (highest priority)
    const normalizedUrl = normalizeUrl(result.original_url);
    const urlKey = `url:${normalizedUrl}`;

    if (seen.has(urlKey)) {
      continue; // Skip exact URL duplicates
    }

    // Source + normalized title dedupe
    const normalizedTitle = normalizeTitle(result.title);
    const titleKey = `${result.source_id}:${normalizedTitle}`;
    const titleDedupeKey = `title:${titleKey}`;

    if (seen.has(titleDedupeKey)) {
      continue; // Skip same-source same-title duplicates
    }

    // Yakeey-specific: limit category pages per source to prevent repetition
    if (result.source_name === "Yakeey") {
      const yakeeyKey = `yakeey:${normalizedTitle}`;
      if (seen.has(yakeeyKey)) {
        continue; // Skip Yakeey category page variants
      }
      seen.add(yakeeyKey);
    }

    // Protect single-source results: never dedupe if this is the only occurrence of this source
    const currentSourceCount = sourceCount.get(result.source_id) || 0;
    if (currentSourceCount === 0 && results.filter((r) => r.source_id === result.source_id).length === 1) {
      // Keep single-source results even if title looks similar
      seen.add(urlKey);
      seen.add(titleDedupeKey);
      deduped.push(result);
      sourceCount.set(result.source_id, currentSourceCount + 1);
      continue;
    }

    // Regular dedupe
    if (!seen.has(urlKey) && !seen.has(titleDedupeKey)) {
      seen.add(urlKey);
      seen.add(titleDedupeKey);
      deduped.push(result);
      sourceCount.set(result.source_id, currentSourceCount + 1);
    }
  }

  // Ensure minimum coverage: don't reduce below 10 results if input had more than 15
  if (results.length > 15 && deduped.length < 10) {
    // Add back highest-quality deduplicated items
    const removed = results.filter((r) => !deduped.find((d) => d.id === r.id));
    for (const item of removed.slice(0, Math.max(0, 10 - deduped.length))) {
      deduped.push(item);
    }
  }

  return deduped;
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    let path = parsed.pathname;
    if (path.endsWith("/")) {
      path = path.slice(0, -1);
    }

    // Remove tracking parameters
    const params = new URLSearchParams(parsed.search);
    const trackingParams = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid"];
    for (const param of trackingParams) {
      params.delete(param);
    }

    const search = params.toString() ? `?${params.toString()}` : "";
    return parsed.hostname.toLowerCase() + path + search;
  } catch {
    return url.toLowerCase().replace(/\/$/, "");
  }
}

function normalizeTitle(title: string): string {
  // Lowercase
  let normalized = title.toLowerCase().trim();

  // Remove common punctuation and extra spaces
  normalized = normalized
    .replace(/[,\.\!\?;:]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  // Remove common keywords that vary but don't change meaning
  normalized = normalized
    .replace(/\b(en|à|sur|avec|et|ou|du|de|le|la|les)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

  // Remove price variations (e.g., "10000 dh" doesn't affect matching)
  normalized = normalized.replace(/\b\d+\s*(dh|€|$|dollar|franc|pound|eur|gbp)\b/g, "").trim();

  return normalized;
}
