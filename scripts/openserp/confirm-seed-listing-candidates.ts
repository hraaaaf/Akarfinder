#!/usr/bin/env tsx
// SEED-LISTING-MASS-CONVERSION-V1
// Converts seed_only URLs into normal AkarFinder ingestion decisions ONLY after
// a search engine independently returns the exact same canonical URL.
//
// Safety invariants:
// - never fetches a source listing page;
// - dry-run by default; --apply requires the existing 3 Production write flags;
// - Source Policy Registry preflight happens before any external search call;
// - exact canonical URL equality is mandatory;
// - at most two bounded public-index queries are issued per selected seed;
// - city + transaction + property type must all be explicit in SERP evidence;
// - existing decideAdmission() must admit with HIGH confidence;
// - writes reuse writeNationalIngestionRun() only; no direct listing bypass;
// - no raw URLs, titles, snippets, or user data are printed to logs.

import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import {
  buildExplicitSeedAdmissionQuery,
  buildSeedConfirmationQueries,
  findExactSeedResult,
  selectBalancedSeedBatch,
  type SeedConfirmationSeed,
} from "@/lib/acquisition-scale-v1/seed-listing-confirmation";
import {
  buildSeedConfirmationPolicyMap,
  evaluateSeedConfirmationPolicy,
  normalizePolicyDomain,
  type SeedConfirmationPolicy,
} from "@/lib/acquisition-scale-v1/seed-confirmation-policy";
import { decideAdmission, type AdmissionDecision } from "@/lib/openserp-ingestion/national-admission";
import { isOpenSerpIngestionCronAuthorized } from "@/lib/openserp-ingestion/openserp-ingestion-feature-flags";
import {
  DEFAULT_SEARXNG_URL,
  fetchYandexViaSearxng,
  newYandexChannelMetrics,
} from "@/lib/openserp-ingestion/searxng-yandex-channel";
import { canonicalizeSourceUrl } from "@/lib/openserp-ingestion/utils";
import { writeNationalIngestionRun } from "@/lib/openserp-ingestion/national-writer";
import type { OpenSerpRawResult } from "@/lib/openserp-async/types";

const DEFAULT_BATCH_SIZE = 40;
const MAX_BATCH_SIZE = 100;
const MAX_CONCURRENCY = 4;
const YANDEX_TIMEOUT_MS = 8_000;
const READ_PAGE_SIZE = 1000;

type SeedAttemptOutcome = "exact_high_confidence" | "no_exact_match" | "insufficient_explicit_signals" | "admission_not_high_confidence";
type AttemptResult = { seed: SeedConfirmationSeed; outcome: SeedAttemptOutcome; decision: AdmissionDecision | null; queries_used: number };

function parseMode(): "dry-run" | "apply" {
  const apply = process.argv.includes("--apply");
  const dryRun = process.argv.includes("--dry-run");
  if (apply && dryRun) throw new Error("--apply and --dry-run are mutually exclusive");
  return apply ? "apply" : "dry-run";
}

function parseBatchSize(): number {
  const raw = process.argv.find((arg) => arg.startsWith("--batch="))?.slice("--batch=".length);
  const value = raw ? Number(raw) : DEFAULT_BATCH_SIZE;
  if (!Number.isFinite(value)) return DEFAULT_BATCH_SIZE;
  return Math.max(1, Math.min(Math.trunc(value), MAX_BATCH_SIZE));
}

async function loadSeedOnlyRows(): Promise<SeedConfirmationSeed[]> {
  const supabase = getSupabaseServerClient();
  const out: SeedConfirmationSeed[] = [];
  for (let from = 0; ; from += READ_PAGE_SIZE) {
    const response = await supabase.from("source_offer_seeds").select("id,canonical_url,source_domain,metadata,updated_at").eq("freshness_status", "seed_only").order("updated_at", { ascending: true }).range(from, from + READ_PAGE_SIZE - 1);
    if (response.error) throw new Error(`seed queue read failed: ${response.error.message}`);
    const rows = (response.data ?? []) as SeedConfirmationSeed[];
    out.push(...rows);
    if (rows.length < READ_PAGE_SIZE) break;
  }
  return out;
}

