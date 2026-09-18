import { load } from "cheerio";

export type PartitionRouteLink = {
  family: string;
  url: string;
  label: string;
};

export type PartitionFormControl = {
  form_action: string;
  form_method: string;
  name: string;
  tag: "input" | "select" | "textarea";
  type: string | null;
  option_values: string[];
};

export type PartitionSurfaceInventory = {
  page_url: string;
  route_links: PartitionRouteLink[];
  route_family_counts: Record<string, number>;
  form_controls: PartitionFormControl[];
};

function familyFromUrl(url: URL): string {
  const segments = decodeURIComponent(url.pathname).split("/").filter(Boolean);
  const offset = /^[a-z]{2}$/i.test(segments[0] ?? "") ? 1 : 0;
  return segments[offset] ?? "root";
}

function isMubawabHost(url: URL): boolean {
  return url.hostname === "www.mubawab.ma" || url.hostname === "mubawab.ma";
}

function uniqueSorted(values: Iterable<string>): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, "fr"));
}

export function extractPartitionSurfaceInventory(html: string, pageUrl: string): PartitionSurfaceInventory {
  const $ = load(html);
  const routeByUrl = new Map<string, PartitionRouteLink>();

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
    if (!isMubawabHost(url)) return;
    if (/\/fr\/(?:a|pa)\/\d+/i.test(url.pathname)) return;
    if (/:p:\d+/i.test(url.pathname)) return;

    const family = familyFromUrl(url);
    const label = anchor.text().replace(/\s+/g, " ").trim();
    const normalized = url.toString();
    if (!routeByUrl.has(normalized)) {
      routeByUrl.set(normalized, { family, url: normalized, label });
    }
  });

  const controls: PartitionFormControl[] = [];
  $("form").each((_, formElement) => {
    const form = $(formElement);
    const rawAction = form.attr("action") || pageUrl;
    let action = pageUrl;
    try {
      action = new URL(rawAction, pageUrl).toString();
    } catch {
      // Keep the current page URL if the action is malformed.
    }
    const method = (form.attr("method") || "get").toLowerCase();

    form.find("input[name], select[name], textarea[name]").each((__, controlElement) => {
      const control = $(controlElement);
      const name = control.attr("name")?.trim();
      if (!name) return;
      const tagName = (controlElement as { tagName?: string }).tagName?.toLowerCase();
      if (tagName !== "input" && tagName !== "select" && tagName !== "textarea") return;
      const type = tagName === "input" ? (control.attr("type") || "text").toLowerCase() : null;
      const optionValues = tagName === "select"
        ? uniqueSorted(control.find("option[value]").map((___, option) => $(option).attr("value") || "").get().filter(Boolean))
        : [];
      controls.push({
        form_action: action,
        form_method: method,
        name,
        tag: tagName,
        type,
        option_values: optionValues.slice(0, 50),
      });
    });
  });

  const routeLinks = [...routeByUrl.values()].sort((a, b) => a.url.localeCompare(b.url, "fr"));
  const routeFamilyCounts: Record<string, number> = {};
  for (const link of routeLinks) routeFamilyCounts[link.family] = (routeFamilyCounts[link.family] ?? 0) + 1;

  return {
    page_url: pageUrl,
    route_links: routeLinks,
    route_family_counts: Object.fromEntries(Object.entries(routeFamilyCounts).sort(([a], [b]) => a.localeCompare(b))),
    form_controls: controls.sort((a, b) => `${a.form_action}:${a.name}`.localeCompare(`${b.form_action}:${b.name}`, "fr")),
  };
}
