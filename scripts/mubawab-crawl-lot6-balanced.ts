import { appendFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { runDiscovery, type DiscoveredListingRef } from "../data-ingestion/sources/mubawab/discovery.js";
import { extractMubawabCollectionListing } from "../data-ingestion/sources/mubawab/extractor.js";
import {
  hasMoroccanCentimeMillionPriceLanguage,
  inferContextualTransaction,
  type DiscoveryTransaction,
} from "../data-ingestion/transaction-context.js";
import { fetchHtml, isAllowedByRobots } from "./scrapers/utils/fetch-html.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputDir = join(__dirname, "..", "data-ingestion", "runs", "mubawab", "lot6-balanced");
const manifestPath = join(outputDir, "manifest.json");
const checkpointPath = join(outputDir, "checkpoint.json");
const candidatesPath = join(outputDir, "candidates.json");
const coveragePath = join(outputDir, "coverage.json");
const errorsPath = join(outputDir, "errors.jsonl");
const proofPath = join(outputDir, "proof.json");

const MAX_PAGES_PER_COMBO = 2;
const DETAIL_CAP = 200;
const FIRST_PASS_LIMIT = 50;
const REQUEST_DELAY_MS = 750;
const CHUNK_SIZE = 50;

const SCOPES = [
  { id: "casablanca_sale", city: "Casablanca", category_key: "apartment_sale", transaction: "sale" as const },
  { id: "casablanca_rent", city: "Casablanca", category_key: "apartment_rent", transaction: "rent" as const },
  { id: "rabat_sale", city: "Rabat", category_key: "apartment_sale", transaction: "sale" as const },
  { id: "rabat_rent", city: "Rabat", category_key: "apartment_rent", transaction: "rent" as const },
];

const resumeMode = process.argv.includes("--resume");
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type ExtractedListing = ReturnType<typeof extractMubawabCollectionListing>;
type Scope = (typeof SCOPES)[number];
type ScopeContext = {
  scope_id: string;
  city: string;
  category_key: string;
  transaction: DiscoveryTransaction;
  route_url: string;
};
type Candidate = Omit<DiscoveredListingRef, "route_url"> & { contexts: ScopeContext[] };
type TransactionEvidence = {
  mode: "explicit_detail" | "discovery_context_plus_price" | "missing";
  discovery_categories: string[];
  discovery_transactions: DiscoveryTransaction[];
  confidence: "explicit" | "contextual" | "missing";
  context_conflict: boolean;
  reason: string;
  centime_million_price_language: boolean;
};
type CrawlError = {
  stage: "detail" | "quality";
  url: string | null;
  source_id: string | null;
  message: string;
  retryable: boolean;
};
type Manifest = {
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
  errors: CrawlError[];
};
type Checkpoint = {
  next_index: number;
  processed_source_ids: string[];
  first_pass_processed: number;
};

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

function chunkPath(indexOneBased: number): string {
  const chunk = Math.floor((indexOneBased - 1) / CHUNK_SIZE) + 1;
  return join(outputDir, `listings-${String(chunk).padStart(4, "0")}.jsonl`);
}

function balancedCandidates(
  candidateMap: Map<string, Candidate>,
  sourceIdsByScope: Map<string, string[]>,
  cap: number,
): Candidate[] {
  const selected: Candidate[] = [];
  const selectedIds = new Set<string>();
  const cursors = new Map(SCOPES.map((scope) => [scope.id, 0]));

  while (selected.length < cap) {
    let addedThisRound = 0;
    for (const scope of SCOPES) {
      const ids = sourceIdsByScope.get(scope.id) ?? [];
      let cursor = cursors.get(scope.id) ?? 0;
      while (cursor < ids.length && selectedIds.has(ids[cursor])) cursor += 1;
      cursors.set(scope.id, cursor + 1);
      if (cursor >= ids.length) continue;
      const id = ids[cursor];
      const candidate = candidateMap.get(id);
      if (!candidate || selectedIds.has(id)) continue;
      selected.push(candidate);
      selectedIds.add(id);
      addedThisRound += 1;
      if (selected.length >= cap) break;
    }
    if (addedThisRound === 0) break;
  }

  return selected;
}

function applyTransactionEvidence(listing: ExtractedListing, candidate: Candidate): ExtractedListing {
  const contexts = [...new Set(candidate.contexts.map((context) => context.transaction))];
  const categories = [...new Set(candidate.contexts.map((context) => context.category_key))];
  const contextConflict = contexts.length > 1;
  const centimeLanguage = hasMoroccanCentimeMillionPriceLanguage(listing.description);
  let evidence: TransactionEvidence;

  if (listing.transaction) {
    evidence = {
      mode: "explicit_detail",
      discovery_categories: categories,
      discovery_transactions: contexts,
      confidence: "explicit",
      context_conflict: contextConflict,
      reason: "explicit_detail",
      centime_million_price_language: centimeLanguage,
    };
  } else {
    const decision = inferContextualTransaction({
      discovery_transactions: contexts,
      price_amount: listing.price.amount,
      price_on_request: listing.price.on_request,
      property_type: listing.property_type,
    });

    if (decision.transaction) {
      listing.transaction = decision.transaction;
      listing.price.period = decision.transaction === "sale" ? "total" : "month";
      listing.quality.warnings = listing.quality.warnings
        .filter((warning) => warning !== "transaction_missing")
        .concat("transaction_contextual");
      evidence = {
        mode: "discovery_context_plus_price",
        discovery_categories: categories,
        discovery_transactions: contexts,
        confidence: "contextual",
        context_conflict: false,
        reason: decision.reason,
        centime_million_price_language: centimeLanguage,
      };
    } else {
      const extraWarning = centimeLanguage ? "price_centime_million_review" : `transaction_context_${decision.reason}`;
      if (!listing.quality.warnings.includes(extraWarning)) listing.quality.warnings.push(extraWarning);
      evidence = {
        mode: "missing",
        discovery_categories: categories,
        discovery_transactions: contexts,
        confidence: "missing",
        context_conflict: contextConflict,
        reason: decision.reason,
        centime_million_price_language: centimeLanguage,
      };
    }
  }

  listing.raw = { ...listing.raw, transaction_evidence: evidence };
  return listing;
}

function rejectionReasons(listing: ExtractedListing): string[] {
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
  const startedAt = new Date().toISOString();
  const candidateMap = new Map<string, Candidate>();
  const sourceIdsByScope = new Map<string, string[]>();
  const coverage: Array<Record<string, unknown>> = [];
  let pagesRequested = 0;
  let pagesSucceeded = 0;
  let duplicateAcrossScopes = 0;

  for (const scope of SCOPES) {
    const result = await runDiscovery(
      async (url) => (await checkedFetch(url)).html,
      { maxPages: MAX_PAGES_PER_COMBO, city: scope.city, category_key: scope.category_key },
    );
    if (result.manifest.pages_failed > 0) {
      throw new Error(`discovery_failed_pages:${scope.city}:${scope.category_key}:${result.manifest.pages_failed}`);
    }
    pagesRequested += result.manifest.pages_requested;
    pagesSucceeded += result.manifest.pages_succeeded;
    const scopeIds: string[] = [];

    for (const ref of result.listings) {
      scopeIds.push(ref.source_id);
      const context: ScopeContext = {
        scope_id: scope.id,
        city: scope.city,
        category_key: scope.category_key,
        transaction: scope.transaction,
        route_url: ref.route_url,
      };
      const existing = candidateMap.get(ref.source_id);
      if (existing) {
        duplicateAcrossScopes += 1;
        if (!existing.contexts.some((item) => item.scope_id === scope.id)) existing.contexts.push(context);
      } else {
        candidateMap.set(ref.source_id, {
          source_id: ref.source_id,
          url: ref.url,
          detail_family: ref.detail_family,
          contexts: [context],
        });
      }
    }
    sourceIdsByScope.set(scope.id, scopeIds);
    coverage.push({
      scope_id: scope.id,
      city: scope.city,
      category_key: scope.category_key,
      transaction: scope.transaction,
      pages_requested: result.manifest.pages_requested,
      pages_succeeded: result.manifest.pages_succeeded,
      unique_listings_within_scope: result.manifest.unique_listings,
      duplicate_refs_within_scope: result.manifest.duplicate_refs,
      detail_family_counts: result.manifest.detail_family_counts,
    });
  }

  const allCandidates = [...candidateMap.values()];
  const candidates = balancedCandidates(candidateMap, sourceIdsByScope, DETAIL_CAP);
  if (candidates.length < 100) throw new Error(`insufficient_balanced_candidates:${candidates.length}`);

  const selectedCoverage = SCOPES.map((scope) => ({
    scope_id: scope.id,
    selected_candidates: candidates.filter((candidate) => candidate.contexts.some((context) => context.scope_id === scope.id)).length,
  }));

  const manifest: Manifest = {
    run_id: `mubawab-lot6-balanced-${startedAt.replace(/[:.]/g, "-")}`,
    source: "mubawab",
    started_at: startedAt,
    completed_at: null,
    status: "running",
    pages_discovered: pagesRequested,
    pages_processed: pagesSucceeded,
    listings_discovered: allCandidates.length,
    listings_fetched: 0,
    listings_normalized: 0,
    listings_rejected: 0,
    duplicates: duplicateAcrossScopes,
    errors: [],
  };
  const checkpoint: Checkpoint = { next_index: 0, processed_source_ids: [], first_pass_processed: 0 };

  await writeFile(candidatesPath, JSON.stringify(candidates, null, 2), "utf8");
  await writeFile(coveragePath, JSON.stringify({ discovery: coverage, selected: selectedCoverage }, null, 2), "utf8");
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
  await writeFile(checkpointPath, JSON.stringify(checkpoint, null, 2), "utf8");
  await writeFile(errorsPath, "", "utf8");
}

async function readAllListings(): Promise<ExtractedListing[]> {
  const files = (await readdir(outputDir)).filter((name) => /^listings-\d{4}\.jsonl$/.test(name)).sort();
  const listings: ExtractedListing[] = [];
  for (const file of files) {
    const raw = await readFile(join(outputDir, file), "utf8");
    for (const line of raw.split("\n").filter(Boolean)) listings.push(JSON.parse(line) as ExtractedListing);
  }
  return listings;
}

async function proofMetrics() {
  const listings = await readAllListings();
  const sourceIds = listings.map((listing) => listing.source.source_id);
  const chunkFiles = (await readdir(outputDir)).filter((name) => /^listings-\d{4}\.jsonl$/.test(name)).sort();
  const chunkLineCounts: Record<string, number> = {};
  for (const file of chunkFiles) {
    const raw = await readFile(join(outputDir, file), "utf8");
    chunkLineCounts[file] = raw.split("\n").filter(Boolean).length;
  }

  const evidence = listings.map((listing) => listing.raw.transaction_evidence as TransactionEvidence | undefined);
  const explicit = evidence.filter((item) => item?.mode === "explicit_detail").length;
  const contextual = evidence.filter((item) => item?.mode === "discovery_context_plus_price").length;
  const missing = evidence.filter((item) => item?.mode === "missing").length;
  const conflicts = evidence.filter((item) => item?.context_conflict).length;
  const centimeReview = evidence.filter((item) => item?.centime_million_price_language).length;
  const routeMismatches = listings
    .filter((listing) => {
      const item = listing.raw.transaction_evidence as TransactionEvidence | undefined;
      return listing.transaction != null && item?.mode === "explicit_detail" && item.discovery_transactions.some((tx) => tx !== listing.transaction);
    })
    .map((listing) => {
      const item = listing.raw.transaction_evidence as TransactionEvidence;
      return {
        source_id: listing.source.source_id,
        url: listing.source.url,
        detail_transaction: listing.transaction,
        discovery_transactions: item.discovery_transactions,
        discovery_categories: item.discovery_categories,
      };
    });

  const transactionCounts = listings.reduce<Record<string, number>>((acc, listing) => {
    const key = listing.transaction ?? "missing";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const qualityScores = listings.map((listing) => listing.quality.score).filter((score): score is number => score != null);

  return {
    written_listings: listings.length,
    unique_source_ids: new Set(sourceIds).size,
    chunk_line_counts: chunkLineCounts,
    chunk_size_max: Math.max(0, ...Object.values(chunkLineCounts)),
    transaction_evidence_counts: { explicit_detail: explicit, contextual, missing },
    final_transaction_counts: transactionCounts,
    context_conflict_count: conflicts,
    centime_million_review_count: centimeReview,
    route_mismatch_count: routeMismatches.length,
    route_mismatches: routeMismatches,
    average_quality_score: qualityScores.length ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length : null,
  };
}

async function processBatch(limit: number) {
  const candidates = JSON.parse(await readFile(candidatesPath, "utf8")) as Candidate[];
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Manifest;
  const checkpoint = JSON.parse(await readFile(checkpointPath, "utf8")) as Checkpoint;
  let processedThisPass = 0;
  manifest.status = "running";
  manifest.completed_at = null;

  while (checkpoint.next_index < candidates.length && processedThisPass < limit) {
    const candidate = candidates[checkpoint.next_index];
    if (checkpoint.processed_source_ids.includes(candidate.source_id)) throw new Error(`checkpoint_duplicate:${candidate.source_id}`);

    try {
      const fetched = await checkedFetch(candidate.url);
      const listing = applyTransactionEvidence(extractMubawabCollectionListing(candidate.url, fetched.html), candidate);
      manifest.listings_fetched += 1;
      const reasons = rejectionReasons(listing);
      if (reasons.length === 0) manifest.listings_normalized += 1;
      else {
        manifest.listings_rejected += 1;
        const rejection: CrawlError = {
          stage: "quality",
          url: candidate.url,
          source_id: candidate.source_id,
          message: reasons.join(","),
          retryable: false,
        };
        await appendFile(errorsPath, `${JSON.stringify(rejection)}\n`, "utf8");
      }
      await appendFile(chunkPath(manifest.listings_fetched), `${JSON.stringify(listing)}\n`, "utf8");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/^(?:robots_disallowed|explicit_source_block):/.test(message)) {
        manifest.status = "failed";
        manifest.completed_at = new Date().toISOString();
        const entry: CrawlError = { stage: "detail", url: candidate.url, source_id: candidate.source_id, message, retryable: false };
        manifest.errors.push(entry);
        await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
        await appendFile(errorsPath, `${JSON.stringify(entry)}\n`, "utf8");
        throw error;
      }
      const entry: CrawlError = { stage: "detail", url: candidate.url, source_id: candidate.source_id, message, retryable: true };
      manifest.errors.push(entry);
      await appendFile(errorsPath, `${JSON.stringify(entry)}\n`, "utf8");
    }

    checkpoint.processed_source_ids.push(candidate.source_id);
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
    scopes: SCOPES,
    max_pages_per_combo: MAX_PAGES_PER_COMBO,
    detail_fetch_cap: DETAIL_CAP,
    chunk_size: CHUNK_SIZE,
    request_delay_ms: REQUEST_DELAY_MS,
    first_pass_limit: FIRST_PASS_LIMIT,
    first_pass_processed: checkpoint.first_pass_processed,
    resumed: resumeMode,
    resume_observed: resumeMode && checkpoint.first_pass_processed > 0,
    checkpoint_next_index: checkpoint.next_index,
    candidates: candidates.length,
    ...(await proofMetrics()),
    database_writes: 0,
    production_writes: 0,
    image_downloads: 0,
    akar_ingestion: false,
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

  await processBatch(DETAIL_CAP);
  const candidates = JSON.parse(await readFile(candidatesPath, "utf8")) as Candidate[];
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Manifest;
  const checkpoint = JSON.parse(await readFile(checkpointPath, "utf8")) as Checkpoint;
  const metrics = await proofMetrics();

  if (manifest.status !== "completed") throw new Error(`balanced_not_completed:${manifest.status}`);
  if (checkpoint.first_pass_processed !== FIRST_PASS_LIMIT) throw new Error(`first_pass_mismatch:${checkpoint.first_pass_processed}`);
  if (checkpoint.next_index !== candidates.length) throw new Error(`checkpoint_mismatch:${checkpoint.next_index}:${candidates.length}`);
  if (checkpoint.processed_source_ids.length !== new Set(checkpoint.processed_source_ids).size) throw new Error("duplicate_processed_source_id");
  if (metrics.written_listings !== manifest.listings_fetched) throw new Error(`jsonl_count_mismatch:${metrics.written_listings}:${manifest.listings_fetched}`);
  if (metrics.unique_source_ids !== metrics.written_listings) throw new Error(`written_duplicate_source_ids:${metrics.unique_source_ids}:${metrics.written_listings}`);
  if (metrics.chunk_size_max > CHUNK_SIZE) throw new Error(`chunk_size_exceeded:${metrics.chunk_size_max}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
