import { load } from "cheerio";

export type CoverageDimensions = {
  route_families: string[];
  geographies: string[];
  hierarchical_geography_paths: string[];
  category_slugs: string[];
  observed_routes: string[];
};

function sorted(values: Iterable<string>): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, "fr"));
}

export function extractCoverageDimensions(html: string, pageUrl: string): CoverageDimensions {
  const $ = load(html);
  const routeFamilies = new Set<string>();
  const geographies = new Set<string>();
  const hierarchicalGeographies = new Set<string>();
  const categorySlugs = new Set<string>();
  const routes = new Set<string>();

  const inspect = (rawHref: string | undefined) => {
    if (!rawHref) return;
    let url: URL;
    try {
      url = new URL(rawHref, pageUrl);
    } catch {
      return;
    }
    if (url.hostname !== "www.mubawab.ma" && url.hostname !== "mubawab.ma") return;

    const segments = decodeURIComponent(url.pathname)
      .split("/")
      .filter(Boolean);
    const offset = segments[0] === "fr" ? 1 : 0;
    const family = segments[offset];
    if (!family) return;

    if (["t", "st", "ct", "crp", "sc", "cc", "pl", "sd", "is"].includes(family)) {
      routeFamilies.add(family);
      const routeDepth = family === "crp" ? offset + 5 : offset + 3;
      routes.add(`/${segments.slice(0, Math.min(segments.length, routeDepth)).join("/")}`);
    }

    if (["t", "st", "ct"].includes(family) && segments[offset + 1]) {
      geographies.add(segments[offset + 1]);
    }

    if (family === "crp" && segments[offset + 1] && segments[offset + 2]) {
      hierarchicalGeographies.add(`${segments[offset + 1]}/${segments[offset + 2]}`);
      if (segments[offset + 3]) categorySlugs.add(segments[offset + 3].replace(/:p:\d+$/, ""));
    }

    if (["st", "ct"].includes(family) && segments[offset + 2]) {
      categorySlugs.add(segments[offset + 2].replace(/:p:\d+$/, ""));
    }
    if (["sc", "cc"].includes(family) && segments[offset + 1]) {
      categorySlugs.add(segments[offset + 1].replace(/:p:\d+$/, ""));
    }
  };

  inspect(pageUrl);
  $("a[href]").each((_, element) => inspect($(element).attr("href")));

  return {
    route_families: sorted(routeFamilies),
    geographies: sorted(geographies),
    hierarchical_geography_paths: sorted(hierarchicalGeographies),
    category_slugs: sorted(categorySlugs),
    observed_routes: sorted(routes),
  };
}

export function mergeCoverageDimensions(items: CoverageDimensions[]): CoverageDimensions {
  return {
    route_families: sorted(items.flatMap((item) => item.route_families)),
    geographies: sorted(items.flatMap((item) => item.geographies)),
    hierarchical_geography_paths: sorted(items.flatMap((item) => item.hierarchical_geography_paths)),
    category_slugs: sorted(items.flatMap((item) => item.category_slugs)),
    observed_routes: sorted(items.flatMap((item) => item.observed_routes)),
  };
}

export function compareCoverageDimensions(input: {
  discovered: CoverageDimensions;
  configuredCitySlugs: Iterable<string>;
  configuredCategorySlugs: Iterable<string>;
}) {
  const configuredCities = new Set(input.configuredCitySlugs);
  const configuredCategories = new Set(input.configuredCategorySlugs);
  return {
    missing_geographies: input.discovered.geographies.filter((slug) => !configuredCities.has(slug)),
    discovered_geographies_not_missing: input.discovered.geographies.filter((slug) => configuredCities.has(slug)),
    hierarchical_geography_paths: input.discovered.hierarchical_geography_paths,
    unconfigured_category_slugs: input.discovered.category_slugs.filter((slug) => !configuredCategories.has(slug)),
  };
}