async function loadSeedConfirmationPolicies(): Promise<SeedConfirmationPolicy[]> {
  const supabase = getSupabaseServerClient();
  const response = await supabase.from("source_policy_registry").select("source_domain,authorization_status,acquisition_mode,allowed_discovery_channels,review_status,policy_effective_at,policy_expires_at,machine_gate,ingestion_gate,display_gate");
  if (response.error) throw new Error(`source policy registry read failed: ${response.error.message}`);
  return (response.data ?? []) as SeedConfirmationPolicy[];
}

async function loadExistingListingUrls(): Promise<Set<string>> {
  const supabase = getSupabaseServerClient();
  const out = new Set<string>();
  for (let from = 0; ; from += READ_PAGE_SIZE) {
    const response = await supabase.from("listing_sources").select("listing_url").range(from, from + READ_PAGE_SIZE - 1);
    if (response.error) throw new Error(`listing_sources read failed: ${response.error.message}`);
    const rows = (response.data ?? []) as Array<{ listing_url: string | null }>;
    for (const row of rows) {
      const canonical = row.listing_url ? canonicalizeSourceUrl(row.listing_url) : null;
      if (canonical) out.add(canonical);
    }
    if (rows.length < READ_PAGE_SIZE) break;
  }
  return out;
}

function toOpenSerpRaw(result: { url: string; title: string; snippet: string | null; rank: number }): OpenSerpRawResult {
  return { url: result.url, title: result.title, snippet: result.snippet ?? undefined, rank: result.rank } as OpenSerpRawResult;
}

async function runWithConcurrency<T, R>(items: T[], concurrency: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    for (;;) {
      const index = nextIndex++;
      if (index >= items.length) return;
      results[index] = await worker(items[index]);
    }
  });
  await Promise.all(runners);
  return results;
}

async function updateAttemptMetadata(attempts: AttemptResult[], attemptedAt: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  await runWithConcurrency(attempts, 5, async ({ seed, outcome, queries_used }) => {
    const oldMetadata = seed.metadata && typeof seed.metadata === "object" ? seed.metadata : {};
    const oldCount = Number(oldMetadata.seed_confirmation_attempt_count ?? 0);
    const metadata = { ...oldMetadata, seed_confirmation_attempt_count: Number.isFinite(oldCount) ? oldCount + 1 : 1, seed_confirmation_last_attempt_at: attemptedAt, seed_confirmation_last_outcome: outcome, seed_confirmation_last_query_count: queries_used, seed_confirmation_channel: "searxng_yandex" };
    const response = await supabase.from("source_offer_seeds").update({ metadata, updated_at: attemptedAt }).eq("id", seed.id);
    if (response.error) throw new Error(`seed attempt metadata update failed: ${response.error.message}`);
    return true;
  });
}

function countByDomain(attempts: AttemptResult[], predicate: (item: AttemptResult) => boolean): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of attempts) {
    if (!predicate(item)) continue;
    counts[item.seed.source_domain] = (counts[item.seed.source_domain] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1]));
}

