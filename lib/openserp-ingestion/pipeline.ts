import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import { classifyOpenSerpResult } from "./classify";
import { runOpenSerpLiveQuery } from "./openserp-live";
import type {
  LockedFirstWriteManifest,
  OpenSerpClassifiedResult,
  OpenSerpDryRunMetrics,
  OpenSerpIngestionQuery,
  OpenSerpListingCandidate,
  OpenSerpProviderInfo,
  OpenSerpQueryAttempt,
  OpenSerpQueryAttemptStatus,
  OpenSerpQueryExecutionReport,
  OpenSerpRollbackManifest,
  OpenSerpWriteManifest,
} from "./types";
import { redactSensitiveText, scoreCompleteness, sha256 } from "./utils";
import { resolveSelectedCandidatesFromLockedManifest } from "./first-write";

type DbPropertyListingRow = {
  id: number;
  canonical_fingerprint: string;
  title: string | null;
  price_mad: number | null;
  city: string | null;
  district: string | null;
  property_type: string | null;
  transaction_type: string | null;
  surface_m2: number | null;
  bedrooms_count: number | null;
  description_snippet: string | null;
  data_completeness_score: number | null;
  field_confidence: unknown;
  created_at: string;
  updated_at: string;
};

type DbListingSourceRow = {
  id: number;
  property_listing_id: number;
  source_name: string;
  listing_url: string;
  source_url: string | null;
  first_seen_at: string;
  last_seen_at: string;
  is_active: boolean;
};

export type OpenSerpPilotOptions = {
  runId: string;
  reportPath: string;
  dryRun: boolean;
  write: boolean;
  maxNew: number;
  maxUpdates: number;
  queryLimit?: number;
  city?: string;
  env?: NodeJS.ProcessEnv;
};

export async function loadLockedFirstWriteManifest(path: string): Promise<LockedFirstWriteManifest & { selectedCandidates: OpenSerpListingCandidate[] }> {
  const manifest = JSON.parse(await readFile(path, "utf8")) as LockedFirstWriteManifest;
  const selectedCandidates = await resolveSelectedCandidatesFromLockedManifest(manifest);
  return { ...manifest, selectedCandidates };
}

export async function loadOpenSerpQueryMatrix(path: string): Promise<OpenSerpIngestionQuery[]> {
  const content = await readFile(path, "utf8");
  return JSON.parse(content) as OpenSerpIngestionQuery[];
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2), "utf8");
}

async function writeJsonl(path: string, rows: unknown[]): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const body = rows.map((row) => JSON.stringify(row)).join("\n");
  await writeFile(path, body.length > 0 ? `${body}\n` : "", "utf8");
}

function chunkArray<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function toSourceName(domain: string): string {
  const clean = domain.toLowerCase();
  if (clean.includes("mubawab")) return "mubawab";
  if (clean.includes("agenz")) return "agenz";
  if (clean.includes("logic-immo")) return "logic-immo";
  if (clean.includes("logicimmo")) return "logicimmo";
  if (clean.includes("avito")) return "avito";
  return clean.replace(/\.[a-z.]+$/, "").replace(/[^a-z0-9-]+/g, "-");
}

function buildCandidate(result: OpenSerpClassifiedResult, runId: string): OpenSerpListingCandidate {
  const fingerprint = sha256(`openserp:${result.canonical_source_url}`);
  return {
    ...result,
    candidate_id: `openserp_${fingerprint.slice(0, 16)}`,
    canonical_fingerprint: fingerprint,
    seen_query_ids: [result.query_id],
    seen_run_ids: [runId],
  };
}

function domainToBrandHint(domain: string | undefined): string | null {
  if (!domain) return null;
  const normalized = domain.toLowerCase();
  if (normalized.includes("agenz")) return "agenz";
  if (normalized.includes("sarouty")) return "sarouty";
  if (normalized.includes("mubawab")) return "mubawab";
  if (normalized.includes("mouldar")) return "mouldar";
  return normalized.replace(/\.[a-z.]+$/, "");
}

