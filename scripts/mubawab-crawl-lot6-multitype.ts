import { appendFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { runDiscovery, type DiscoveredListingRef } from "../data-ingestion/sources/mubawab/discovery.js";
import { extractMubawabCollectionListing } from "../data-ingestion/sources/mubawab/extractor.js";
import { inferContextualTransaction, type DiscoveryTransaction } from "../data-ingestion/transaction-context.js";
import { fetchHtml, isAllowedByRobots } from "./scrapers/utils/fetch-html.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputDir = join(__dirname, "..", "data-ingestion", "runs", "mubawab", "lot6-multitype");
const manifestPath = join(outputDir, "manifest.json");
const checkpointPath = join(outputDir, "checkpoint.json");
const candidatesPath = join(outputDir, "candidates.json");
const coveragePath = join(outputDir, "coverage.json");
const errorsPath = join(outputDir, "errors.jsonl");
const proofPath = join(outputDir, "proof.json");

const MAX_PAGES_PER_COMBO = 1;
const DETAIL_CAP = 270;
const FIRST_PASS_LIMIT = 45;
const CHUNK_SIZE = 45;
const REQUEST_DELAY_MS = 750;
const TARGET_PER_SCOPE = 15;

const CITIES = ["Casablanca", "Rabat"] as const;
const CATEGORIES = [
  { key: "apartment_sale", transaction: "sale" as const },
  { key: "apartment_rent", transaction: "rent" as const },
  { key: "villa_sale", transaction: "sale" as const },
  { key: "villa_rent", transaction: "rent" as const },
  { key: "house_sale", transaction: "sale" as const },
  { key: "house_rent", transaction: "rent" as const },
  { key: "commercial_sale", transaction: "sale" as const },
  { key: "commercial_rent", transaction: "rent" as const },
  { key: "land_sale", transaction: "sale" as const },
] as const;
const SCOPES = CITIES.flatMap((city) => CATEGORIES.map((category) => ({
  id: `${city.toLowerCase()}_${category.key}`,
  city,
  category_key: category.key,
  transaction: category.transaction,
})));

const resumeMode = process.argv.includes("--resume");
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
type Listing = ReturnType<typeof extractMubawabCollectionListing>;
type Context = { scope_id: string; city: string; category_key: string; transaction: DiscoveryTransaction; route_url: string };
type Candidate = Omit<DiscoveredListingRef, "route_url"> & { contexts: Context[] };
type Manifest = {
  run_id: string; source: "mubawab"; started_at: string; completed_at: string | null;
  status: "running" | "completed" | "partial" | "failed";
  pages_discovered: number; pages_processed: number; listings_discovered: number;
  listings_fetched: number; listings_normalized: number; listings_rejected: number;
  duplicates: number; errors: Array<{ stage: string; source_id: string | null; url: string | null; message: string; retryable: boolean }>;
};
type Checkpoint = { next_index: number; processed_source_ids: string[]; first_pass_processed: number };

async function checkedFetch(url: string) {
  if (!(await isAllowedByRobots(url))) throw new Error(`robots_disallowed:${url}`);
  try { return await fetchHtml(url); }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/HTTP\s+(403|429)\b/.test(message)) throw new Error(`explicit_source_block:${message}`);
    throw error;
  }
}

function chunkPath(index: number) {
  return join(outputDir, `listings-${String(Math.floor((index - 1) / CHUNK_SIZE) + 1).padStart(4, "0")}.jsonl`);
}

function selectBalanced(candidateMap: Map<string, Candidate>, idsByScope: Map<string, string[]>): Candidate[] {
  const selected: Candidate[] = [];
  const used = new Set<string>();
  for (const scope of SCOPES) {
    let added = 0;
    for (const id of idsByScope.get(scope.id) ?? []) {
      if (used.has(id)) continue;
      const candidate = candidateMap.get(id);
      if (!candidate) continue;
      selected.push(candidate); used.add(id); added += 1;
      if (added >= TARGET_PER_SCOPE || selected.length >= DETAIL_CAP) break;
    }
  }
  return selected;
}