async function main() {
  const mode = parseMode();
  const batchSize = parseBatchSize();
  if (mode === "apply" && !isOpenSerpIngestionCronAuthorized()) {
    console.log(JSON.stringify({ ok: true, status: "NOOP_FLAGS_DISABLED", mode, batch_size: batchSize }));
    return;
  }

  const [seedRows, existingListingUrls, policies] = await Promise.all([loadSeedOnlyRows(), loadExistingListingUrls(), loadSeedConfirmationPolicies()]);
  const policyByDomain = buildSeedConfirmationPolicyMap(policies);
  const policyNow = new Date();
  let policyBlockedSeedRows = 0;
  const eligibleSeeds = seedRows.filter((seed) => {
    const canonical = canonicalizeSourceUrl(seed.canonical_url);
    if (canonical === null || existingListingUrls.has(canonical)) return false;
    const policy = policyByDomain.get(normalizePolicyDomain(seed.source_domain));
    const policyDecision = evaluateSeedConfirmationPolicy(policy, policyNow);
    if (!policyDecision.eligible) { policyBlockedSeedRows += 1; return false; }
    return true;
  });
  const selected = selectBalancedSeedBatch(eligibleSeeds, batchSize);
  if (selected.length === 0) {
    console.log(JSON.stringify({ ok: true, status: "NOOP_NO_POLICY_ELIGIBLE_SEED_ONLY_GAPS", mode, seed_only: seedRows.length, policy_blocked_seed_rows: policyBlockedSeedRows }));
    return;
  }

  const yandexMetrics = newYandexChannelMetrics();
  const searxngUrl = process.env.OPENSERP_SEARXNG_LOCAL_URL ?? DEFAULT_SEARXNG_URL;
  const attemptedAt = new Date().toISOString();

  const attempts = await runWithConcurrency(selected, MAX_CONCURRENCY, async (seed): Promise<AttemptResult> => {
    const queryTexts = buildSeedConfirmationQueries(seed);
    let exact: OpenSerpRawResult | null = null;
    let queriesUsed = 0;
    for (const queryText of queryTexts) {
      queriesUsed += 1;
      const results = await fetchYandexViaSearxng({ queryText, searxngUrl, timeoutMs: YANDEX_TIMEOUT_MS, metrics: yandexMetrics });
      exact = findExactSeedResult(seed.canonical_url, results.map(toOpenSerpRaw));
      if (exact) break;
    }
    if (!exact) return { seed, outcome: "no_exact_match", decision: null, queries_used: queriesUsed };

    const query = buildExplicitSeedAdmissionQuery({ seed, result: exact });
    if (!query) return { seed, outcome: "insufficient_explicit_signals", decision: null, queries_used: queriesUsed };
    const decision = decideAdmission({ result: exact, query, engine: "searxng_yandex", discovered_at: attemptedAt, fallbackRank: exact.rank ?? 1 });
    const canonical = decision.classified?.canonical_source_url ?? null;
    const seedCanonical = canonicalizeSourceUrl(seed.canonical_url);
    if (!decision.admitted || decision.confidence !== "high" || !decision.classified || !canonical || canonical !== seedCanonical) {
      return { seed, outcome: "admission_not_high_confidence", decision, queries_used: queriesUsed };
    }
    decision.classified.source_channels = ["searxng_yandex"];
    return { seed, outcome: "exact_high_confidence", decision, queries_used: queriesUsed };
  });

  const confirmed = attempts.filter((item): item is AttemptResult & { decision: AdmissionDecision } => item.outcome === "exact_high_confidence" && item.decision !== null);
  const plan = {
    mode, seed_only_rows: seedRows.length, policy_blocked_seed_rows: policyBlockedSeedRows, policy_eligible_unlinked_seed_rows: eligibleSeeds.length,
    selected: selected.length, exact_high_confidence: confirmed.length,
    no_exact_match: attempts.filter((item) => item.outcome === "no_exact_match").length,
    insufficient_explicit_signals: attempts.filter((item) => item.outcome === "insufficient_explicit_signals").length,
    admission_not_high_confidence: attempts.filter((item) => item.outcome === "admission_not_high_confidence").length,
    primary_only: attempts.filter((item) => item.queries_used === 1).length,
    fallback_used: attempts.filter((item) => item.queries_used > 1).length,
    selected_by_domain: countByDomain(attempts, () => true), confirmed_by_domain: countByDomain(attempts, (item) => item.outcome === "exact_high_confidence"), yandex: yandexMetrics,
  };
  console.log(JSON.stringify({ event: "SEED_LISTING_CONFIRMATION_PLAN", ...plan }, null, 2));
  if (mode === "dry-run") return;

  let writeResult: Awaited<ReturnType<typeof writeNationalIngestionRun>> | null = null;
  if (confirmed.length > 0) {
    const runId = `seed-listing-confirmation-${attemptedAt.replace(/[:.]/g, "-")}`;
    writeResult = await writeNationalIngestionRun({ runId, decisions: confirmed.map((item) => item.decision) });
    if (writeResult.write_errors.length > 0) {
      console.log(JSON.stringify({ ok: false, status: "WRITE_ERRORS", run_id: runId, plan, result: writeResult }, null, 2));
      process.exitCode = 1;
      return;
    }
  }
  await updateAttemptMetadata(attempts, attemptedAt);
  console.log(JSON.stringify({ ok: true, status: confirmed.length > 0 ? "APPLY_COMPLETED" : "APPLY_NO_CONFIRMED_LISTINGS", plan, result: writeResult }, null, 2));
}

void main().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exit(1); });
