import fs from "node:fs/promises";
import path from "node:path";

import {
  buildReservoirDepthReport,
  renderReservoirDepthMarkdown,
  type InternalReservoirMetrics,
  type PublicReservoirEvidence,
  type QualitySnapshot,
  type RegistrySnapshot,
  type ReservoirDomain,
} from "../data4/reservoir-depth-audit";

const evidencePath = process.env.DATA_4_PUBLIC_EVIDENCE_PATH ?? "scripts/data4/public-evidence.json";
const outDir = process.env.DATA_4_OUT_DIR ?? ".tmp/data-4-0/results";
const REQUEST_TIMEOUT_MS = 10_000;
const SOURCES: ReservoirDomain[] = ["avito.ma", "mubawab.ma"];

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`DATA-4.0 requires ${name}`);
  return value;
}

function headers(serviceRoleKey: string, count = false): HeadersInit {
  return {
    apikey: serviceRoleKey,
    authorization: `Bearer ${serviceRoleKey}`,
    ...(count ? { Prefer: "count=exact" } : {}),
  };
}

async function restRows<T>(table: string, params: Record<string, string>): Promise<T[]> {
  const supabaseUrl = env("SUPABASE_URL");
  const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY");
  const url = new URL(`/rest/v1/${table}`, supabaseUrl);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = await fetch(url, {
    method: "GET",
    headers: headers(serviceRoleKey),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`${table} read failed with HTTP ${response.status}${body ? `: ${body.slice(0, 300)}` : ""}`);
  }
  return (await response.json()) as T[];
}

