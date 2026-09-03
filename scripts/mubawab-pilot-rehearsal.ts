import { appendFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { runDiscovery, type DiscoveredListingRef } from "../data-ingestion/sources/mubawab/discovery.js";
import { extractMubawabCollectionListing } from "../data-ingestion/sources/mubawab/extractor.js";
import { fetchHtml, isAllowedByRobots } from "./scrapers/utils/fetch-html.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputDir = join(__dirname, "..", "data-ingestion", "runs", "mubawab", "lot4-pilot-rehearsal");
const manifestPath = join(outputDir, "manifest.json");
const checkpointPath = join(outputDir, "checkpoint.json");
const candidatesPath = join(outputDir, "candidates.json");
const listingsPath = join(outputDir, "listings.jsonl");
const errorsPath = join(outputDir, "errors.jsonl");
const proofPath = join(outputDir, "proof.json");

const MAX_DISCOVERY_PAGES = 2;
const MAX_DETAIL_FETCHES = 40;
const FIRST_PASS_LIMIT = 15;
const REQUEST_DELAY_MS = 750;

const resumeMode = process.argv.includes("--resume");

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function checkedFetch(url: string) {
  const allowed = await isAllowedByRobots(url);
  if (!allowed) throw new Error(`robots_disallowed:${url}`);
  try {
    return await fetchHtml(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/HTTP\s+(403|429)\b/.test(message)) throw new Error(`explicit_source_block:${message}`);
    throw error;
  }
}

function isAcceptable(listing: ReturnType<typeof extractMubawabCollectionListing>) {
  if (!listing.title || !listing.location.city) return false;
  if (!listing.transaction) return false;
  if (!listing.property_type || listing.property_type === "unknown") return false;
  if (listing.price.amount == null && !listing.price.on_request) return false;
  return true;
}

type PilotError = {
  stage: string;
  url: string | null;
  source_id: string | null;
  message: string;
  retryable: boolean;
};

type PilotManifest = {
  run_id: string;
  source: "mubawab";
  started_at: string;
  completed_at: string | null;
  status: "running" | "completed" | "partial" | "failed" | "cancelled";
  pages_discovered: number;
  pages_processed: number;
  listings_discovered: number;
  listings_fetched: number;
  listings_normalized: number;
  listings_rejected: number;
  duplicates: number;
  errors: PilotError[];
};

type Checkpoint = {
  next_index: number;
  processed_source_ids: string[];
  first_pass_processed: number;
};

async function initialize() {
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });
  const startedAt = new Date().toISOString();

  const discovery = await runDiscovery(
    async (url) => (await checkedFetch(url)).html,
    { maxPages: MAX_DISCOVERY_PAGES, city: "Casablanca", category_key: "apartment_sale" },
  );

  if (discovery.manifest.pages_failed > 0) {
    throw new Error(`discovery_failed_pages:${discovery.manifest.pages_failed}`);
  }

  const candidates = discovery.listings.slice(0, MAX_DETAIL_FETCHES);
  if (candidates.length < FIRST_PASS_LIMIT) throw new Error(`insufficient_candidates:${candidates.length}`);

  const manifest: PilotManifest = {
    run_id: `mubawab-lot4-rehearsal-${startedAt.replace(/[:.]/g, "-")}`,
    source: "mubawab",
    started_at: startedAt,
    completed_at: null,
    status: "running",
    pages_discovered: discovery.manifest.pages_requested,
    pages_processed: discovery.manifest.pages_succeeded,
    listings_discovered: discovery.manifest.unique_listings,
    listings_fetched: 0,
    listings_normalized: 0,
    listings_rejected: 0,
    duplicates: discovery.manifest.duplicate_refs,
    errors: [],
  };
  const checkpoint: Checkpoint = { next_index: 0, processed_source_ids: [], first_pass_processed: 0 };

  await writeFile(candidatesPath, JSON.stringify(candidates, null, 2), "utf8");
  await writeFile(join(outputDir, "discovery.json"), JSON.stringify(discovery.manifest, null, 2), "utf8");
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
  await writeFile(checkpointPath, JSON.stringify(checkpoint, null, 2), "utf8");
  await writeFile(listingsPath, "", "utf8");
  await writeFile(errorsPath, "", "utf8");
}

