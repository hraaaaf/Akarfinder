import fs from "node:fs/promises";
import path from "node:path";
import {
  classifyDarAgadirRows,
  type DarAgadirCandidate,
  type DarAgadirPolicy,
} from "../data4/daragadir-canonical-link-shadow";

const outDir = process.env.DATA_4_3A_OUT_DIR ?? ".tmp/data-4-3a/results";
const PAGE_SIZE = 1000;
const TIMEOUT_MS = 15000;

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`DATA-4.3A requires ${name}`);
  return value;
}

async function restPage<T>(table: string, params: Record<string, string>): Promise<T[]> {
  const url = new URL(`/rest/v1/${table}`, env("SUPABASE_URL"));
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  const response = await fetch(url, {
    method: "GET",
    headers: { apikey: key, authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`${table} read failed: HTTP ${response.status} ${await response.text()}`);
  return (await response.json()) as T[];
}

async function restAll<T>(table: string, params: Record<string, string>): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = await restPage<T>(table, { ...params, limit: String(PAGE_SIZE), offset: String(offset) });
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

type NormalizedRow = {
  canonical_url: string;
  normalization_status: string;
  freshness_status: string;
  city: string | null;
  property_type: string | null;
  intent: string | null;
};

type DisplayRow = {
  canonical_url: string;
  display_eligibility: string;
  quality_score: number | string | null;
};

type RegistryRow = {
  source_domain: string;
  acquisition_mode: string;
  discovery_policy: string;
  detail_fetch_policy: string;
  content_reuse_policy: string;
  display_policy: string;
  display_gate: string;
  machine_gate: string;
  allowed_discovery_channels: string[] | null;
  max_revalidation_interval_days: number | null;
  review_status: string | null;
};

function numberOrNull(value: number | string | null): number | null {
  if (value === null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function main(): Promise<void> {
  const [normalized, display, registry] = await Promise.all([
    restAll<NormalizedRow>("thin_index_normalized_documents_v2", {
      select: "canonical_url,normalization_status,freshness_status,city,property_type,intent",
      source_domain: "eq.daragadir.com",
      order: "canonical_url.asc",
    }),
    restAll<DisplayRow>("thin_index_display_eligible_v1", {
      select: "canonical_url,display_eligibility,quality_score",
      source_domain: "eq.daragadir.com",
      order: "canonical_url.asc",
    }),
    restAll<RegistryRow>("source_policy_registry", {
      select: "source_domain,acquisition_mode,discovery_policy,detail_fetch_policy,content_reuse_policy,display_policy,display_gate,machine_gate,allowed_discovery_channels,max_revalidation_interval_days,review_status",
      source_domain: "eq.daragadir.com",
      order: "source_domain.asc",
    }),
  ]);

  if (registry.length !== 1) throw new Error(`Expected exactly one Dar Agadir Registry row, got ${registry.length}`);
  const r = registry[0]!;
  const policy: DarAgadirPolicy = {
    sourceDomain: r.source_domain,
    acquisitionMode: r.acquisition_mode,
    discoveryPolicy: r.discovery_policy,
    detailFetchPolicy: r.detail_fetch_policy,
    contentReusePolicy: r.content_reuse_policy,
    displayPolicy: r.display_policy,
    displayGate: r.display_gate,
    machineGate: r.machine_gate,
    allowedDiscoveryChannels: r.allowed_discovery_channels ?? [],
    maxRevalidationIntervalDays: r.max_revalidation_interval_days,
    reviewStatus: r.review_status,
  };

  const displayByUrl = new Map(display.map((row) => [row.canonical_url, row]));
  const candidates: DarAgadirCandidate[] = normalized.map((row) => {
    const d = displayByUrl.get(row.canonical_url);
    return {
      canonicalUrl: row.canonical_url,
      normalizationStatus: row.normalization_status,
      freshnessStatus: row.freshness_status,
      city: row.city,
      propertyType: row.property_type,
      intent: row.intent,
      qualityScore: d ? numberOrNull(d.quality_score) : null,
      displayEligibility: d?.display_eligibility ?? null,
    };
  });

  const results = classifyDarAgadirRows(candidates, policy);
  const counts: Record<string, number> = {};
  for (const result of results) counts[result.classification] = (counts[result.classification] ?? 0) + 1;

  const proof = {
    schemaVersion: "data-4-3a-daragadir-canonical-link-shadow-v1",
    generatedAt: new Date().toISOString(),
    readOnly: true,
    databaseWrites: 0,
    sourceNetworkRequests: 0,
    sourceDetailFetches: 0,
    contentReuseOperations: 0,
    policyChanges: 0,
    productionActivation: false,
    sourceDomain: "daragadir.com",
    normalizedRowsRead: normalized.length,
    displayRowsRead: display.length,
    registryRowsRead: registry.length,
    registryReviewStatus: policy.reviewStatus,
    maxRevalidationIntervalDays: policy.maxRevalidationIntervalDays,
    counts,
    eligibleShadowRows: counts.ELIGIBLE_SHADOW ?? 0,
    revalidationRequiredRows: counts.SEED_ONLY_REVALIDATION_REQUIRED ?? 0,
    duplicateRows: counts.DUPLICATE ?? 0,
    policyBlockedRows: counts.POLICY_BLOCKED ?? 0,
  };

  const csv = [
    "canonical_url,classification,freshness_status,normalization_status,city,property_type,intent,quality_score,display_eligibility,reasons",
    ...results.map((row) => [
      row.canonicalUrl,
      row.classification,
      row.freshnessStatus,
      row.normalizationStatus,
      row.city ?? "",
      row.propertyType ?? "",
      row.intent ?? "",
      row.qualityScore ?? "",
      row.displayEligibility ?? "",
      row.reasons.join("|"),
    ].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")),
  ].join("\n");

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, "proof.json"), `${JSON.stringify(proof, null, 2)}\n`);
  await fs.writeFile(path.join(outDir, "report.json"), `${JSON.stringify({ proof, policy, counts }, null, 2)}\n`);
  await fs.writeFile(path.join(outDir, "classification.csv"), `${csv}\n`);
  console.log(JSON.stringify(proof, null, 2));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
