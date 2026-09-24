import { writeFile, mkdir } from "node:fs/promises";

const base = process.env.AUC_PORTAL_BASE || "https://carto.auc.ma/portal";
const out = process.env.AUC_PROBE_OUT || "artifacts/auc-arcgis-probe.json";
const terms = ["Anfa","Maârif","Maarif","Ain Chock","Hay Hassani","Casablanca Finance City","Sidi Maarouf","Californie"];

async function getJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": "AkarFinder-Landmark-Factory/1.0" } });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); }
  catch { throw new Error(`Non-JSON response ${res.status} from ${url}: ${text.slice(0,180)}`); }
  if (!res.ok || json?.error) throw new Error(`ArcGIS error from ${url}: ${JSON.stringify(json?.error ?? {status:res.status})}`);
  return json;
}

function collectServiceUrls(value, found = new Set()) {
  if (!value) return found;
  if (typeof value === "string") {
    if (/https?:\/\/[^\s"'<>]+\/(?:FeatureServer|MapServer)(?:\/\d+)?/i.test(value)) found.add(value);
    return found;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectServiceUrls(item, found);
    return found;
  }
  if (typeof value === "object") {
    for (const item of Object.values(value)) collectServiceUrls(item, found);
  }
  return found;
}

const queries = terms.map((term) => ({
  term,
  q: `title:"${term}" OR tags:"${term}"`,
}));
const discovered = [];

for (const {term,q} of queries) {
  const searchUrl = new URL(`${base}/sharing/rest/search`);
  searchUrl.searchParams.set("q", q);
  searchUrl.searchParams.set("num", "100");
  searchUrl.searchParams.set("f", "json");
  const search = await getJson(searchUrl.toString());
  for (const item of search.results ?? []) {
    const itemUrl = new URL(`${base}/sharing/rest/content/items/${item.id}`);
    itemUrl.searchParams.set("f","json");
    const meta = await getJson(itemUrl.toString());
    let data = null;
    try {
      const dataUrl = new URL(`${base}/sharing/rest/content/items/${item.id}/data`);
      dataUrl.searchParams.set("f","json");
      data = await getJson(dataUrl.toString());
    } catch {}
    discovered.push({
      matched_term: term,
      id: item.id,
      title: item.title,
      type: item.type,
      owner: item.owner,
      access: item.access,
      url: item.url ?? meta.url ?? null,
      tags: item.tags ?? [],
      service_urls: [...collectServiceUrls(data)],
    });
  }
}

const dedup = [...new Map(discovered.map((item) => [item.id, item])).values()];
const likely = dedup.filter((item) =>
  item.access === "public" &&
  (item.type?.includes("Web Map") || item.type?.includes("Web Mapping Application") || item.type?.includes("Feature Service") || item.type?.includes("Map Service"))
);

const payload = {
  schema_version: 1,
  portal: base,
  evidence_role: "AUC_PUBLIC_ARCGIS_DISCOVERY_ONLY",
  activation_allowed: false,
  geometry_promotion_allowed: false,
  searched_terms: terms,
  summary: {
    discovered_item_count: dedup.length,
    likely_public_map_item_count: likely.length,
    service_url_count: new Set(dedup.flatMap((item) => item.service_urls)).size,
  },
  items: dedup,
  likely_public_map_items: likely,
  guardrails: [
    "Discovery does not certify a product-neighborhood boundary.",
    "Only public AUC-hosted ArcGIS resources are recorded.",
    "Any geometry extracted later must preserve source metadata and remain shadow until separately reviewed.",
    "No inferred polygon, buffer, Voronoi, midpoint or manual road-loop reconstruction is allowed."
  ]
};

await mkdir(out.split("/").slice(0,-1).join("/") || ".", { recursive: true });
await writeFile(out, JSON.stringify(payload, null, 2) + "\n");
console.log(JSON.stringify(payload.summary, null, 2));
if (!dedup.length) process.exitCode = 2;