async function countRows(table: string, filters: Record<string, string>): Promise<number> {
  const supabaseUrl = env("SUPABASE_URL");
  const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY");
  const url = new URL(`/rest/v1/${table}`, supabaseUrl);
  url.searchParams.set("select", "source_domain");
  for (const [key, value] of Object.entries(filters)) url.searchParams.set(key, value);
  const response = await fetch(url, {
    method: "GET",
    headers: { ...headers(serviceRoleKey, true), Range: "0-0" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`${table} count failed with HTTP ${response.status}${body ? `: ${body.slice(0, 300)}` : ""}`);
  }
  const range = response.headers.get("content-range");
  if (!range) throw new Error(`${table} count response lacks content-range`);
  const match = range.match(/\/(\d+|\*)$/);
  if (!match || match[1] === "*") throw new Error(`${table} invalid content-range ${range}`);
  return Number.parseInt(match[1], 10);
}

async function singleRow<T>(table: string, params: Record<string, string>): Promise<T | null> {
  const rows = await restRows<T>(table, { ...params, limit: "1" });
  return rows[0] ?? null;
}

async function collectDomain(domain: ReservoirDomain): Promise<InternalReservoirMetrics> {
  const registry = await singleRow<RegistrySnapshot>("source_policy_registry", {
    select: "source_domain,current_representation_count,discovery_policy,detail_fetch_policy,content_reuse_policy,display_policy,authorization_status,acquisition_mode,allowed_discovery_channels,robots_status,terms_status,review_status,machine_gate,ingestion_gate,display_gate,reviewed_at,next_review_at,policy_version",
    source_domain: `eq.${domain}`,
  });
  if (!registry) throw new Error(`DATA-4.0 Registry row missing for ${domain}`);

  const qualityRaw = await singleRow<Record<string, unknown>>("odm_10d_source_quality_report", {
    select: "source_domain,real_estate_rows,average_score,median_score,tier_a,tier_b,tier_c,tier_d,tier_e,with_city,with_price,with_surface",
    source_domain: `eq.${domain}`,
  });
  const quality: QualitySnapshot | null = qualityRaw
    ? {
        source_domain: domain,
        real_estate_rows: Number(qualityRaw.real_estate_rows ?? 0),
        average_score: Number(qualityRaw.average_score ?? 0),
        median_score: Number(qualityRaw.median_score ?? 0),
        tier_a: Number(qualityRaw.tier_a ?? 0),
        tier_b: Number(qualityRaw.tier_b ?? 0),
        tier_c: Number(qualityRaw.tier_c ?? 0),
        tier_d: Number(qualityRaw.tier_d ?? 0),
        tier_e: Number(qualityRaw.tier_e ?? 0),
        with_city: Number(qualityRaw.with_city ?? 0),
        with_price: Number(qualityRaw.with_price ?? 0),
        with_surface: Number(qualityRaw.with_surface ?? 0),
      }
    : null;

  const filter = { source_domain: `eq.${domain}` };
  const [
    discoveryCandidateRows,
    offerSeedRows,
    normalizedRows,
    normalizationUnavailableRows,
    normalizationNormalizedRows,
    normalizationPartialRows,
    freshConfirmedRows,
    technicalSearchRepresentationRows,
    technicalDisplayEligibleRows,
  ] = await Promise.all([
    countRows("discovery_candidates", filter),
    countRows("source_offer_seeds", filter),
    countRows("thin_index_normalized_documents_v2", filter),
    countRows("thin_index_normalized_documents_v2", { ...filter, normalization_status: "eq.unavailable" }),
    countRows("thin_index_normalized_documents_v2", { ...filter, normalization_status: "eq.normalized" }),
    countRows("thin_index_normalized_documents_v2", { ...filter, normalization_status: "eq.partial" }),
    countRows("thin_index_normalized_documents_v2", { ...filter, freshness_status: "eq.fresh_confirmed" }),
    countRows("public_search_representations_v1", filter),
    countRows("thin_index_display_eligible_v1", filter),
  ]);

  return {
    domain,
    discoveryCandidateRows,
    offerSeedRows,
    normalizedRows,
    normalizationUnavailableRows,
    normalizationNormalizedRows,
    normalizationPartialRows,
    freshConfirmedRows,
    technicalSearchRepresentationRows,
    technicalDisplayEligibleRows,
    quality,
    registry,
    sourceFreshness: null,
  };
}

function csvEscape(value: unknown): string {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function main(): Promise<void> {
  const publicEvidence = JSON.parse(await fs.readFile(evidencePath, "utf8")) as PublicReservoirEvidence[];
  const metrics = await Promise.all(SOURCES.map(collectDomain));
  const report = buildReservoirDepthReport(publicEvidence, metrics);

  const proof = {
    schemaVersion: "data-4-0-large-reservoir-depth-proof-v1",
    generatedAt: report.generatedAt,
    readOnly: true,
    writesPerformed: 0,
    sourceCount: report.summary.sourceCount,
    normalizedRows: report.summary.normalizedRows,
    technicalDisplayEligibleRows: report.summary.technicalDisplayEligibleRows,
    policyActivableRows: report.summary.policyActivableRows,
    normalizationUnavailableRows: report.summary.normalizationUnavailableRows,
    freshConfirmedRows: report.summary.freshConfirmedRows,
    avitoPublicCountObserved: report.sources.find((row) => row.domain === "avito.ma")?.publicInventoryObserved ?? false,
    mubawabPublicCountObserved: report.sources.find((row) => row.domain === "mubawab.ma")?.publicInventoryObserved ?? false,
    policyChanges: 0,
    scraperRuns: 0,
    sitemapHarvests: 0,
    directFetches: 0,
  };

  await fs.mkdir(outDir, { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(outDir, "report.json"), `${JSON.stringify({ report, metrics, publicEvidence }, null, 2)}\n`),
    fs.writeFile(path.join(outDir, "report.md"), renderReservoirDepthMarkdown(report)),
    fs.writeFile(path.join(outDir, "proof.json"), `${JSON.stringify(proof, null, 2)}\n`),
  ]);

  const csv = [
    ["domain", "public_announced", "normalized", "technical_display", "policy_activable", "normalization_unavailable", "fresh_confirmed", "authorization", "detail_fetch", "reuse", "display", "display_gate", "recommendation"],
    ...report.sources.map((row) => [
      row.domain,
      row.publicAnnouncedInventory,
      row.normalizedRows,
      row.technicalDisplayEligibleRows,
      row.policyActivableRows,
      row.normalizationUnavailableRows,
      row.freshConfirmedRows,
      row.policy.authorizationStatus,
      row.policy.detailFetchPolicy,
      row.policy.contentReusePolicy,
      row.policy.displayPolicy,
      row.policy.displayGate,
      row.auditRecommendation,
    ]),
  ];
  await fs.writeFile(path.join(outDir, "report.csv"), `${csv.map((row) => row.map(csvEscape).join(",")).join("\n")}\n`);

  console.log(JSON.stringify(proof, null, 2));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
