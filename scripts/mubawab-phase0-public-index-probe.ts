import fs from "node:fs";
import path from "node:path";

import { USER_AGENT, isAllowedByRobots } from "./scrapers/utils/fetch-html";

const OUT_DIR = path.resolve("data-ingestion/runs/mubawab/phase0-public-index-probe");
const OUT_FILE = path.join(OUT_DIR, "proof.json");
const DELAY_MS = 2750;

// Standard public discovery endpoints only. No alternate pagination route is
// guessed here, because Phase 0 must not turn a robots restriction into an
// invitation to invent a bypass.
const CANDIDATES = [
  "https://www.mubawab.ma/sitemap.xml",
  "https://www.mubawab.ma/sitemap_index.xml",
  "https://www.mubawab.ma/sitemap-index.xml",
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function extractLocs(xml: string): string[] {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) => match[1].trim());
}

async function fetchCandidate(url: string) {
  const allowed = await isAllowedByRobots(url);
  if (!allowed) return { url, robots_allowed: false, requested: false };

  const response = await fetch(url, {
    method: "GET",
    redirect: "follow",
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/xml,text/xml,text/plain,text/html;q=0.8,*/*;q=0.5",
    },
    signal: AbortSignal.timeout(20_000),
  });
  const body = await response.text();
  const locs = response.ok ? extractLocs(body) : [];
  const detailLocs = locs.filter((loc) => /\/fr\/(?:a|pa)\/\d+(?:\/|$)/i.test(loc));
  const childSitemaps = locs.filter((loc) => /sitemap/i.test(loc));

  return {
    url,
    robots_allowed: true,
    requested: true,
    status: response.status,
    final_url: response.url,
    content_type: response.headers.get("content-type"),
    body_bytes: Buffer.byteLength(body, "utf8"),
    xml_loc_count: locs.length,
    detail_loc_count: detailLocs.length,
    child_sitemap_count: childSitemaps.length,
    sample_detail_locs: detailLocs.slice(0, 5),
    sample_child_sitemaps: childSitemaps.slice(0, 10),
    looks_like_sitemap: /<urlset\b|<sitemapindex\b/i.test(body),
  };
}

async function main() {
  const observations = [];
  for (let index = 0; index < CANDIDATES.length; index++) {
    if (index > 0) await sleep(DELAY_MS);
    observations.push(await fetchCandidate(CANDIDATES[index]));
  }

  const proof = {
    generated_at: new Date().toISOString(),
    mode: "phase0_public_index_probe",
    safety: {
      candidate_urls: CANDIDATES.length,
      theoretical_max_requests: CANDIDATES.length,
      request_delay_ms: DELAY_MS,
      robots_checked_per_candidate: true,
      detail_pages_opened: 0,
      pagination_requests: 0,
      database_writes: 0,
      production_writes: 0,
      image_downloads: 0,
    },
    observations,
    usable_public_index: observations.some((item) =>
      "looks_like_sitemap" in item && item.looks_like_sitemap === true &&
      (item.detail_loc_count > 0 || item.child_sitemap_count > 0)
    ),
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(proof, null, 2));
  console.log(JSON.stringify(proof, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
