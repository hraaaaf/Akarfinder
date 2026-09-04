import { appendFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { runFullCoverageCampaign } from "../data-ingestion/sources/mubawab/full-coverage-campaign.js";
import { resolveLiveCampaignPolicy } from "../data-ingestion/sources/mubawab/live-campaign-policy.js";
import {
  createFullCoverageState,
  fullCoverageStateSummary,
  type FullCoveragePersistentState,
} from "../data-ingestion/sources/mubawab/full-coverage-state.js";
import { fetchHtml, isAllowedByRobots } from "./scrapers/utils/fetch-html.js";

const OUTPUT_DIR = join(process.cwd(), "data-ingestion", "runs", "mubawab", "lot9-live-campaign");
const STATE_PATH = join(OUTPUT_DIR, "state.json");
const REFS_PATH = join(OUTPUT_DIR, "refs.jsonl");
const PROOF_PATH = join(OUTPUT_DIR, "proof.json");
const REQUESTS_PATH = join(OUTPUT_DIR, "requested-urls.json");

const policy = resolveLiveCampaignPolicy();
const PAGE_WINDOW = policy.pageWindow;
const MAX_WAVES = policy.maxWaves;
const MAX_PARTITIONS_PER_WAVE = policy.maxPartitionsPerWave;
const REQUEST_DELAY_MS = policy.requestDelayMs;
const resumeMode = process.argv.includes("--resume");

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function loadOrCreateState(): Promise<FullCoveragePersistentState> {
  if (resumeMode) {
    const raw = await readFile(STATE_PATH, "utf8");
    const state = JSON.parse(raw) as FullCoveragePersistentState;
    if (state.version !== 1 || state.source !== "mubawab") throw new Error("lot9_live_campaign_invalid_resume_state");
    if (state.page_window !== PAGE_WINDOW) throw new Error(`lot9_live_campaign_page_window_mismatch:${state.page_window}:${PAGE_WINDOW}`);
    return state;
  }

  await rm(OUTPUT_DIR, { recursive: true, force: true });
  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(REFS_PATH, "");
  return createFullCoverageState({ pageWindow: PAGE_WINDOW });
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  let state = await loadOrCreateState();
  let lastRequestAt = 0;
  let sourceBlocked = false;
  const requestedUrls: string[] = [];

  const fetchPage = async (url: string): Promise<string> => {
    if (!(await isAllowedByRobots(url))) throw new Error(`robots_disallowed:${url}`);

    const elapsed = Date.now() - lastRequestAt;
    if (lastRequestAt > 0 && elapsed < REQUEST_DELAY_MS) await sleep(REQUEST_DELAY_MS - elapsed);

    requestedUrls.push(url);
    lastRequestAt = Date.now();
    try {
      const result = await fetchHtml(url, { timeoutMs: 20_000 });
      return result.html;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/HTTP\s+(403|429)\b/.test(message)) {
        sourceBlocked = true;
        throw new Error(`explicit_source_block:${message}`);
      }
      throw error;
    }
  };

  const campaign = await runFullCoverageCampaign({
    state,
    fetchPage,
    maxWaves: MAX_WAVES,
    maxPartitionsPerWave: MAX_PARTITIONS_PER_WAVE,
    isKilled: () => sourceBlocked,
    onCheckpoint: async (checkpointState, wave) => {
      state = checkpointState;
      await writeFile(STATE_PATH, JSON.stringify(checkpointState, null, 2));
      for (const ref of wave.new_refs) await appendFile(REFS_PATH, `${JSON.stringify(ref)}\n`);
      const waveNo = String(checkpointState.totals.waves_completed).padStart(4, "0");
      await writeFile(join(OUTPUT_DIR, `wave-${waveNo}.json`), JSON.stringify({
        generated_at: new Date().toISOString(),
        summary: wave.summary,
        new_refs: wave.new_refs.length,
      }, null, 2));
    },
  });

  state = campaign.state;
  await writeFile(STATE_PATH, JSON.stringify(state, null, 2));
  await writeFile(REQUESTS_PATH, JSON.stringify(requestedUrls, null, 2));

  const proof = {
    generated_at: new Date().toISOString(),
    mode: resumeMode ? "live_campaign_resume" : "live_campaign_initial",
    safety: {
      max_waves: MAX_WAVES,
      max_partitions_per_wave: MAX_PARTITIONS_PER_WAVE,
      page_window: PAGE_WINDOW,
      theoretical_max_page_requests: policy.theoreticalMaxPageRequests,
      request_delay_ms: REQUEST_DELAY_MS,
      robots_checked: true,
      source_block_global_stop: true,
      detail_pages_opened: 0,
      database_writes: 0,
      production_writes: 0,
      image_downloads: 0,
    },
    campaign: {
      waves_executed: campaign.waves_executed,
      stopped_by_kill_switch: campaign.stopped_by_kill_switch,
      exhausted_pending_partitions: campaign.exhausted_pending_partitions,
      source_blocked: sourceBlocked,
      requested_urls: requestedUrls.length,
    },
    state: fullCoverageStateSummary(state),
  };
  await writeFile(PROOF_PATH, JSON.stringify(proof, null, 2));

  console.log(JSON.stringify(proof, null, 2));

  if (state.totals.pages_succeeded < 1) throw new Error("lot9_live_campaign_no_pages_succeeded");
  if (state.partitions.some((partition) => partition.status === "failed")) {
    throw new Error(`lot9_live_campaign_partition_failures:${state.partitions.filter((partition) => partition.status === "failed").length}`);
  }
  if (sourceBlocked) throw new Error("lot9_live_campaign_source_blocked");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