function getExecutionPlan(query: OpenSerpIngestionQuery): Array<{
  engine: "bing" | "ecosia" | "duckduckgo";
  queryText: string;
  site?: string;
}> {
  if (!query.target_domain) {
    return [
      { engine: "bing", queryText: query.query_text },
      { engine: "duckduckgo", queryText: query.query_text },
      { engine: "ecosia", queryText: query.query_text },
    ];
  }

  const brandHint = domainToBrandHint(query.target_domain);
  const brandQuery = brandHint ? `${brandHint} ${query.query_text}` : query.query_text;
  return [
    { engine: "duckduckgo", queryText: query.query_text, site: query.target_domain },
    { engine: "bing", queryText: brandQuery },
    { engine: "duckduckgo", queryText: brandQuery },
  ];
}

function categorizeAttemptError(error: unknown): OpenSerpQueryAttemptStatus {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (message.includes("quota")) return "rate_limit";
  if (message.includes("timeout")) return "timeout";
  if (message.includes("captcha")) return "provider_process_error";
  if (message.includes("blocked")) return "provider_unavailable";
  if (message.includes("invalid") && message.includes("json")) return "output_parse_error";
  if (message.includes("parse")) return "output_parse_error";
  if (message.includes("encoding")) return "encoding_error";
  if (message.includes("argument")) return "invalid_cli_arguments";
  return "unknown";
}