async function processBatch(limit: number) {
  const candidates = JSON.parse(await readFile(candidatesPath, "utf8")) as DiscoveredListingRef[];
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as PilotManifest;
  const checkpoint = JSON.parse(await readFile(checkpointPath, "utf8")) as Checkpoint;

  let processedThisPass = 0;
  manifest.status = "running";
  manifest.completed_at = null;

  while (checkpoint.next_index < candidates.length && processedThisPass < limit) {
    const ref = candidates[checkpoint.next_index];
    if (checkpoint.processed_source_ids.includes(ref.source_id)) {
      throw new Error(`checkpoint_duplicate:${ref.source_id}`);
    }

    try {
      const fetched = await checkedFetch(ref.url);
      const listing = extractMubawabCollectionListing(ref.url, fetched.html);
      manifest.listings_fetched += 1;
      if (isAcceptable(listing)) manifest.listings_normalized += 1;
      else manifest.listings_rejected += 1;
      await appendFile(listingsPath, `${JSON.stringify(listing)}\n`, "utf8");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/^(?:robots_disallowed|explicit_source_block):/.test(message)) {
        manifest.status = "failed";
        manifest.completed_at = new Date().toISOString();
        manifest.errors.push({ stage: "detail", url: ref.url, source_id: ref.source_id, message, retryable: false });
        await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
        await appendFile(errorsPath, `${JSON.stringify(manifest.errors.at(-1))}\n`, "utf8");
        throw error;
      }
      const entry: PilotError = { stage: "detail", url: ref.url, source_id: ref.source_id, message, retryable: true };
      manifest.errors.push(entry);
      await appendFile(errorsPath, `${JSON.stringify(entry)}\n`, "utf8");
    }

    checkpoint.processed_source_ids.push(ref.source_id);
    checkpoint.next_index += 1;
    processedThisPass += 1;
    await writeFile(checkpointPath, JSON.stringify(checkpoint, null, 2), "utf8");
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

    if (checkpoint.next_index < candidates.length && processedThisPass < limit) await sleep(REQUEST_DELAY_MS);
  }

  if (!resumeMode) checkpoint.first_pass_processed = processedThisPass;
  const completed = checkpoint.next_index >= candidates.length;
  manifest.status = completed ? "completed" : "partial";
  manifest.completed_at = new Date().toISOString();
  await writeFile(checkpointPath, JSON.stringify(checkpoint, null, 2), "utf8");
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

  const proof = {
    generated_at: new Date().toISOString(),
    scope: "Casablanca × apartment_sale",
    discovery_pages_max: MAX_DISCOVERY_PAGES,
    detail_fetch_cap: MAX_DETAIL_FETCHES,
    request_delay_ms: REQUEST_DELAY_MS,
    first_pass_limit: FIRST_PASS_LIMIT,
    first_pass_processed: checkpoint.first_pass_processed,
    resumed: resumeMode,
    resume_observed: resumeMode && checkpoint.first_pass_processed > 0,
    checkpoint_next_index: checkpoint.next_index,
    candidates: candidates.length,
    database_writes: 0,
    image_downloads: 0,
    mass_ingestion: false,
    manifest,
  };
  await writeFile(proofPath, JSON.stringify(proof, null, 2), "utf8");
  console.log(JSON.stringify(proof, null, 2));
}

async function main() {
  if (!resumeMode) {
    await initialize();
    await processBatch(FIRST_PASS_LIMIT);
    return;
  }

  await processBatch(MAX_DETAIL_FETCHES);
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as PilotManifest;
  const checkpoint = JSON.parse(await readFile(checkpointPath, "utf8")) as Checkpoint;
  if (manifest.status !== "completed") throw new Error(`pilot_not_completed:${manifest.status}`);
  if (checkpoint.first_pass_processed !== FIRST_PASS_LIMIT) throw new Error(`resume_first_pass_mismatch:${checkpoint.first_pass_processed}`);
  if (checkpoint.processed_source_ids.length !== new Set(checkpoint.processed_source_ids).size) throw new Error("resume_duplicate_source_id");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
