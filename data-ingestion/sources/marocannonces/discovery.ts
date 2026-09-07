import { load } from "cheerio";
import config from "./config.json" with { type: "json" };

export type MarocAnnoncesDiscoveryRoute = {
  key: string;
  role: "control" | "primary";
  url: string;
};

export type MarocAnnoncesListingRef = {
  source_id: string;
  url: string;
  route_url: string;
  source_category_id: string;
};

export type MarocAnnoncesDiscoveryManifest = {
  source: "marocannonces";
  generated_at: string;
  phase: "phase0_page1_only";
  routes_total: number;
  pages_requested: number;
  pages_succeeded: number;
  pages_failed: number;
  unique_listings: number;
  duplicate_refs: number;
  routes: Array<MarocAnnoncesDiscoveryRoute & {
    status: "ok" | "error";
    discovered: number;
    unique_added: number;
    error?: string;
  }>;
};

const DETAIL_RE = /^\/categorie\/(\d+)\/[^/]+\/annonce\/(\d+)\/[^/?#]+\.html$/i;

export function buildMarocAnnoncesPageOneRoutes(): MarocAnnoncesDiscoveryRoute[] {
  const routes: MarocAnnoncesDiscoveryRoute[] = [];

  for (const route of config.route_families.control) {
    if (!route.verified || !route.path) continue;
    routes.push({ key: route.key, role: "control", url: new URL(route.path, config.base_url).toString() });
  }

  for (const route of config.route_families.primary_candidates) {
    if (!route.verified || !route.path) continue;
    routes.push({ key: route.key, role: "primary", url: new URL(route.path, config.base_url).toString() });
  }

  return routes;
}

export function extractMarocAnnoncesListingRefs(html: string, routeUrl: string): MarocAnnoncesListingRef[] {
  const $ = load(html);
  const byId = new Map<string, MarocAnnoncesListingRef>();

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;

    let resolved: URL;
    try {
      resolved = new URL(href, config.base_url);
    } catch {
      return;
    }

    if (resolved.origin !== new URL(config.base_url).origin) return;

    const match = resolved.pathname.match(DETAIL_RE);
    if (!match) return;

    const sourceCategoryId = match[1];
    const sourceId = match[2];
    resolved.search = "";
    resolved.hash = "";

    if (!byId.has(sourceId)) {
      byId.set(sourceId, {
        source_id: sourceId,
        url: resolved.toString(),
        route_url: routeUrl,
        source_category_id: sourceCategoryId,
      });
    }
  });

  return [...byId.values()];
}

export type MarocAnnoncesDiscoveryFetcher = (url: string) => Promise<string>;

export async function runMarocAnnoncesPageOneDiscovery(
  fetchPage: MarocAnnoncesDiscoveryFetcher,
  options: { now?: () => string } = {},
): Promise<{ manifest: MarocAnnoncesDiscoveryManifest; listings: MarocAnnoncesListingRef[] }> {
  const routes = buildMarocAnnoncesPageOneRoutes();
  const globalById = new Map<string, MarocAnnoncesListingRef>();
  let duplicateRefs = 0;
  let pagesSucceeded = 0;
  let pagesFailed = 0;
  const routeReports: MarocAnnoncesDiscoveryManifest["routes"] = [];

  for (const route of routes) {
    try {
      const html = await fetchPage(route.url);
      const refs = extractMarocAnnoncesListingRefs(html, route.url);
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
  return {
    manifest: {
      source: "marocannonces",
      generated_at: options.now?.() ?? new Date().toISOString(),
      phase: "phase0_page1_only",
      routes_total: routes.length,
      pages_requested: routes.length,
      pages_succeeded: pagesSucceeded,
      pages_failed: pagesFailed,
      unique_listings: listings.length,
      duplicate_refs: duplicateRefs,
      routes: routeReports,
    },
    listings,
  };
}
