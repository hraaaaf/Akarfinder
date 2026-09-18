import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { runFullCoverageWave } from "../data-ingestion/sources/mubawab/full-coverage-runner.js";
import { buildInitialFullCoveragePlan } from "../data-ingestion/sources/mubawab/full-coverage.js";
import { fetchHtml, isAllowedByRobots } from "./scrapers/utils/fetch-html.js";

const OUTPUT_DIR = join(process.cwd(), "data-ingestion", "runs", "mubawab", "lot9-live-wave");
const PAGE_WINDOW = 2;
const MAX_PARTITIONS = 2;
const REQUEST_DELAY_MS = 1500;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  let lastRequestAt = 0;
  let sourceBlocked = false;
  const requestedUrls: string[] = [];

  const fetchPage = async (url: string): Promise<string> => {
    if (!(await isAllowedByRobots(url))) {
      throw new Error(`robots_disallowed:${url}`);
    }

    const elapsed = Date.now() - lastRequestAt;
    if (lastRequestAt > 0 && elapsed < REQUEST_DELAY_MS) {
      await sleep(REQUEST_DELAY_MS - elapsed);
    }

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

  const partitions = buildInitialFullCoveragePlan(PAGE_WINDOW);
  const result = await runFullCoverageWave({
    partitions,
    fetchPage,
    maxPartitions: MAX_PARTITIONS,
    pageWindow: PAGE_WINDOW,
    isKilled: () => sourceBlocked,
  });

  const started = result.partitions.filter((partition) => partition.status !== "pending");
  const proof = {
    generated_at: new Date().toISOString(),
    mode: "live_discovery_only",
    safety: {
      max_partitions: MAX_PARTITIONS,
      page_window: PAGE_WINDOW,
      request_delay_ms: REQUEST_DELAY_MS,
      robots_checked: true,
      source_block_global_stop: true,
      detail_pages_opened: 0,
      database_writes: 0,
      production_writes: 0,
      image_downloads: 0,
    },
    summary: result.summary,
    requested_urls: requestedUrls,
    started_partitions: started,
    new_refs_count: result.new_refs.length,
    new_refs: result.new_refs,
    source_blocked: sourceBlocked,
  };

  await writeFile(join(OUTPUT_DIR, "proof.json"), JSON.stringify(proof, null, 2));
  await writeFile(join(OUTPUT_DIR, "refs.json"), JSON.stringify(result.new_refs, null, 2));

  console.log(JSON.stringify({
    summary: result.summary,
    source_blocked: sourceBlocked,
    requested_urls: requestedUrls.length,
    new_refs: result.new_refs.length,
    stop_reasons: started.map((partition) => ({ partition_id: partition.partition_id, stop_reason: partition.stop_reason, status: partition.status })),
  }, null, 2));

  if (result.summary.pages_succeeded < 1) {
    throw new Error("lot9_live_wave_no_pages_succeeded");
  }
  if (result.summary.partitions_failed > 0) {
    throw new Error(`lot9_live_wave_partition_failures:${result.summary.partitions_failed}`);
  }
  if (sourceBlocked) {
    throw new Error("lot9_live_wave_source_blocked");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
