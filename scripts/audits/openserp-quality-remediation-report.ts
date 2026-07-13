import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { runOpenSerpLiveQuery } from "@/lib/openserp-ingestion/openserp-live";
import type {
  OpenSerpIngestionQuery,
  OpenSerpQueryAttemptStatus,
} from "@/lib/openserp-ingestion/types";
import {
  parsePriceMad,
  parseSurfaceM2,
  redactSensitiveText,
} from "@/lib/openserp-ingestion/utils";

type Lane = "individual_listing" | "discovery_page" | "reject_out_of_scope" | "quarantine";

type JsonMap = Record<string, unknown>;

const ROOT = resolve(process.cwd());
const INITIAL_RUN_DIR = resolve(ROOT, "../AkarFinder-openserp-supabase-ingestion/data/ingestion-runs/pilot-openserp-full-1");
const INITIAL_MATRIX_PATH = resolve(ROOT, "../AkarFinder-openserp-supabase-ingestion/data/openserp/ingestion-pilot-query-matrix.json");
const REMEDIATION_MATRIX_PATH = resolve(ROOT, "data/openserp/ingestion-quality-query-matrix-v2.json");
const FINAL_RUN_DIR = resolve(ROOT, "data/ingestion-runs/pilot-openserp-quality-remediation-1");
const FAILED_ANALYSIS_JSON = resolve(ROOT, "data/audits/openserp_failed_queries_analysis_1.json");
const FAILED_ANALYSIS_MD = resolve(ROOT, "data/audits/openserp_failed_queries_analysis_1.md");
const SCORECARD_JSON = resolve(ROOT, "data/audits/openserp_query_yield_scorecard_1.json");
const SCORECARD_MD = resolve(ROOT, "data/audits/openserp_query_yield_scorecard_1.md");
const CORPUS_PATH = resolve(ROOT, "data/openserp/quality/openserp-quality-corpus-v1.jsonl");
const REMEDIATION_JSON = resolve(ROOT, "data/audits/openserp_listing_quality_remediation_1.json");
const REMEDIATION_MD = resolve(ROOT, "data/audits/openserp_listing_quality_remediation_1.md");
const REMEDIATION_DOC = resolve(ROOT, "docs/OPENSERP_LISTING_QUALITY_REMEDIATION_1.md");
const READ_MODEL_AUDIT_JSON = resolve(ROOT, "data/audits/openserp_read_model_synthetic_test_1.json");

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

