import fs from "node:fs/promises";
import path from "node:path";
import { rankReservoirs, type ReservoirMetrics } from "../data4/reservoir-prioritization";

const outDir = process.env.DATA_4_2_OUT_DIR ?? ".tmp/data-4-2/results";
const TIMEOUT_MS = 15_000;

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`DATA-4.2 requires ${name}`);
  return value;
}

async function rest<T>(table: string, params: Record<string, string>): Promise<T[]> {
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

type NormalizedRow = {
  source_domain: string;
  normalization_status: string;
  freshness_status: string;
  city: string | null;
  property_type: string | null;
  intent: string | null;
  price_mad: number | string | null;
  surface_m2: number | string | null;
};

type DisplayRow = { source_domain: string; quality_score: number | string | null };
type RegistryRow = {
  source_domain: string;
  authorization_status: string;
  acquisition_mode: string;
  display_policy: string;
  display_gate: string;
  allowed_discovery_channels: string[] | null;
  structure_score: number | null;
  execution_score: number | null;
};

function num(value: number | string | null): number { return value === null ? 0 : Number(value); }

async function main(): Promise<void> {
  const [norm, display, registry] = await Promise.all([
    rest<NormalizedRow>("thin_index_normalized_documents_v2", {
      select: "source_domain,normalization_status,freshness_status,city,property_type,intent,price_mad,surface_m2",
      limit: "50000",
    }),
    rest<DisplayRow>("thin_index_display_eligible_v1", {
      select: "source_domain,quality_score",
      limit: "50000",
    }),
    rest<RegistryRow>("source_policy_registry", {
      select: "source_domain,authorization_status,acquisition_mode,display_policy,display_gate,allowed_discovery_channels,structure_score,execution_score",
      limit: "1000",
    }),
  ]);

  const registryByDomain = new Map(registry.map((row) => [row.source_domain, row]));
  const displayByDomain = new Map<string, { count: number; qualityTotal: number; qualityCount: number }>();
  for (const row of display) {
    const current = displayByDomain.get(row.source_domain) ?? { count: 0, qualityTotal: 0, qualityCount: 0 };
    current.count += 1;
    if (row.quality_score !== null && Number.isFinite(num(row.quality_score))) {
      current.qualityTotal += num(row.quality_score);
      current.qualityCount += 1;
    }
    displayByDomain.set(row.source_domain, current);
  }

  const metricMap = new Map<string, ReservoirMetrics>();
  for (const row of norm) {
    if (["avito.ma", "mubawab.ma"].includes(row.source_domain)) continue;
    const reg = registryByDomain.get(row.source_domain);
    if (!reg) continue;
    const current = metricMap.get(row.source_domain) ?? {
      sourceDomain: row.source_domain,
      normalizedRows: 0,
      normalizedOk: 0,
      unavailableRows: 0,
      freshConfirmed: 0,
      withCity: 0,
      withPrice: 0,
      withSurface: 0,
      coreStructured: 0,
      decisionStructured: 0,
      technicalDisplayRows: 0,
      avgQualityScore: 0,
      authorizationStatus: reg.authorization_status,
      acquisitionMode: reg.acquisition_mode,
      displayPolicy: reg.display_policy,
      displayGate: reg.display_gate,
      allowedDiscoveryChannels: reg.allowed_discovery_channels ?? [],
      structureScore: reg.structure_score,
      executionScore: reg.execution_score,
    };
    current.normalizedRows += 1;
    if (row.normalization_status === "normalized") current.normalizedOk += 1;
    if (row.normalization_status === "unavailable") current.unavailableRows += 1;
    if (row.freshness_status === "fresh_confirmed") current.freshConfirmed += 1;
    if (row.city) current.withCity += 1;
    if (row.price_mad !== null) current.withPrice += 1;
    if (row.surface_m2 !== null) current.withSurface += 1;
    if (row.city && row.property_type && row.intent) current.coreStructured += 1;
    if (row.city && row.property_type && row.intent && (row.price_mad !== null || row.surface_m2 !== null)) current.decisionStructured += 1;
    metricMap.set(row.source_domain, current);
  }

  for (const metric of metricMap.values()) {
    const d = displayByDomain.get(metric.sourceDomain);
    if (d) {
      metric.technicalDisplayRows = d.count;
      metric.avgQualityScore = d.qualityCount ? d.qualityTotal / d.qualityCount : 0;
    }
  }

  const candidates = [...metricMap.values()].filter((row) => row.normalizedRows >= 50);
  const rankings = rankReservoirs(candidates);
  const proof = {
    schemaVersion: "data-4-2-reservoir-prioritization-v1",
    generatedAt: new Date().toISOString(),
    readOnly: true,
    databaseWrites: 0,
    sourceNetworkRequests: 0,
    policyChanges: 0,
    candidates: candidates.length,
    admissibleGrowthWinner: rankings.admissibleGrowth[0]?.sourceDomain ?? null,
    partnershipUpsideWinner: rankings.partnershipUpside[0]?.sourceDomain ?? null,
    publicActivableRowsCreated: 0,
  };

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, "report.json"), `${JSON.stringify({ proof, rankings }, null, 2)}\n`);
  await fs.writeFile(path.join(outDir, "proof.json"), `${JSON.stringify(proof, null, 2)}\n`);
  const all = [...rankings.admissibleGrowth, ...rankings.partnershipUpside, ...rankings.hold];
  const csv = [
    "source_domain,lane,normalized_rows,core_structured,decision_structured,fresh_confirmed,technical_display,avg_quality,admissible_score,partnership_score,display_policy,display_gate",
    ...all.map((r) => [r.sourceDomain,r.lane,r.normalizedRows,r.coreStructured,r.decisionStructured,r.freshConfirmed,r.technicalDisplayRows,r.avgQualityScore.toFixed(2),r.admissibleScore,r.partnershipScore,r.displayPolicy,r.displayGate].join(",")),
  ].join("\n");
  await fs.writeFile(path.join(outDir, "ranking.csv"), `${csv}\n`);
  console.log(JSON.stringify(proof, null, 2));
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
