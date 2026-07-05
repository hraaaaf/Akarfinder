// SEARCH-GATEWAY-COVERAGE-EXPANSION-1
// Page-quality classification for gateway results.
// reject  → never shown (staging hosts, portal homepages, blog articles)
// weak    → shown only after stronger results (price-reference/guide pages)
// category→ useful search/category page (volume backbone, kept)
// individual → single-listing page (best signal)

export type GatewayPageQuality = "individual" | "category" | "weak" | "reject";

// Staging / non-production third-party hosts must never reach the SERP.
const STAGING_HOST_PATTERN = /^(stage|staging|dev|test|preprod|preview|uat)([-.\d]|$)/i;
const LOCAL_HOST_PATTERN = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i;

// Blog/editorial articles are not listings.
const BLOG_PATH_PATTERN = /\/(blog|actualites|actualités|conseils|guide-)/i;

// Price-reference / market-data pages: useful context, but not listings —
// deprioritized, never removed (they can still fill volume at the bottom).
const WEAK_PAGE_PATTERNS: RegExp[] = [
  /referentiel-de-prix/i,
  /prix-immobilier/i,
  /referentiel/i,
];
const WEAK_TITLE_PATTERNS: RegExp[] = [
  /carte des prix/i,
  /référentiel des prix/i,
  /prix de l'immobilier/i,
  /prix du m/i,
];

// Single-listing URL heuristics across the configured sources
// (Yakeey -ia/-mi/-ma ids, Sarouty listing_id / property-details, long slugs
// ending with a numeric id, Mubawab /a/ listing paths).
const INDIVIDUAL_URL_PATTERNS: RegExp[] = [
  /-[a-z]{2}\d{4,}(\/)?$/i,
  /listing_id=\d+/i,
  /property-details/i,
  /\/annonce[s]?\/.+\d/i,
  /\/ad\/.+/i,
];

export function isStagingGatewayUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    if (LOCAL_HOST_PATTERN.test(hostname)) return true;
    const firstLabel = hostname.split(".")[0] ?? "";
    return STAGING_HOST_PATTERN.test(firstLabel);
  } catch {
    return true; // unparseable URL → treat as unsafe
  }
}

export function isPortalHomepageUrl(url: string): boolean {
  try {
    const { pathname, search } = new URL(url);
    const normalizedPath = pathname.replace(/\/+$/, "");
    // Bare domain or language-only root ("/", "/fr", "/fr-ma", "/en") with no query.
    const isRootish = normalizedPath === "" || /^\/[a-z]{2}(-[a-z]{2})?$/i.test(normalizedPath);
    return isRootish && !search;
  } catch {
    return false;
  }
}

export function isBlogGatewayUrl(url: string): boolean {
  return BLOG_PATH_PATTERN.test(url);
}

/** Hard rejection: these must never appear in the SERP. */
export function isRejectedGatewayResult(title: string, url: string): boolean {
  return isStagingGatewayUrl(url) || isPortalHomepageUrl(url) || isBlogGatewayUrl(url);
}

export function getGatewayPageQuality(title: string, url: string): GatewayPageQuality {
  if (isRejectedGatewayResult(title, url)) return "reject";
  if (
    WEAK_PAGE_PATTERNS.some((p) => p.test(url)) ||
    WEAK_TITLE_PATTERNS.some((p) => p.test(title))
  ) {
    return "weak";
  }
  if (INDIVIDUAL_URL_PATTERNS.some((p) => p.test(url))) return "individual";
  return "category";
}

/**
 * Stable partition: strong results (individual + category) keep their order
 * first, weak pages move to the end (still shown — they contribute volume),
 * rejected pages are dropped.
 */
export function orderGatewayResultsByPageQuality<
  T extends { title: string; original_url: string },
>(results: readonly T[]): T[] {
  const strong: T[] = [];
  const weak: T[] = [];
  for (const result of results) {
    const quality = getGatewayPageQuality(result.title ?? "", result.original_url ?? "");
    if (quality === "reject") continue;
    if (quality === "weak") weak.push(result);
    else strong.push(result);
  }
  return [...strong, ...weak];
}