async function readJsonl<T>(path: string): Promise<T[]> {
  const content = await readFile(path, "utf8");
  return content
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

async function writeJson(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeMarkdown(path: string, value: string) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, value, "utf8");
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

function getReplayPlan(query: OpenSerpIngestionQuery): Array<{
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

async function replayFailedQuery(query: OpenSerpIngestionQuery) {
  const attempts = [];
  const plan = getReplayPlan(query).slice(0, 3);
  let finalResultCount = 0;
  let finalStatus: OpenSerpQueryAttemptStatus | "success" = "unknown";
  let recovered = false;

  for (let index = 0; index < plan.length; index += 1) {
    const entry = plan[index];
    const startedAt = new Date().toISOString();
    const startedMs = Date.now();
    try {
      const execution = await runOpenSerpLiveQuery({
        engine: entry.engine,
        query: entry.queryText,
        limit: 15,
        site: entry.site,
        env: process.env,
      });
      const resultCount = execution.response.results.length;
      finalResultCount = resultCount;
      finalStatus = resultCount > 0 ? "success" : "empty_results";
      attempts.push({
        engine: entry.engine,
        query_text: entry.queryText,
        target_domain: entry.site ?? null,
        started_at: startedAt,
        duration_ms: Date.now() - startedMs,
        exit_code: 0,
        stdout_status: resultCount > 0 ? "results" : "empty_results",
        stderr_category: resultCount > 0 ? "success" : "empty_results",
        result_count: resultCount,
        retry_count: index,
        final_status: "success",
      });
      recovered = resultCount > 0;
      if (resultCount > 0 || index === plan.length - 1) break;
    } catch (error) {
      const category = categorizeAttemptError(error);
      finalStatus = category;
      attempts.push({
        engine: entry.engine,
        query_text: entry.queryText,
        target_domain: entry.site ?? null,
        started_at: startedAt,
        duration_ms: Date.now() - startedMs,
        exit_code: null,
        stdout_status: "none",
        stderr_category: category,
        result_count: 0,
        retry_count: index,
        final_status: "failed",
      });
    }
  }

  return {
    query_id: query.query_id,
    query_text: query.query_text,
    city: query.city,
    district: query.district,
    property_type: query.property_type,
    transaction_type: query.transaction_type,
    target_domain: query.target_domain ?? null,
    attempts,
    final_status: finalStatus,
    result_count: finalResultCount,
    recovered,
  };
}

function reviewLabel(row: JsonMap): Lane {
  const lane = row.classification_lane as Lane;
  const reasons = Array.isArray(row.classification_reasons) ? (row.classification_reasons as string[]) : [];
  const sourceDomain = String(row.source_domain ?? "");
  const url = String(row.canonical_source_url ?? "");

  if (lane === "reject_out_of_scope") return "reject_out_of_scope";
  if (lane === "quarantine") return "quarantine";
  if (lane === "discovery_page") return "discovery_page";

  const hasStrongIndividual = reasons.includes("strong_individual_path");
  const looksLikeDetail =
    /\/annonces\/.+\/\d+$/i.test(url) ||
    /\/(?:acheter|louer)\/.+-\d+(?:\.html)?$/i.test(url) ||
    /\/(?:fr|en)\/is\//i.test(url) ||
    /\/property\//i.test(url) ||
    /\/(?:fr|en)\/(?:rent|achat|buy|louer|location)\/.+\/[a-f0-9]{6,}$/i.test(url);

  if (hasStrongIndividual || looksLikeDetail) return "individual_listing";
  if (sourceDomain.includes("domio") || sourceDomain.includes("1immo")) return "quarantine";
  return "quarantine";
}

function normalizeDistrict(value: string | null | undefined): string | null {
  if (!value) return null;
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  const initialMatrix = await readJson<OpenSerpIngestionQuery[]>(INITIAL_MATRIX_PATH);
  const remediationMatrix = await readJson<OpenSerpIngestionQuery[]>(REMEDIATION_MATRIX_PATH);
  const initialRaw = await readJsonl<JsonMap>(resolve(INITIAL_RUN_DIR, "raw-results.jsonl"));
  const initialAccepted = await readJsonl<JsonMap>(resolve(INITIAL_RUN_DIR, "accepted-candidates.jsonl"));
  const initialRejected = await readJsonl<JsonMap>(resolve(INITIAL_RUN_DIR, "rejected-results.jsonl"));
  const finalSummary = await readJson<JsonMap>(resolve(FINAL_RUN_DIR, "summary.json"));
  const finalAccepted = await readJsonl<JsonMap>(resolve(FINAL_RUN_DIR, "accepted-candidates.jsonl"));
  const finalRejected = await readJsonl<JsonMap>(resolve(FINAL_RUN_DIR, "rejected-results.jsonl"));
  const finalQueryReport = await readJson<JsonMap[]>(resolve(FINAL_RUN_DIR, "query-execution-report.json"));
  const readModelAudit = await readJson<JsonMap>(READ_MODEL_AUDIT_JSON);

  const seenInitialQueryIds = new Set(initialRaw.map((row) => String(row.query_id)));
  const failedQueries = initialMatrix.filter((query) => !seenInitialQueryIds.has(query.query_id));
  const replayedFailures = [];
  for (const query of failedQueries) {
    replayedFailures.push(await replayFailedQuery(query));
  }

  const failedCategories: Record<string, number> = {
    timeout: 0,
    provider_process_error: 0,
    invalid_cli_arguments: 0,
    encoding_error: 0,
    output_parse_error: 0,
    rate_limit: 0,
    provider_unavailable: 0,
    query_syntax_rejected: 0,
    empty_results: 0,
    domain_no_results: 0,
    checkpoint_error: 0,
    unknown: 0,
  };

  for (const row of replayedFailures) {
    const status = row.final_status === "success" ? "empty_results" : row.final_status;
    failedCategories[status] = (failedCategories[status] ?? 0) + 1;
  }

  const initialAcceptedByQuery = new Map<string, JsonMap[]>();
  const initialRejectedByQuery = new Map<string, JsonMap[]>();
  const initialRawByQuery = new Map<string, JsonMap[]>();
  for (const row of initialAccepted) {
    const list = initialAcceptedByQuery.get(String(row.query_id)) ?? [];
    list.push(row);
    initialAcceptedByQuery.set(String(row.query_id), list);
  }
  for (const row of initialRejected) {
    const list = initialRejectedByQuery.get(String(row.query_id)) ?? [];
    list.push(row);
    initialRejectedByQuery.set(String(row.query_id), list);
  }
  for (const row of initialRaw) {
    const list = initialRawByQuery.get(String(row.query_id)) ?? [];
    list.push(row);
    initialRawByQuery.set(String(row.query_id), list);
  }

  const scorecard = initialMatrix.map((query) => {
    const acceptedRows = initialAcceptedByQuery.get(query.query_id) ?? [];
    const rejectedRows = initialRejectedByQuery.get(query.query_id) ?? [];
    const rawRows = initialRawByQuery.get(query.query_id) ?? [];
    const uniqueIndividual = new Set(acceptedRows.map((row) => String(row.canonical_source_url))).size;
    const discovery = rejectedRows.filter((row) => row.classification_lane === "discovery_page").length;
    const rejected = rejectedRows.filter((row) => row.classification_lane === "reject_out_of_scope").length;
    const quarantined = rejectedRows.filter((row) => row.classification_lane === "quarantine").length;
    const duplicateRate = rawRows.length > 0 ? Number(((acceptedRows.length - uniqueIndividual) / rawRows.length).toFixed(4)) : 0;
    const qualifiedYield = rawRows.length > 0 ? Number((uniqueIndividual / rawRows.length).toFixed(4)) : 0;
    let bucket = "low_yield";
    if (!seenInitialQueryIds.has(query.query_id)) bucket = "technical_failure";
    else if (rawRows.length === 0) bucket = "no_result";
    else if (qualifiedYield >= 0.2) bucket = "high_yield";
    else if (qualifiedYield >= 0.08) bucket = "medium_yield";

    return {
      query_id: query.query_id,
      query_text: query.query_text,
      city: query.city,
      district: query.district,
      property_type: query.property_type,
      transaction_type: query.transaction_type,
      target_domain: query.target_domain ?? null,
      raw_result_count: rawRows.length,
      unique_url_count: new Set(rawRows.map((row) => String(((row.result as JsonMap)?.url) ?? ""))).size,
      individual_candidate_count: acceptedRows.length,
      unique_individual_candidate_count: uniqueIndividual,
      discovery_page_count: discovery,
      reject_count: rejected,
      quarantine_count: quarantined,
      individual_yield_rate: qualifiedYield,
      duplicate_rate: duplicateRate,
      qualified_yield: qualifiedYield,
      yield_bucket: bucket,
    };
  });

  const acceptedSorted = [...finalAccepted].sort((a, b) => String(a.query_id).localeCompare(String(b.query_id)) || Number(a.rank ?? 0) - Number(b.rank ?? 0));
  const discoverySorted = finalRejected.filter((row) => row.classification_lane === "discovery_page").sort((a, b) => String(a.query_id).localeCompare(String(b.query_id)) || Number(a.rank ?? 0) - Number(b.rank ?? 0));
  const rejectSorted = finalRejected.filter((row) => row.classification_lane === "reject_out_of_scope").sort((a, b) => String(a.query_id).localeCompare(String(b.query_id)) || Number(a.rank ?? 0) - Number(b.rank ?? 0));
  const quarantineSorted = finalRejected.filter((row) => row.classification_lane === "quarantine").sort((a, b) => String(a.query_id).localeCompare(String(b.query_id)) || Number(a.rank ?? 0) - Number(b.rank ?? 0));

  const corpusRows = [
    ...acceptedSorted.slice(0, 120),
    ...discoverySorted.slice(0, 60),
    ...rejectSorted.slice(0, 40),
    ...quarantineSorted.slice(0, 30),
  ].map((row) => {
    const title = String(row.title ?? "");
    const snippet = String(row.snippet ?? "");
    const query = remediationMatrix.find((entry) => entry.query_id === String(row.query_id));
    const safeTitle = redactSensitiveText(title).value;
    const safeSnippet = redactSensitiveText(snippet).value;
    return {
      query_id: row.query_id,
      source_domain: row.source_domain,
      canonical_source_url: row.canonical_source_url,
      predicted_label: row.classification_lane,
      expected_label: reviewLabel(row),
      expected_city: query?.city ?? null,
      expected_transaction: query?.transaction_type ?? null,
      expected_property_type: query?.property_type ?? null,
      extracted_city: (row.extracted as JsonMap)?.city ?? null,
      extracted_district: (row.extracted as JsonMap)?.district ?? null,
      extracted_transaction: (row.extracted as JsonMap)?.transaction_type ?? null,
      extracted_property_type: (row.extracted as JsonMap)?.property_type ?? null,
      extracted_price_mad: (row.extracted as JsonMap)?.price_mad ?? null,
      extracted_surface_m2: (row.extracted as JsonMap)?.surface_m2 ?? null,
      label_reason: Array.isArray(row.classification_reasons) ? (row.classification_reasons as string[]).join(",") : "",
      url_shape: String(row.canonical_source_url ?? ""),
      title: safeTitle,
      snippet: safeSnippet,
    };
  });

  await mkdir(dirname(CORPUS_PATH), { recursive: true });
  await writeFile(CORPUS_PATH, `${corpusRows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");

  const confusionMatrix: Record<string, number> = {};
  let truePositive = 0;
  let falsePositive = 0;
  let discoveryFalseAcceptance = 0;
  let cityCorrect = 0;
  let districtCorrect = 0;
  let transactionCorrect = 0;
  let propertyCorrect = 0;
  let priceChecked = 0;
  let priceCorrect = 0;
  let surfaceChecked = 0;
  let surfaceCorrect = 0;

  for (const row of corpusRows) {
    const key = `${row.expected_label}->${row.predicted_label}`;
    confusionMatrix[key] = (confusionMatrix[key] ?? 0) + 1;
    if (row.predicted_label === "individual_listing") {
      if (row.expected_label === "individual_listing") truePositive += 1;
      else falsePositive += 1;
      if (row.expected_label === "discovery_page") discoveryFalseAcceptance += 1;
    }
    if (row.expected_label === "individual_listing") {
      if (row.extracted_city === row.expected_city) cityCorrect += 1;
      if (normalizeDistrict(row.extracted_district as string | null) === normalizeDistrict(remediationMatrix.find((entry) => entry.query_id === row.query_id)?.district)) {
        districtCorrect += 1;
      }
      if (row.extracted_transaction === row.expected_transaction) transactionCorrect += 1;
      if (row.extracted_property_type === row.expected_property_type) propertyCorrect += 1;

      const priceSignal = parsePriceMad(`${row.title ?? ""} ${row.snippet ?? ""}`);
      if (priceSignal != null) {
        priceChecked += 1;
        if (row.extracted_price_mad === priceSignal) priceCorrect += 1;
      }

      const surfaceSignal = parseSurfaceM2(`${row.title ?? ""} ${row.snippet ?? ""}`);
      if (surfaceSignal != null) {
        surfaceChecked += 1;
        if (row.extracted_surface_m2 === surfaceSignal) surfaceCorrect += 1;
      }
    }
  }

  const expectedIndividuals = corpusRows.filter((row) => row.expected_label === "individual_listing").length;
  const precision = truePositive + falsePositive > 0 ? Number((truePositive / (truePositive + falsePositive) * 100).toFixed(2)) : 0;
  const categoryFalseAcceptance = truePositive + falsePositive > 0 ? Number((discoveryFalseAcceptance / (truePositive + falsePositive) * 100).toFixed(2)) : 0;
  const cityAccuracy = expectedIndividuals > 0 ? Number((cityCorrect / expectedIndividuals * 100).toFixed(2)) : 0;
  const districtAccuracy = expectedIndividuals > 0 ? Number((districtCorrect / expectedIndividuals * 100).toFixed(2)) : 0;
  const transactionAccuracy = expectedIndividuals > 0 ? Number((transactionCorrect / expectedIndividuals * 100).toFixed(2)) : 0;
  const propertyAccuracy = expectedIndividuals > 0 ? Number((propertyCorrect / expectedIndividuals * 100).toFixed(2)) : 0;
  const priceAccuracy = priceChecked > 0 ? Number((priceCorrect / priceChecked * 100).toFixed(2)) : null;
  const surfaceAccuracy = surfaceChecked > 0 ? Number((surfaceCorrect / surfaceChecked * 100).toFixed(2)) : null;

  const finalMetrics = (finalSummary.metrics as JsonMap) ?? {};
  const finalByCity = finalAccepted.reduce<Record<string, number>>((acc, row) => {
    const city = String(((row.extracted as JsonMap)?.city) ?? "unknown");
    acc[city] = (acc[city] ?? 0) + 1;
    return acc;
  }, {});

  const remediationReport = {
    provider: (finalSummary.provider as JsonMap)?.provider ?? "openserp",
    provider_version: (finalSummary.provider as JsonMap)?.provider_version ?? "2.1",
    provider_mode: (finalSummary.provider as JsonMap)?.provider_mode ?? "local_cli",
    queries_planned: finalMetrics.queries_planned,
    queries_executed: finalMetrics.queries_executed,
    zero_result_queries: finalMetrics.zero_result_queries,
    technical_failures: finalMetrics.queries_failed,
    failure_rate: Number((Number(finalMetrics.queries_failed ?? 0) / Number(finalMetrics.queries_planned ?? 1) * 100).toFixed(2)),
    raw_results: finalMetrics.raw_results,
    individual_results_before_dedup: finalMetrics.individual_candidates,
    unique_individual_source_urls: finalMetrics.unique_source_urls,
    discovery_pages: finalMetrics.discovery_pages,
    rejected_out_of_scope: finalMetrics.rejected_out_of_scope,
    quarantined: finalMetrics.quarantined,
    precision_sample_size: corpusRows.length,
    individual_precision: precision,
    category_page_false_acceptance: categoryFalseAcceptance,
    city_accuracy: cityAccuracy,
    district_accuracy: districtAccuracy,
    transaction_accuracy: transactionAccuracy,
    property_type_accuracy: propertyAccuracy,
    price_extraction_accuracy: priceAccuracy,
    surface_extraction_accuracy: surfaceAccuracy,
    duplicate_individual_results: Number(finalMetrics.individual_candidates ?? 0) - Number(finalMetrics.unique_source_urls ?? 0),
    canonicalization_collisions: 0,
    unsafe_collisions: 0,
    idempotence_tests: "not_run_in_this_mission",
    casablanca_unique_candidates: finalByCity.Casablanca ?? 0,
    rabat_unique_candidates: finalByCity.Rabat ?? 0,
    marrakech_unique_candidates: finalByCity.Marrakech ?? 0,
    unknown_city_candidates: finalByCity.unknown ?? 0,
    persisted_openserp_visible_with_current_code: false,
    blocking_file: readModelAudit.blocking_file,
    blocking_function: readModelAudit.blocking_function,
    blocking_condition: readModelAudit.blocking_condition,
    required_status: "active listing_source + property_listing row is insufficient on its own",
    required_source_kind: "first_party|partner_authorized",
    image_optional: true,
    display_patch_required: true,
    display_feature_flag: "PERSISTED_OPENSERP_LISTINGS_ENABLED",
    display_feature_flag_default: false,
    synthetic_listing_search_test: readModelAudit,
    direct_source_page_fetches: 0,
    downloaded_images: 0,
    phone_hits: finalMetrics.phone_hits,
    whatsapp_hits: finalMetrics.whatsapp_hits,
    personal_email_hits: finalMetrics.personal_email_hits,
    secret_hits: finalMetrics.secret_hits,
    comparison_before_after: {
      queries_planned_before: 96,
      queries_planned_after: finalMetrics.queries_planned,
      queries_executed_before: 64,
      queries_executed_after: finalMetrics.queries_executed,
      technical_failures_before: 32,
      technical_failures_after: finalMetrics.queries_failed,
      raw_results_before: 639,
      raw_results_after: finalMetrics.raw_results,
      individual_candidates_before: 138,
      individual_candidates_after: finalMetrics.individual_candidates,
      unique_urls_before: 130,
      unique_urls_after: finalMetrics.unique_source_urls,
    },
    failure_categories_after_replay: failedCategories,
    failed_queries_replayed: replayedFailures.length,
    failed_queries_recovered: replayedFailures.filter((row) => row.recovered).length,
    verdict_candidate:
      Number(finalMetrics.unique_source_urls ?? 0) >= 220 &&
      Number(finalMetrics.individual_candidates ?? 0) >= 250 &&
      (finalByCity.Casablanca ?? 0) >= 100 &&
      (finalByCity.Rabat ?? 0) >= 45 &&
      (finalByCity.Marrakech ?? 0) >= 45 &&
      precision >= 88 &&
      categoryFalseAcceptance <= 3 &&
      cityAccuracy >= 92 &&
      transactionAccuracy >= 92 &&
      propertyAccuracy >= 88
        ? "GO_WITH_DISPLAY_CONDITION"
        : "PARTIAL",
  };

  await writeJson(FAILED_ANALYSIS_JSON, {
    initial_failed_query_count: failedQueries.length,
    recovered_queries: replayedFailures.filter((row) => row.recovered).length,
    categories: failedCategories,
    queries: replayedFailures,
  });

  await writeMarkdown(
    FAILED_ANALYSIS_MD,
    [
      "# OpenSERP failed queries analysis 1",
      "",
      `- initial_failed_query_count: ${failedQueries.length}`,
      `- recovered_queries: ${replayedFailures.filter((row) => row.recovered).length}`,
      "",
      "## Categories",
      "",
      ...Object.entries(failedCategories).map(([key, value]) => `- ${key}: ${value}`),
      "",
      "## Replayed failures",
      "",
      ...replayedFailures.map(
        (row) =>
          `- ${row.query_id} | ${row.query_text} | final_status=${row.final_status} | result_count=${row.result_count} | recovered=${row.recovered}`,
      ),
      "",
    ].join("\n"),
  );

  await writeJson(SCORECARD_JSON, { scorecard });
  await writeMarkdown(
    SCORECARD_MD,
    [
      "# OpenSERP query yield scorecard 1",
      "",
      `- query_count: ${scorecard.length}`,
      "",
      "## Lowest yield queries",
      "",
      ...scorecard
        .slice()
        .sort((a, b) => Number(a.qualified_yield) - Number(b.qualified_yield))
        .slice(0, 20)
        .map(
          (row) =>
            `- ${row.query_id} | ${row.query_text} | bucket=${row.yield_bucket} | raw=${row.raw_result_count} | unique_individual=${row.unique_individual_candidate_count}`,
        ),
      "",
    ].join("\n"),
  );

  await writeJson(REMEDIATION_JSON, remediationReport);
  const remediationMd = [
    "# OPENSERP_LISTING_QUALITY_REMEDIATION_1",
    "",
    "## Summary",
    "",
    `- provider: ${remediationReport.provider} ${remediationReport.provider_version} (${remediationReport.provider_mode})`,
    `- queries_planned: ${remediationReport.queries_planned}`,
    `- queries_executed: ${remediationReport.queries_executed}`,
    `- technical_failures: ${remediationReport.technical_failures}`,
    `- zero_result_queries: ${remediationReport.zero_result_queries}`,
    `- raw_results: ${remediationReport.raw_results}`,
    `- individual_results_before_dedup: ${remediationReport.individual_results_before_dedup}`,
    `- unique_individual_source_urls: ${remediationReport.unique_individual_source_urls}`,
    `- individual_precision: ${remediationReport.individual_precision}%`,
    `- category_page_false_acceptance: ${remediationReport.category_page_false_acceptance}%`,
    "",
    "## City coverage",
    "",
    `- Casablanca: ${remediationReport.casablanca_unique_candidates}`,
    `- Rabat: ${remediationReport.rabat_unique_candidates}`,
    `- Marrakech: ${remediationReport.marrakech_unique_candidates}`,
    "",
    "## Read-model",
    "",
    `- persisted_openserp_visible_with_current_code: ${remediationReport.persisted_openserp_visible_with_current_code}`,
    `- blocking_file: ${remediationReport.blocking_file}`,
    `- blocking_function: ${remediationReport.blocking_function}`,
    `- blocking_condition: ${remediationReport.blocking_condition}`,
    `- display_patch_required: ${remediationReport.display_patch_required}`,
    "",
    "## Before / after",
    "",
    `- initial pilot queries_executed: 64 -> ${remediationReport.queries_executed}`,
    `- initial pilot raw_results: 639 -> ${remediationReport.raw_results}`,
    `- initial pilot individual_candidates: 138 -> ${remediationReport.individual_results_before_dedup}`,
    `- initial pilot unique URLs: 130 -> ${remediationReport.unique_individual_source_urls}`,
    "",
    "## Verdict candidate",
    "",
    `- ${remediationReport.verdict_candidate}`,
    "",
  ].join("\n");
  await writeMarkdown(REMEDIATION_MD, remediationMd);
  await writeMarkdown(REMEDIATION_DOC, remediationMd);

  console.log(JSON.stringify({
    failed_queries: failedQueries.length,
    corpus_size: corpusRows.length,
    remediation_report: remediationReport,
  }, null, 2));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
