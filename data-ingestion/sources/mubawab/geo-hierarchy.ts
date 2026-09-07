import { load } from "cheerio";

export type GeoHierarchyChild = {
  label: string;
  url: string;
  family: "mpr" | "mprp" | "mprpt" | "mprptd" | "tw";
  count: number | null;
};

export type GeoHierarchyEvidence = {
  page_url: string;
  page_family: string | null;
  page_total_results: number | null;
  children: GeoHierarchyChild[];
};

const HIERARCHY_FAMILIES = new Set(["mpr", "mprp", "mprpt", "mprptd", "tw"]);

function parseCount(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const digits = raw.replace(/[^0-9]/g, "");
  return digits ? Number.parseInt(digits, 10) : null;
}

function familyFromUrl(url: URL): string | null {
  const segments = decodeURIComponent(url.pathname).split("/").filter(Boolean);
  const offset = segments[0] === "fr" ? 1 : 0;
  return segments[offset] ?? null;
}

export function extractGeoHierarchyEvidence(html: string, pageUrl: string): GeoHierarchyEvidence {
  const $ = load(html);
  const page = new URL(pageUrl);
  const bodyText = $("body").text().replace(/\s+/g, " ");
  const totalMatch = bodyText.match(/\(([0-9\s\u00a0\u202f]+)\s+r[ée]sultats?\)/i);
  const children = new Map<string, GeoHierarchyChild>();

  $("a[href]").each((_, element) => {
    const anchor = $(element);
    const href = anchor.attr("href");
    if (!href) return;

    let url: URL;
    try {
      url = new URL(href, pageUrl);
    } catch {
      return;
    }
    if (url.hostname !== "www.mubawab.ma" && url.hostname !== "mubawab.ma") return;

    const family = familyFromUrl(url);
    if (!family || !HIERARCHY_FAMILIES.has(family)) return;

    const label = anchor.text().replace(/\s+/g, " ").trim();
    if (!label) return;

    const containerText = anchor.parent().text().replace(/\s+/g, " ").trim();
    const countMatch = containerText.match(/\(([0-9\s\u00a0\u202f]+)\s+annonces?\)/i);
    const absolute = url.toString();

    if (!children.has(absolute)) {
      children.set(absolute, {
        label,
        url: absolute,
        family: family as GeoHierarchyChild["family"],
        count: parseCount(countMatch?.[1]),
      });
    }
  });

  return {
    page_url: page.toString(),
    page_family: familyFromUrl(page),
    page_total_results: parseCount(totalMatch?.[1]),
    children: [...children.values()].sort((a, b) => a.url.localeCompare(b.url, "fr")),
  };
}
