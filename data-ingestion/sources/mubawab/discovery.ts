import { load } from "cheerio";
import config from "./config.json" with { type: "json" };

export type DiscoveryRoute = {
  city: string;
  category_key: string;
  page: number;
  url: string;
};

export type DiscoveredListingRef = {
  source_id: string;
  url: string;
  route_url: string;
  detail_family: "a" | "pa";
};

export type DiscoveryManifest = {
  source: "mubawab";
  generated_at: string;
  routes_total: number;
  pages_requested: number;
  pages_succeeded: number;
  pages_failed: number;
  unique_listings: number;
  duplicate_refs: number;
  detail_family_counts: { a: number; pa: number };
  routes: Array<{
    city: string;
    category_key: string;
    page: number;
    url: string;
    status: "ok" | "error";
    discovered: number;
    unique_added: number;
    error?: string;
  }>;
};

function enc(value: string) {
  return encodeURIComponent(value).replace(/%2F/gi, "/");
}

export function buildDiscoveryRoutes(maxPages = config.safety.max_pages_per_combo_default): DiscoveryRoute[] {
  const routes: DiscoveryRoute[] = [];
  for (const city of config.cities) {
    for (const category of config.categories) {
      if (!category.enabled || !category.st_slug) continue;
      for (let page = 1; page <= maxPages; page++) {
        const suffix = page === 1 ? "" : `:p:${page}`;
        routes.push({
          city: city.name,
          category_key: category.key,
          page,
          url: `${config.base_url}/fr/st/${enc(city.slug)}/${category.st_slug}${suffix}`,
        });
      }
    }
  }
  return routes;
}

export function extractListingRefs(html: string, routeUrl: string): DiscoveredListingRef[] {
  const $ = load(html);
  const byId = new Map<string, DiscoveredListingRef>();
  const detailRe = /\/fr\/(a|pa)\/(\d+)(?:\/[^?#\s"']*)?/i;

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    const match = href.match(detailRe);
    if (!match) return;
    const detailFamily = match[1].toLowerCase() as "a" | "pa";
    const sourceId = match[2];
    const url = new URL(href, config.base_url).toString();
    if (!byId.has(sourceId)) byId.set(sourceId, { source_id: sourceId, url, route_url: routeUrl, detail_family: detailFamily });
  });

  return [...byId.values()];
}

export type DiscoveryFetcher = (url: string) => Promise<string>;

export async function runDiscovery(
  fetchPage: DiscoveryFetcher,
  options: { maxPages?: number; now?: () => string } = {},
): Promise<{ manifest: DiscoveryManifest; listings: DiscoveredListingRef[] }> {
  const routes = buildDiscoveryRoutes(options.maxPages);
  const globalById = new Map<string, DiscoveredListingRef>();
  let duplicateRefs = 0;
  let pagesSucceeded = 0;
  let pagesFailed = 0;
  const routeReports: DiscoveryManifest["routes"] = [];

  for (const route of routes) {
    try {
      const html = await fetchPage(route.url);
      const refs = extractListingRefs(html, route.url);
      let uniqueAdded = 0;
      for (const ref of refs) {
        if (globalById.has(ref.source_id)) duplicateRefs++;
        else {
          globalById.set(ref.source_id, ref);
          uniqueAdded++;
        }
      }
      pagesSucceeded++;
      routeReports.push({ ...route, status: "ok", discovered: refs.length, unique_added: uniqueAdded });
    } catch (error) {
      pagesFailed++;
      routeReports.push({
        ...route,
        status: "error",
        discovered: 0,
        unique_added: 0,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const listings = [...globalById.values()];
  const manifest: DiscoveryManifest = {
    source: "mubawab",
    generated_at: options.now?.() ?? new Date().toISOString(),
    routes_total: routes.length,
    pages_requested: routes.length,
    pages_succeeded: pagesSucceeded,
    pages_failed: pagesFailed,
    unique_listings: globalById.size,
    duplicate_refs: duplicateRefs,
    detail_family_counts: {
      a: listings.filter((ref) => ref.detail_family === "a").length,
      pa: listings.filter((ref) => ref.detail_family === "pa").length,
    },
    routes: routeReports,
  };

  return { manifest, listings };
}
