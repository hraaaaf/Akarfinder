import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  DEFAULT_NATIONAL_OVERLAP_SURFACES,
  probeCatalogOverlap,
} from "../data-ingestion/sources/mubawab/catalog-overlap.js";
import type { FullCoveragePersistentState } from "../data-ingestion/sources/mubawab/full-coverage-state.js";
import { fetchHtml, isAllowedByRobots } from "./scrapers/utils/fetch-html.js";

const INPUT_STATE = join(process.cwd(), "data-ingestion", "runs", "mubawab", "lot9-live-campaign", "state.json");
const OUTPUT_DIR = join(process.cwd(), "data-ingestion", "runs", "mubawab", "lot9-catalog-overlap");
const PROOF_PATH = join(OUTPUT_DIR, "proof.json");
const REQUEST_DELAY_MS = 2750;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const state = JSON.parse(await readFile(INPUT_STATE, "utf8")) as FullCoveragePersistentState;
  if (state.version !== 1 || state.source !== "mubawab") throw new Error("lot9_catalog_overlap_invalid_state");

  await mkdir(OUTPUT_DIR, { recursive: true });
  let lastRequestAt = 0;
  const requestedUrls: string[] = [];

  const result = await probeCatalogOverlap({
    knownSourceIds: state.seen_source_ids,
    surfaces: DEFAULT_NATIONAL_OVERLAP_SURFACES,
    fetchPage: async (url) => {
      if (!(await isAllowedByRobots(url))) throw new Error(`robots_disallowed:${url}`);
      const elapsed = Date.now() - lastRequestAt;
      if (lastRequestAt > 0 && elapsed < REQUEST_DELAY_MS) await sleep(REQUEST_DELAY_MS - elapsed);
      requestedUrls.push(url);
      lastRequestAt = Date.now();
      const response = await fetchHtml(url, { timeoutMs: 20_000 });
      return response.html;
    },
  });

  const proof = {
    generated_at: new Date().toISOString(),
    mode: "catalog_overlap_probe",
    baseline_unique_ids: state.seen_source_ids.length,
    safety: {
      surfaces: DEFAULT_NATIONAL_OVERLAP_SURFACES.length,
      pages_per_surface: 2,
      theoretical_max_page_requests: DEFAULT_NATIONAL_OVERLAP_SURFACES.reduce((sum, surface) => sum + surface.pages, 0),
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

  if (requestedUrls.length !== 12) throw new Error(`lot9_catalog_overlap_unexpected_request_count:${requestedUrls.length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
