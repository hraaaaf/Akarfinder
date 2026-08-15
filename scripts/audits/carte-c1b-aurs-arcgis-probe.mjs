import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const PORTAL = "https://geoportail.aurs.org.ma/portal/sharing/rest";
const KNOWN_PUBLIC_STORY = "31377179fa894f93a85846eafc4e14ed";
const OUTPUT = join(process.cwd(), "data/audits/runtime/carte-c1b-aurs-arcgis-probe.json");
const TERMS = ["Rabat", "Agdal", "Ryad", "Riad", "Souissi", "Hassan"];

async function fetchJson(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: { "user-agent": "AkarFinder-C1B-ReadOnly-Geometry-Probe/1.0" },
      signal: controller.signal,
    });
    const text = await response.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}
    return {
      ok: response.ok && Boolean(json) && !json?.error,
      status: response.status,
      json,
      body_preview: text.slice(0, 500),
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      json: null,
      error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function collectServiceUrls(value, bucket = new Set()) {
  if (typeof value === "string") {
    if (/\/(FeatureServer|MapServer)(?:\/|$|\?)/i.test(value)) bucket.add(value);
    return bucket;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectServiceUrls(item, bucket);
    return bucket;
  }
  if (value && typeof value === "object") {
    for (const nested of Object.values(value)) collectServiceUrls(nested, bucket);
  }
  return bucket;
}

async function main() {
  const report = {
    generated_at: new Date().toISOString(),
    mode: "read_only",
    portal: PORTAL,
    known_story_id: KNOWN_PUBLIC_STORY,
    known_story: null,
    searches: {},
    candidates: [],
    service_urls: [],
    verdict: "PENDING",
  };

  const storyUrl = `${PORTAL}/content/items/${KNOWN_PUBLIC_STORY}?f=json`;
  report.known_story = await fetchJson(storyUrl);

  if (!report.known_story.ok) {
    report.verdict = "C1B_AURS_ARCGIS_PORTAL_UNREACHABLE";
    mkdirSync(dirname(OUTPUT), { recursive: true });
    writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 2;
    return;
  }

  const byId = new Map();
  for (const term of TERMS) {
    const query = encodeURIComponent(term);
    const url = `${PORTAL}/search?f=json&num=100&q=${query}`;
    const result = await fetchJson(url);
    report.searches[term] = {
      ok: result.ok,
      status: result.status,
      total: result.json?.total ?? null,
      error: result.error ?? result.json?.error ?? null,
    };
    for (const item of result.json?.results ?? []) {
      byId.set(item.id, {
        id: item.id,
        title: item.title,
        type: item.type,
        url: item.url ?? null,
        owner: item.owner ?? null,
        tags: item.tags ?? [],
        description: item.description ?? null,
      });
    }
  }

  const candidates = [...byId.values()].filter((item) => {
    const haystack = [item.title, item.type, item.url, item.description, ...(item.tags ?? [])]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return /(rabat|agdal|ryad|riad|souissi|hassan)/i.test(haystack);
  });

  const serviceUrls = new Set();
  for (const item of candidates.slice(0, 80)) {
    collectServiceUrls(item.url, serviceUrls);
    if (/web map|web mapping application|storymap|feature collection/i.test(item.type ?? "")) {
      const data = await fetchJson(`${PORTAL}/content/items/${item.id}/data?f=json`);
      if (data.ok) collectServiceUrls(data.json, serviceUrls);
    }
  }

  report.candidates = candidates;
  report.service_urls = [...serviceUrls].sort();

  const hasRabatCandidate = candidates.some((item) => /rabat/i.test(`${item.title ?? ""} ${item.description ?? ""} ${(item.tags ?? []).join(" ")}`));
  const hasTargetName = candidates.some((item) => /(agdal|ryad|riad|souissi)/i.test(`${item.title ?? ""} ${item.description ?? ""} ${(item.tags ?? []).join(" ")}`));

  report.verdict = hasRabatCandidate
    ? (report.service_urls.length > 0 || hasTargetName
        ? "C1B_AURS_ARCGIS_CANDIDATES_FOUND"
        : "C1B_AURS_RABAT_ITEMS_FOUND_NO_SERVICE_URL_YET")
    : "C1B_AURS_NO_RABAT_CANDIDATE_FOUND";

  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));

  if (report.verdict !== "C1B_AURS_ARCGIS_CANDIDATES_FOUND") process.exitCode = 3;
}

await main();
