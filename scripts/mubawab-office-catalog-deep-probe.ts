import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { probeCatalogOverlap, type CatalogOverlapSurface } from "../data-ingestion/sources/mubawab/catalog-overlap.js";
import type { FullCoveragePersistentState } from "../data-ingestion/sources/mubawab/full-coverage-state.js";
import { fetchHtml, isAllowedByRobots } from "./scrapers/utils/fetch-html.js";

const INPUT_STATE = join(process.cwd(), "data-ingestion", "runs", "mubawab", "lot9-live-campaign", "state.json");
const OUTPUT_DIR = join(process.cwd(), "data-ingestion", "runs", "mubawab", "lot9-office-catalog-deep-probe");
const PROOF_PATH = join(OUTPUT_DIR, "proof.json");
const REQUEST_DELAY_MS = 2750;
const START_PAGE = 3;
const PAGES_PER_SURFACE = 8;

const SURFACES: CatalogOverlapSurface[] = [
  {
    id: "sc-office-sale-p3-p10",
    base_url: "https://www.mubawab.ma/fr/sc/bureaux-et-commerces-a-vendre",
    start_page: START_PAGE,
    pages: PAGES_PER_SURFACE,
  },
  {
    id: "sc-office-rent-p3-p10",
    base_url: "https://www.mubawab.ma/fr/sc/bureaux-et-commerces-a-louer",
    start_page: START_PAGE,
    pages: PAGES_PER_SURFACE,
  },
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const state = JSON.parse(await readFile(INPUT_STATE, "utf8")) as FullCoveragePersistentState;
  if (state.version !== 1 || state.source !== "mubawab") throw new Error("lot9_office_deep_probe_invalid_state");

  await mkdir(OUTPUT_DIR, { recursive: true });
  let lastRequestAt = 0;
  const requestedUrls: string[] = [];

  const result = await probeCatalogOverlap({
    knownSourceIds: state.seen_source_ids,
    surfaces: SURFACES,
    fetchPage: async (url) => {
      if (!(await isAllowedByRobots(url))) throw new Error(`robots_disallowed:${url}`);
      const elapsed = Date.now() - lastRequestAt;
      if (lastRequestAt > 0 && elapsed < REQUEST_DELAY_MS) await sleep(REQUEST_DELAY_MS - elapsed);
      requestedUrls.push(url);
      lastRequestAt = Date.now();
      try {
        const response = await fetchHtml(url, { timeoutMs: 20_000 });
        return response.html;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.startsWith("HTTP 403") || message.startsWith("HTTP 429")) {
          throw new Error(`explicit_source_block:${message}`);
        }
        throw error;
      }
    },
  });

  const proof = {
    generated_at: new Date().toISOString(),
    mode: "office_catalog_deep_probe",
    baseline_unique_ids: state.seen_source_ids.length,
    safety: {
      surfaces: SURFACES.length,
      start_page: START_PAGE,
      pages_per_surface: PAGES_PER_SURFACE,
      theoretical_max_page_requests: SURFACES.reduce((sum, surface) => sum + surface.pages, 0),
      request_delay_ms: REQUEST_DELAY_MS,
      robots_checked: true,
      detail_pages_opened: 0,
      database_writes: 0,
      production_writes: 0,
      image_downloads: 0,
    },
    requested_urls: requestedUrls,
    result,
  };

  await writeFile(PROOF_PATH, JSON.stringify(proof, null, 2));
  console.log(JSON.stringify(proof, null, 2));

  const expectedRequests = SURFACES.reduce((sum, surface) => sum + surface.pages, 0);
  if (requestedUrls.length !== expectedRequests) {
    throw new Error(`lot9_office_deep_probe_unexpected_request_count:${requestedUrls.length}:${expectedRequests}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