function applyTransactionContext(listing: Listing, candidate: Candidate): Listing {
  const transactions = [...new Set(candidate.contexts.map((context) => context.transaction))];
  const categories = [...new Set(candidate.contexts.map((context) => context.category_key))];
  if (listing.transaction) {
    listing.raw = { ...listing.raw, transaction_evidence: { mode: "explicit_detail", confidence: "explicit", discovery_transactions: transactions, discovery_categories: categories } };
    return listing;
  }
  const decision = inferContextualTransaction({
    discovery_transactions: transactions,
    price_amount: listing.price.amount,
    price_on_request: listing.price.on_request,
    property_type: listing.property_type,
  });
  if (decision.transaction) {
    listing.transaction = decision.transaction;
    listing.price.period = decision.transaction === "sale" ? "total" : "month";
    listing.quality.warnings = listing.quality.warnings.filter((warning) => warning !== "transaction_missing").concat("transaction_contextual");
  } else if (!listing.quality.warnings.includes(`transaction_context_${decision.reason}`)) {
    listing.quality.warnings.push(`transaction_context_${decision.reason}`);
  }
  listing.raw = { ...listing.raw, transaction_evidence: {
    mode: decision.transaction ? "discovery_context_plus_price" : "missing",
    confidence: decision.confidence,
    reason: decision.reason,
    discovery_transactions: transactions,
    discovery_categories: categories,
  } };
  return listing;
}

function rejectionReasons(listing: Listing) {
  const reasons: string[] = [];
  if (!listing.title) reasons.push("title_missing");
  if (!listing.location.city) reasons.push("city_missing");
  if (!listing.transaction) reasons.push("transaction_missing");
  if (!listing.property_type || listing.property_type === "unknown") reasons.push("property_type_missing_or_unknown");
  if (listing.price.amount == null && !listing.price.on_request) reasons.push("price_missing_without_on_request");
  return reasons;
}

async function initialize() {
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });
  const candidateMap = new Map<string, Candidate>();
  const idsByScope = new Map<string, string[]>();
  const coverage: Array<Record<string, unknown>> = [];
  let pages = 0; let discoveredDuplicates = 0;

  for (const scope of SCOPES) {
    const result = await runDiscovery(async (url) => (await checkedFetch(url)).html, {
      maxPages: MAX_PAGES_PER_COMBO, city: scope.city, category_key: scope.category_key,
    });
    if (result.manifest.pages_failed) throw new Error(`discovery_failed:${scope.id}`);
    pages += result.manifest.pages_succeeded;
    const ids: string[] = [];
    for (const ref of result.listings) {
      ids.push(ref.source_id);
      const context: Context = {
        scope_id: scope.id,
        city: scope.city,
        category_key: scope.category_key,
        transaction: scope.transaction,
        route_url: ref.route_url,
      };
      const existing = candidateMap.get(ref.source_id);
      if (existing) {
        discoveredDuplicates += 1;
        if (!existing.contexts.some((item) => item.scope_id === scope.id)) existing.contexts.push(context);
      } else candidateMap.set(ref.source_id, { source_id: ref.source_id, url: ref.url, detail_family: ref.detail_family, contexts: [context] });
    }
    idsByScope.set(scope.id, ids);
    coverage.push({ scope_id: scope.id, city: scope.city, category_key: scope.category_key, transaction: scope.transaction, discovered: result.manifest.unique_listings });
  }

  const candidates = selectBalanced(candidateMap, idsByScope);
  const selectedCoverage = SCOPES.map((scope) => ({ scope_id: scope.id, selected: candidates.filter((candidate) => candidate.contexts.some((context) => context.scope_id === scope.id)).length }));
  const startedAt = new Date().toISOString();
  const manifest: Manifest = {
    run_id: `mubawab-lot6-multitype-${startedAt.replace(/[:.]/g, "-")}`,
    source: "mubawab", started_at: startedAt, completed_at: null, status: "running",
    pages_discovered: SCOPES.length, pages_processed: pages, listings_discovered: candidateMap.size,
    listings_fetched: 0, listings_normalized: 0, listings_rejected: 0, duplicates: discoveredDuplicates, errors: [],
  };
  const checkpoint: Checkpoint = { next_index: 0, processed_source_ids: [], first_pass_processed: 0 };
  await writeFile(candidatesPath, JSON.stringify(candidates, null, 2));
  await writeFile(coveragePath, JSON.stringify({ discovery: coverage, selected: selectedCoverage }, null, 2));
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  await writeFile(checkpointPath, JSON.stringify(checkpoint, null, 2));
  await writeFile(errorsPath, "");
}

async function allListings(): Promise<Listing[]> {
  const result: Listing[] = [];
  for (const file of (await readdir(outputDir)).filter((name) => /^listings-\d{4}\.jsonl$/.test(name)).sort()) {
    const raw = await readFile(join(outputDir, file), "utf8");
    result.push(...raw.split("\n").filter(Boolean).map((line) => JSON.parse(line) as Listing));
  }
  return result;
}

