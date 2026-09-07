import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  createCatalogCoverageState,
  runCatalogCoverageWave,
  type CatalogCoverageState,
  type CatalogCoverageSurfaceConfig,
} from "../data-ingestion/sources/mubawab/catalog-coverage-campaign.js";
import type { FullCoveragePersistentState } from "../data-ingestion/sources/mubawab/full-coverage-state.js";
import { fetchHtml, isAllowedByRobots } from "./scrapers/utils/fetch-html.js";

const CLASSIC_STATE = join(process.cwd(), "data-ingestion", "runs", "mubawab", "lot9-live-campaign", "state.json");
const OUTPUT_DIR = join(process.cwd(), "data-ingestion", "runs", "mubawab", "lot9-office-catalog-campaign");
const STATE_PATH = join(OUTPUT_DIR, "state.json");
const PROOF_PATH = join(OUTPUT_DIR, "proof.json");
const REQUESTED_URLS_PATH = join(OUTPUT_DIR, "requested-urls.json");

const REQUEST_DELAY_MS = 2750;
const MAX_PAGES = Number.parseInt(process.env.LOT9_CATALOG_MAX_PAGES ?? "80", 10);
const MAX_PAGES_PER_SURFACE = Number.parseInt(process.env.LOT9_CATALOG_MAX_PAGES_PER_SURFACE ?? "40", 10);
const RESUME = process.argv.includes("--resume");

const SURFACES: CatalogCoverageSurfaceConfig[] = [
  { id: "sc-office-sale", base_url: "https://www.mubawab.ma/fr/sc/bureaux-et-commerces-a-vendre" },
  { id: "sc-office-rent", base_url: "https://www.mubawab.ma/fr/sc/bureaux-et-commerces-a-louer" },
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function loadInitialState(): Promise<CatalogCoverageState> {
  if (RESUME) {
    const restored = JSON.parse(await readFile(STATE_PATH, "utf8")) as CatalogCoverageState;
    if (restored.version !== 1 || restored.source !== "mubawab") throw new Error("lot9_office_catalog_invalid_resume_state");
    return restored;
  }

  const classic = JSON.parse(await readFile(CLASSIC_STATE, "utf8")) as FullCoveragePersistentState;
  if (classic.version !== 1 || classic.source !== "mubawab") throw new Error("lot9_office_catalog_invalid_classic_state");
  return createCatalogCoverageState({ baselineSourceIds: classic.seen_source_ids, surfaces: SURFACES });
}

async function main() {
  if (!Number.isInteger(MAX_PAGES) || MAX_PAGES < 1 || MAX_PAGES > 300) throw new Error(`lot9_office_catalog_invalid_max_pages:${MAX_PAGES}`);
  if (!Number.isInteger(MAX_PAGES_PER_SURFACE) || MAX_PAGES_PER_SURFACE < 1 || MAX_PAGES_PER_SURFACE > 150) {
    throw new Error(`lot9_office_catalog_invalid_surface_cap:${MAX_PAGES_PER_SURFACE}`);
  }

  await mkdir(OUTPUT_DIR, { recursive: true });
  let state = await loadInitialState();
  const beforeUnique = state.seen_source_ids.length;
  const beforePages = state.totals.pages_requested;
  const requestedUrls: string[] = [];
  let lastRequestAt = 0;
  let sourceBlocked = false;

  const waveId = `office-${RESUME ? "resume" : "initial"}-${new Date().toISOString()}`;

  try {
    state = await runCatalogCoverageWave({
      state,
      waveId,
      maxPages: MAX_PAGES,
      maxPagesPerSurface: MAX_PAGES_PER_SURFACE,
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
          if (message.startsWith("HTTP 403") || message.startsWith("HTTP 429")) sourceBlocked = true;
          throw error;
        }
      },
      onCheckpoint: async (checkpoint) => {
        await writeFile(STATE_PATH, JSON.stringify(checkpoint, null, 2));
      },
    });
  } finally {
    await writeFile(STATE_PATH, JSON.stringify(state, null, 2));
    await writeFile(REQUESTED_URLS_PATH, JSON.stringify(requestedUrls, null, 2));
  }

  const proof = {
    generated_at: new Date().toISOString(),
    mode: RESUME ? "office_catalog_campaign_resume" : "office_catalog_campaign_initial",
    wave_id: waveId,
    safety: {
      max_pages: MAX_PAGES,
      max_pages_per_surface: MAX_PAGES_PER_SURFACE,
      request_delay_ms: REQUEST_DELAY_MS,
      robots_checked: true,
      source_blocked: sourceBlocked,
      detail_pages_opened: 0,
      database_writes: 0,
      production_writes: 0,
      image_downloads: 0,
    },
    delta: {
      pages_requested: state.totals.pages_requested - beforePages,
      unique_ids_added: state.seen_source_ids.length - beforeUnique,
    },
    cumulative: {
      baseline_unique_ids: state.baseline_unique_ids,
      total_unique_ids: state.seen_source_ids.length,
      catalog_unique_added: state.totals.global_unique_added,
      pages_requested: state.totals.pages_requested,
      refs_discovered: state.totals.refs_discovered,
      completed_surfaces: state.surfaces.filter((surface) => surface.completed).length,
      pending_surfaces: state.surfaces.filter((surface) => !surface.completed).length,
    },
    surfaces: state.surfaces.map((surface) => ({
      id: surface.id,
      next_page: surface.next_page,
      completed: surface.completed,
      stop_reason: surface.stop_reason,
      pages_requested: surface.pages_requested,
      refs_discovered: surface.refs_discovered,
      global_unique_added: surface.global_unique_added,
      unique_ids_on_surface: surface.seen_source_ids.length,
    })),
  };

  await writeFile(PROOF_PATH, JSON.stringify(proof, null, 2));
  console.log(JSON.stringify(proof, null, 2));

  if (sourceBlocked) throw new Error("lot9_office_catalog_source_blocked");
  if (state.seen_source_ids.length < state.baseline_unique_ids) throw new Error("lot9_office_catalog_seen_id_regression");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