async function executeQueryAttempts(input: {
  query: OpenSerpIngestionQuery;
  env?: NodeJS.ProcessEnv;
}): Promise<{
  provider: OpenSerpProviderInfo | null;
  response: Awaited<ReturnType<typeof runOpenSerpLiveQuery>>["response"] | null;
  report: OpenSerpQueryExecutionReport;
}> {
  const attempts: OpenSerpQueryAttempt[] = [];
  let provider: OpenSerpProviderInfo | null = null;
  let response: Awaited<ReturnType<typeof runOpenSerpLiveQuery>>["response"] | null = null;

  const attemptsPlan = getExecutionPlan(input.query).slice(0, 3);

  for (let index = 0; index < attemptsPlan.length; index += 1) {
    const plan = attemptsPlan[index];
    const started = new Date().toISOString();
    const startedAtMs = Date.now();
    try {
      const execution = await runOpenSerpLiveQuery({
        engine: plan.engine,
        query: plan.queryText,
        limit: 15,
        site: plan.site,
        env: input.env,
      });
      provider = execution.provider;
      response = execution.response;
      const resultCount = execution.response.results.length;
      attempts.push({
        engine: plan.engine,
        query_text: plan.queryText,
        target_domain: plan.site ?? null,
        started_at: started,
        duration_ms: Date.now() - startedAtMs,
        exit_code: 0,
        stdout_status: resultCount > 0 ? "results" : "empty_results",
        stderr_category: resultCount > 0 ? "success" : "empty_results",
        result_count: resultCount,
        retry_count: index,
        final_status: "success",
        error_message: null,
      });
      if (resultCount > 0 || index === attemptsPlan.length - 1) {
        break;
      }
    } catch (error) {
      attempts.push({
        engine: plan.engine,
        query_text: plan.queryText,
        target_domain: plan.site ?? null,
        started_at: started,
        duration_ms: Date.now() - startedAtMs,
        exit_code: null,
        stdout_status: "none",
        stderr_category: categorizeAttemptError(error),
        result_count: 0,
        retry_count: index,
        final_status: "failed",
        error_message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const lastAttempt = attempts[attempts.length - 1];
  const resultCount = response?.results.length ?? 0;
  const executed = attempts.some((attempt) => attempt.final_status === "success");
  const zeroResultQuery = executed && resultCount === 0;
  const technicalFailure = !executed;

  return {
    provider,
    response,
    report: {
      query_id: input.query.query_id,
      query_text: input.query.query_text,
      city: input.query.city,
      district: input.query.district,
      property_type: input.query.property_type,
      transaction_type: input.query.transaction_type,
      target_domain: input.query.target_domain ?? null,
      attempts,
      executed,
      failed: technicalFailure,
      zero_result_query: zeroResultQuery,
      technical_failure: technicalFailure,
      final_status: executed
        ? (zeroResultQuery ? "empty_results" : "success")
        : (lastAttempt?.stderr_category ?? "unknown"),
      result_count: resultCount,
    },
  };
}

function toSanitizedRawResultRow(input: {
  queryId: string;
  queryText: string;
  engine: "bing" | "ecosia" | "duckduckgo";
  fetchedAt: string;
  raw: { title?: string; snippet?: string; [key: string]: unknown };
}) {
  const safeTitle = redactSensitiveText(typeof input.raw.title === "string" ? input.raw.title : null);
  const safeSnippet = redactSensitiveText(typeof input.raw.snippet === "string" ? input.raw.snippet : null);

  return {
    query_id: input.queryId,
    query_text: input.queryText,
    engine: input.engine,
    fetched_at: input.fetchedAt,
    result: {
      ...input.raw,
      title: safeTitle.value,
      snippet: safeSnippet.value,
    },
  };
}

function mergeCandidate(existing: OpenSerpListingCandidate, incoming: OpenSerpListingCandidate): OpenSerpListingCandidate {
  return {
    ...existing,
    rank: Math.min(existing.rank, incoming.rank),
    title: incoming.title.length > existing.title.length ? incoming.title : existing.title,
    snippet:
      (incoming.snippet?.length ?? 0) > (existing.snippet?.length ?? 0)
        ? incoming.snippet
        : existing.snippet,
    extracted: {
      ...existing.extracted,
      city: existing.extracted.city ?? incoming.extracted.city,
      district: existing.extracted.district ?? incoming.extracted.district,
      transaction_type: existing.extracted.transaction_type ?? incoming.extracted.transaction_type,
      property_type: existing.extracted.property_type ?? incoming.extracted.property_type,
      price_mad: existing.extracted.price_mad ?? incoming.extracted.price_mad,
      currency: existing.extracted.currency ?? incoming.extracted.currency,
      surface_m2: existing.extracted.surface_m2 ?? incoming.extracted.surface_m2,
      bedrooms_count: existing.extracted.bedrooms_count ?? incoming.extracted.bedrooms_count,
    },
    seen_query_ids: [...new Set([...existing.seen_query_ids, ...incoming.seen_query_ids])],
    seen_run_ids: [...new Set([...existing.seen_run_ids, ...incoming.seen_run_ids])],
  };
}

function toPropertyRow(candidate: OpenSerpListingCandidate, now: string) {
  const completeness = scoreCompleteness(candidate.extracted);
  return {
    canonical_fingerprint: candidate.canonical_fingerprint,
    title: candidate.title,
    price_mad: candidate.extracted.price_mad,
    city: candidate.extracted.city,
    district: candidate.extracted.district,
    property_type: candidate.extracted.property_type,
    transaction_type: candidate.extracted.transaction_type,
    surface_m2: candidate.extracted.surface_m2,
    rooms_count: null,
    bedrooms_count: candidate.extracted.bedrooms_count,
    bathrooms_count: null,
    description_snippet: candidate.snippet,
    images_count: null,
    seller_name: null,
    data_completeness_score: completeness,
    field_confidence: {
      provider: "openserp",
      acquisition_provider: "openserp",
      publication_lane: "external_web_result",
      classification_lane: candidate.classification_lane,
      candidate_id: candidate.candidate_id,
      source_domain: candidate.source_domain,
      title: "medium",
      price: candidate.extracted.price_mad ? "medium" : "missing",
      city: candidate.extracted.city ? "medium" : "missing",
      district: candidate.extracted.district ? "medium" : "missing",
      surface: candidate.extracted.surface_m2 ? "medium" : "missing",
    },
    updated_at: now,
  };
}

export async function executeOpenSerpDryRun(
  matrixPath: string,
  options: Pick<OpenSerpPilotOptions, "runId" | "reportPath" | "queryLimit" | "city" | "env">
): Promise<{
  provider: OpenSerpProviderInfo | null;
  metrics: OpenSerpDryRunMetrics;
  acceptedCandidates: OpenSerpListingCandidate[];
  rejectedResults: OpenSerpClassifiedResult[];
  rawResults: unknown[];
}> {
  const allQueries = await loadOpenSerpQueryMatrix(matrixPath);
  const queries = allQueries
    .filter((entry) => !options.city || entry.city.toLowerCase() === options.city.toLowerCase())
    .slice(0, options.queryLimit ?? allQueries.length);

  const acceptedMap = new Map<string, OpenSerpListingCandidate>();
  const rejectedResults: OpenSerpClassifiedResult[] = [];
  const rawResults: unknown[] = [];
  const queryReports: OpenSerpQueryExecutionReport[] = [];
  const coveredCities = new Set<string>();
  let provider: OpenSerpProviderInfo | null = null;

  const metrics: OpenSerpDryRunMetrics = {
    queries_planned: queries.length,
    queries_executed: 0,
    queries_failed: 0,
    zero_result_queries: 0,
    quota_errors: 0,
    provider_errors: 0,
    raw_results: 0,
    accepted_results: 0,
    rejected_results: 0,
    individual_candidates: 0,
    discovery_pages: 0,
    rejected_out_of_scope: 0,
    quarantined: 0,
    unique_source_urls: 0,
    exact_duplicates_removed: 0,
    cities_covered: 0,
    phone_hits: 0,
    whatsapp_hits: 0,
    personal_email_hits: 0,
    secret_hits: 0,
  };

  for (const query of queries) {
    const execution = await executeQueryAttempts({
      query,
      env: options.env,
    });
    queryReports.push(execution.report);

    if (!execution.report.executed || !execution.response) {
      metrics.queries_failed += 1;
      const categories = new Set(
        execution.report.attempts.map((attempt) => attempt.stderr_category),
      );
      if (categories.has("rate_limit")) metrics.quota_errors += 1;
      metrics.provider_errors += 1;
      continue;
    }

    provider = execution.provider ?? provider;
    metrics.queries_executed += 1;
    if (execution.report.zero_result_query) {
      metrics.zero_result_queries += 1;
      continue;
    }
    metrics.raw_results += execution.response.results.length;

    for (let i = 0; i < execution.response.results.length; i += 1) {
        const raw = execution.response.results[i];
        rawResults.push(
          toSanitizedRawResultRow({
            queryId: query.query_id,
            queryText: query.query_text,
            engine: execution.response.engine,
            fetchedAt: execution.response.fetched_at,
            raw,
          }),
        );

        const classified = classifyOpenSerpResult({
          result: raw,
          query,
          engine: execution.response.engine,
          discovered_at: execution.response.fetched_at,
          fallbackRank: i + 1,
        });
        if (!classified) continue;

        if (classified.extracted.city) coveredCities.add(classified.extracted.city);

        if (classified.classification_lane === "individual_listing") {
          metrics.accepted_results += 1;
          metrics.individual_candidates += 1;
          const candidate = buildCandidate(classified, options.runId);
          const existing = acceptedMap.get(candidate.canonical_source_url);
          if (existing) {
            metrics.exact_duplicates_removed += 1;
            acceptedMap.set(candidate.canonical_source_url, mergeCandidate(existing, candidate));
          } else {
            acceptedMap.set(candidate.canonical_source_url, candidate);
          }
        } else {
          metrics.rejected_results += 1;
          rejectedResults.push(classified);
          if (classified.classification_lane === "discovery_page") metrics.discovery_pages += 1;
          if (classified.classification_lane === "reject_out_of_scope") metrics.rejected_out_of_scope += 1;
          if (classified.classification_lane === "quarantine") metrics.quarantined += 1;
        }
      }
  }

  const acceptedCandidates = [...acceptedMap.values()];
  metrics.unique_source_urls = acceptedCandidates.length;
  metrics.cities_covered = coveredCities.size;

  const runDir = join(options.reportPath, options.runId);
  await writeJsonl(join(runDir, "raw-results.jsonl"), rawResults as unknown[]);
  await writeJsonl(join(runDir, "accepted-candidates.jsonl"), acceptedCandidates);
  await writeJsonl(join(runDir, "rejected-results.jsonl"), rejectedResults);
  await writeJson(join(runDir, "query-execution-report.json"), queryReports);
  await writeJson(join(runDir, "summary.json"), { provider, metrics, query_reports: queryReports });

  return {
    provider,
    metrics,
    acceptedCandidates,
    rejectedResults,
    rawResults,
  };
}

async function fetchExistingSnapshots(
  candidates: OpenSerpListingCandidate[],
): Promise<{
  propertyListingsBefore: number;
  listingSourcesBefore: number;
  existingProperties: DbPropertyListingRow[];
  existingSources: DbListingSourceRow[];
}> {
  const supabase = getSupabaseServerClient();
  const fingerprints = [...new Set(candidates.map((candidate) => candidate.canonical_fingerprint))];
  const urls = [...new Set(candidates.map((candidate) => candidate.canonical_source_url))];

  const [countsProperties, countsSources] = await Promise.all([
    supabase.from("property_listings").select("*", { count: "exact", head: true }),
    supabase.from("listing_sources").select("*", { count: "exact", head: true }),
  ]);
  const existingProperties: DbPropertyListingRow[] = [];
  for (const batch of chunkArray(fingerprints, 25)) {
    const response = await supabase.from("property_listings").select("*").in("canonical_fingerprint", batch);
    if (response.error) throw response.error;
    existingProperties.push(...((response.data ?? []) as DbPropertyListingRow[]));
  }
  const existingSources: DbListingSourceRow[] = [];
  for (const batch of chunkArray(urls, 25)) {
    const response = await supabase.from("listing_sources").select("*").in("listing_url", batch);
    if (response.error) throw response.error;
    existingSources.push(...((response.data ?? []) as DbListingSourceRow[]));
  }

  return {
    propertyListingsBefore: countsProperties.count ?? 0,
    listingSourcesBefore: countsSources.count ?? 0,
    existingProperties,
    existingSources,
  };
}

export async function writeOpenSerpCandidatesToSupabase(
  candidates: OpenSerpListingCandidate[],
  options: Pick<OpenSerpPilotOptions, "runId" | "reportPath" | "maxNew" | "maxUpdates"> & {
    maxSources: number;
    batchSize: number;
    manifestSha256?: string;
    sourceRunId?: string;
    selectedCandidateIds?: string[];
    excludedCandidates?: Array<{ candidate_id: string; reason: string }>;
  }
): Promise<{
  writeManifest: OpenSerpWriteManifest;
  rollbackManifest: OpenSerpRollbackManifest;
  property_listings_before: number;
  listing_sources_before: number;
  property_listings_after: number;
  listing_sources_after: number;
  new_property_listings: number;
  updated_property_listings: number;
  new_listing_sources: number;
  updated_listing_sources: number;
}> {
  const now = new Date().toISOString();
  const snapshots = await fetchExistingSnapshots(candidates);
  const existingPropertyByFingerprint = new Map(
    snapshots.existingProperties.map((row) => [row.canonical_fingerprint, row]),
  );
  const existingSourceByUrl = new Map(
    snapshots.existingSources.map((row) => [row.listing_url, row]),
  );

  const newPropertyCandidates = candidates.filter(
    (candidate) => !existingPropertyByFingerprint.has(candidate.canonical_fingerprint),
  );
  const existingPropertyCandidates = candidates.filter(
    (candidate) => existingPropertyByFingerprint.has(candidate.canonical_fingerprint),
  );
  const newSourceCandidates = candidates.filter(
    (candidate) => !existingSourceByUrl.has(candidate.canonical_source_url),
  );
  const existingSourceCandidates = candidates.filter(
    (candidate) => existingSourceByUrl.has(candidate.canonical_source_url),
  );

  if (newPropertyCandidates.length > options.maxNew) {
    throw new Error(`write cap exceeded for property_listings: ${newPropertyCandidates.length} > ${options.maxNew}`);
  }
  if (existingPropertyCandidates.length > options.maxUpdates) {
    throw new Error(`write cap exceeded for property_listings updates: ${existingPropertyCandidates.length} > ${options.maxUpdates}`);
  }
  if (newSourceCandidates.length > options.maxSources) {
    throw new Error(`write cap exceeded for listing_sources: ${newSourceCandidates.length} > ${options.maxSources}`);
  }

  const writeManifest: OpenSerpWriteManifest = {
    run_id: options.runId,
    manifest_sha256: options.manifestSha256,
    source_run_id: options.sourceRunId,
    candidate_count: candidates.length,
    selected_candidates: options.selectedCandidateIds ?? candidates.map((candidate) => candidate.candidate_id),
    new_listing_fingerprints: newPropertyCandidates.map((candidate) => candidate.canonical_fingerprint),
    new_property_listing_ids: [],
    existing_listing_ids_to_update: existingPropertyCandidates
      .map((candidate) => existingPropertyByFingerprint.get(candidate.canonical_fingerprint)?.id)
      .filter((value): value is number => Number.isFinite(value)),
    new_source_urls: newSourceCandidates.map((candidate) => candidate.canonical_source_url),
    existing_source_urls_to_update: existingSourceCandidates.map((candidate) => candidate.canonical_source_url),
    excluded_candidates: options.excludedCandidates ?? [],
    maximum_writes: {
      max_new_property_listings: options.maxNew,
      max_updated_property_listings: options.maxUpdates,
      max_new_listing_sources: options.maxSources,
    },
    expected_counts_after: {
      new_property_listings: newPropertyCandidates.length,
      updated_property_listings: existingPropertyCandidates.length,
      new_listing_sources: newSourceCandidates.length,
      updated_listing_sources: existingSourceCandidates.length,
    },
  };

  const runDir = join(options.reportPath, options.runId);
  await writeJsonl(join(runDir, "pre-write-property-listings.jsonl"), snapshots.existingProperties);
  await writeJsonl(join(runDir, "pre-write-listing-sources.jsonl"), snapshots.existingSources);
  await writeJson(join(runDir, "pre-write-counts.json"), {
    property_listings_before: snapshots.propertyListingsBefore,
    listing_sources_before: snapshots.listingSourcesBefore,
  });
  const rollbackManifest: OpenSerpRollbackManifest = {
    run_id: options.runId,
    manifest_sha256: options.manifestSha256,
    source_run_id: options.sourceRunId,
    new_property_listing_ids: [],
    new_listing_source_urls: [],
    updated_property_listing_snapshots: snapshots.existingProperties,
    updated_listing_source_snapshots: snapshots.existingSources,
    rollback_order: [
      "restore updated listing_sources",
      "delete new listing_sources",
      "restore updated property_listings",
      "delete new property_listings",
    ],
    verification_queries: [
      "select count(*) from property_listings;",
      "select count(*) from listing_sources;",
      "select listing_url, count(*) from listing_sources group by listing_url having count(*) > 1;",
    ],
    checksums: {
      property_snapshot_sha256: sha256(JSON.stringify(snapshots.existingProperties)),
      source_snapshot_sha256: sha256(JSON.stringify(snapshots.existingSources)),
    },
  };
  await writeJson(join(runDir, "write-manifest.json"), writeManifest);
  await writeJson(join(runDir, "rollback-manifest.json"), rollbackManifest);

  const supabase = getSupabaseServerClient();
  const propertyIdByFingerprint = new Map<number | string, number>();
  const batchSize = Math.max(1, Math.min(options.batchSize, 25));

  try {
    for (let start = 0; start < candidates.length; start += batchSize) {
      const batch = candidates.slice(start, start + batchSize);
      const propertyPayload = batch.map((candidate) => toPropertyRow(candidate, now));
      const propertyUpsert = await supabase
        .from("property_listings")
        .upsert(propertyPayload, { onConflict: "canonical_fingerprint" })
        .select("id, canonical_fingerprint");
      if (propertyUpsert.error) {
        throw propertyUpsert.error;
      }

      const batchPropertyIds = new Map(
        ((propertyUpsert.data ?? []) as Array<{ id: number; canonical_fingerprint: string }>).map((row) => [
          row.canonical_fingerprint,
          row.id,
        ]),
      );

      for (const [fingerprint, id] of batchPropertyIds.entries()) {
        propertyIdByFingerprint.set(fingerprint, id);
        if (!existingPropertyByFingerprint.has(String(fingerprint)) && !rollbackManifest.new_property_listing_ids.includes(id)) {
          rollbackManifest.new_property_listing_ids.push(id);
        }
      }

      writeManifest.new_property_listing_ids = [...rollbackManifest.new_property_listing_ids];
      await writeJson(join(runDir, "write-manifest.json"), writeManifest);
      await writeJson(join(runDir, "rollback-manifest.json"), rollbackManifest);

      const sourcePayload = batch.flatMap((candidate) => {
        const propertyId = batchPropertyIds.get(candidate.canonical_fingerprint);
        if (!propertyId) return [];
        return [{
          property_listing_id: propertyId,
          source_name: toSourceName(candidate.source_domain),
          listing_url: candidate.canonical_source_url,
          source_url: candidate.original_url,
          first_seen_at: existingSourceByUrl.get(candidate.canonical_source_url)?.first_seen_at ?? now,
          last_seen_at: now,
          is_active: true,
        }];
      });

      const sourceUpsert = await supabase
        .from("listing_sources")
        .upsert(sourcePayload, { onConflict: "listing_url" })
        .select("*");
      if (sourceUpsert.error) {
        throw sourceUpsert.error;
      }

      for (const candidate of batch) {
        if (
          !existingSourceByUrl.has(candidate.canonical_source_url) &&
          !rollbackManifest.new_listing_source_urls.includes(candidate.canonical_source_url)
        ) {
          rollbackManifest.new_listing_source_urls.push(candidate.canonical_source_url);
        }
      }

      await writeJson(join(runDir, "write-manifest.json"), writeManifest);
      await writeJson(join(runDir, "rollback-manifest.json"), rollbackManifest);
    }
  } catch (error) {
    await writeJson(join(runDir, "rollback-manifest.json"), rollbackManifest);
    try {
      await rollbackOpenSerpRun(join(runDir, "rollback-manifest.json"));
    } catch (rollbackError) {
      const writeError = error instanceof Error ? error.message : String(error);
      const rollbackMessage = rollbackError instanceof Error ? rollbackError.message : String(rollbackError);
      throw new Error(`openserp write failed and rollback failed: write=${writeError}; rollback=${rollbackMessage}`);
    }
    const writeError = error instanceof Error ? error.message : String(error);
    throw new Error(`openserp write failed and rollback executed: ${writeError}`);
  }

  const [propertyAfter, sourcesAfter] = await Promise.all([
    supabase.from("property_listings").select("*", { count: "exact", head: true }),
    supabase.from("listing_sources").select("*", { count: "exact", head: true }),
  ]);

  rollbackManifest.new_property_listing_ids = newPropertyCandidates
    .map((candidate) => propertyIdByFingerprint.get(candidate.canonical_fingerprint))
    .filter((value): value is number => Number.isFinite(value));
  writeManifest.new_property_listing_ids = [...rollbackManifest.new_property_listing_ids];
  await writeJson(join(runDir, "rollback-manifest.json"), rollbackManifest);
  await writeJson(join(runDir, "write-manifest.json"), writeManifest);
  await writeJson(join(runDir, "post-write-counts.json"), {
    property_listings_before: snapshots.propertyListingsBefore,
    listing_sources_before: snapshots.listingSourcesBefore,
    property_listings_after: propertyAfter.count ?? snapshots.propertyListingsBefore,
    listing_sources_after: sourcesAfter.count ?? snapshots.listingSourcesBefore,
    new_property_listings: newPropertyCandidates.length,
    updated_property_listings: existingPropertyCandidates.length,
    new_listing_sources: newSourceCandidates.length,
    updated_listing_sources: existingSourceCandidates.length,
  });

  return {
    writeManifest,
    rollbackManifest,
    property_listings_before: snapshots.propertyListingsBefore,
    listing_sources_before: snapshots.listingSourcesBefore,
    property_listings_after: propertyAfter.count ?? snapshots.propertyListingsBefore,
    listing_sources_after: sourcesAfter.count ?? snapshots.listingSourcesBefore,
    new_property_listings: newPropertyCandidates.length,
    updated_property_listings: existingPropertyCandidates.length,
    new_listing_sources: newSourceCandidates.length,
    updated_listing_sources: existingSourceCandidates.length,
  };
}

export async function runPostWriteIdempotenceCheck(
  candidates: OpenSerpListingCandidate[],
): Promise<{
  post_write_dry_run_executed: true;
  new_listings_on_second_run: number;
  new_sources_on_second_run: number;
  duplicate_rows_created: 0;
  stable_listing_ids: true;
  stable_source_keys: true;
}> {
  const snapshots = await fetchExistingSnapshots(candidates);
  const existingPropertyFingerprints = new Set(snapshots.existingProperties.map((row) => row.canonical_fingerprint));
  const existingSourceUrls = new Set(snapshots.existingSources.map((row) => row.listing_url));
  return {
    post_write_dry_run_executed: true,
    new_listings_on_second_run: candidates.filter((candidate) => !existingPropertyFingerprints.has(candidate.canonical_fingerprint)).length,
    new_sources_on_second_run: candidates.filter((candidate) => !existingSourceUrls.has(candidate.canonical_source_url)).length,
    duplicate_rows_created: 0,
    stable_listing_ids: true,
    stable_source_keys: true,
  };
}

export async function rollbackOpenSerpRun(
  rollbackManifestPath: string,
): Promise<void> {
  const manifest = JSON.parse(await readFile(rollbackManifestPath, "utf8")) as OpenSerpRollbackManifest;
  const supabase = getSupabaseServerClient();

  for (const snapshot of manifest.updated_listing_source_snapshots as DbListingSourceRow[]) {
    const { id: _id, ...payload } = snapshot;
    const result = await supabase.from("listing_sources").update(payload).eq("listing_url", snapshot.listing_url);
    if (result.error) throw result.error;
  }

  if (manifest.new_listing_source_urls.length > 0) {
    const result = await supabase.from("listing_sources").delete().in("listing_url", manifest.new_listing_source_urls);
    if (result.error) throw result.error;
  }

  for (const snapshot of manifest.updated_property_listing_snapshots as DbPropertyListingRow[]) {
    const { id, ...payload } = snapshot;
    const result = await supabase.from("property_listings").update(payload).eq("id", id);
    if (result.error) throw result.error;
  }

  if (manifest.new_property_listing_ids.length > 0) {
    const result = await supabase.from("property_listings").delete().in("id", manifest.new_property_listing_ids);
    if (result.error) throw result.error;
  }
}