async function metrics() {
  const listings = await allListings();
  const ids = listings.map((listing) => listing.source.source_id);
  const typeCounts: Record<string, number> = {};
  const transactionCounts: Record<string, number> = {};
  let explicit = 0; let contextual = 0; let missing = 0;
  for (const listing of listings) {
    typeCounts[listing.property_type ?? "missing"] = (typeCounts[listing.property_type ?? "missing"] ?? 0) + 1;
    transactionCounts[listing.transaction ?? "missing"] = (transactionCounts[listing.transaction ?? "missing"] ?? 0) + 1;
    const mode = (listing.raw.transaction_evidence as { mode?: string } | undefined)?.mode;
    if (mode === "explicit_detail") explicit += 1; else if (mode === "discovery_context_plus_price") contextual += 1; else missing += 1;
  }
  return { written: listings.length, unique_source_ids: new Set(ids).size, type_counts: typeCounts, transaction_counts: transactionCounts, transaction_evidence: { explicit, contextual, missing } };
}

async function processBatch(limit: number) {
  const candidates = JSON.parse(await readFile(candidatesPath, "utf8")) as Candidate[];
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Manifest;
  const checkpoint = JSON.parse(await readFile(checkpointPath, "utf8")) as Checkpoint;
  let processed = 0;
  while (checkpoint.next_index < candidates.length && processed < limit) {
    const candidate = candidates[checkpoint.next_index];
    if (checkpoint.processed_source_ids.includes(candidate.source_id)) throw new Error(`checkpoint_duplicate:${candidate.source_id}`);
    try {
      const fetched = await checkedFetch(candidate.url);
      const listing = applyTransactionContext(extractMubawabCollectionListing(candidate.url, fetched.html), candidate);
      manifest.listings_fetched += 1;
      const reasons = rejectionReasons(listing);
      if (reasons.length) {
        manifest.listings_rejected += 1;
        await appendFile(errorsPath, `${JSON.stringify({ stage: "quality", source_id: candidate.source_id, url: candidate.url, message: reasons.join(","), retryable: false })}\n`);
      } else manifest.listings_normalized += 1;
      await appendFile(chunkPath(checkpoint.next_index + 1), `${JSON.stringify(listing)}\n`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/^(?:robots_disallowed|explicit_source_block):/.test(message)) throw error;
      manifest.errors.push({ stage: "detail", source_id: candidate.source_id, url: candidate.url, message, retryable: true });
      await appendFile(errorsPath, `${JSON.stringify(manifest.errors.at(-1))}\n`);
    }
    checkpoint.processed_source_ids.push(candidate.source_id); checkpoint.next_index += 1; processed += 1;
    await writeFile(checkpointPath, JSON.stringify(checkpoint, null, 2));
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    if (checkpoint.next_index < candidates.length && processed < limit) await sleep(REQUEST_DELAY_MS);
  }
  if (!resumeMode) checkpoint.first_pass_processed = processed;
  manifest.status = checkpoint.next_index >= candidates.length ? "completed" : "partial";
  manifest.completed_at = new Date().toISOString();
  await writeFile(checkpointPath, JSON.stringify(checkpoint, null, 2));
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  const proof = { generated_at: new Date().toISOString(), scopes: SCOPES, target_per_scope: TARGET_PER_SCOPE, candidates: candidates.length, checkpoint_next_index: checkpoint.next_index, first_pass_processed: checkpoint.first_pass_processed, resume_observed: resumeMode && checkpoint.first_pass_processed > 0, ...(await metrics()), database_writes: 0, production_writes: 0, image_downloads: 0, akar_ingestion: false, manifest };
  await writeFile(proofPath, JSON.stringify(proof, null, 2));
}

async function main() {
  if (!resumeMode) { await initialize(); await processBatch(FIRST_PASS_LIMIT); return; }
  await processBatch(DETAIL_CAP);
  const candidates = JSON.parse(await readFile(candidatesPath, "utf8")) as Candidate[];
  const checkpoint = JSON.parse(await readFile(checkpointPath, "utf8")) as Checkpoint;
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Manifest;
  const proof = await metrics();
  if (manifest.status !== "completed") throw new Error(`multitype_not_completed:${manifest.status}`);
  if (checkpoint.first_pass_processed !== FIRST_PASS_LIMIT) throw new Error(`first_pass_mismatch:${checkpoint.first_pass_processed}`);
  if (checkpoint.next_index !== candidates.length) throw new Error(`checkpoint_mismatch:${checkpoint.next_index}:${candidates.length}`);
  if (proof.unique_source_ids !== proof.written) throw new Error(`duplicate_written_source_ids:${proof.unique_source_ids}:${proof.written}`);
}

main().catch((error) => { console.error(error instanceof Error ? error.stack ?? error.message : String(error)); process.exitCode = 1; });
