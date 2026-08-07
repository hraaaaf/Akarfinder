import fs from "node:fs/promises";
import path from "node:path";

const outDir = process.env.DATA_4_3I_OUT_DIR ?? ".tmp/data-4-3i/results";
const PAGE_SIZE = 1000;
const TIMEOUT_MS = 15000;
const RUN_ID = "data-4-3g-daragadir-v1";
const CHANNEL = "public_sitemap_presence";

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`DATA-4.3I requires ${name}`);
  return value;
}

async function restPage<T>(table: string, params: Record<string, string>): Promise<T[]> {
  const url = new URL(`/rest/v1/${table}`, env("SUPABASE_URL"));
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  const response = await fetch(url, {
    headers: { apikey: key, authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`${table} read failed: ${response.status} ${await response.text()}`);
  return await response.json() as T[];
}

async function restAll<T>(table: string, params: Record<string, string>): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = await restPage<T>(table, { ...params, limit: String(PAGE_SIZE), offset: String(offset) });
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

type SeedRow = {
  canonical_url: string;
  freshness_status: string;
  fresh_last_seen_at: string | null;
  fresh_channels: string[] | null;
  metadata: Record<string, unknown> | null;
};

type RegistryRow = {
  source_domain: string;
  discovery_policy: string | null;
  display_policy: string | null;
  machine_gate: string | null;
  display_gate: string | null;
  max_revalidation_interval_days: number | null;
  review_status: string | null;
};

function marker(row: SeedRow): Record<string, unknown> | null {
  const freshness = row.metadata?.freshness_evidence;
  if (!freshness || typeof freshness !== "object") return null;
  const persistent = (freshness as Record<string, unknown>).persistent_batch;
  if (!persistent || typeof persistent !== "object") return null;
  const record = persistent as Record<string, unknown>;
  return record.run_id === RUN_ID ? record : null;
}

function activeEvidence(record: Record<string, unknown>, now: Date): boolean {
  const observedAt = typeof record.observed_at === "string" ? new Date(record.observed_at) : null;
  const ttlDays = typeof record.ttl_days === "number" ? record.ttl_days : null;
  if (!observedAt || Number.isNaN(observedAt.getTime()) || ttlDays === null) return false;
  return now.getTime() <= observedAt.getTime() + ttlDays * 86_400_000;
}

async function main(): Promise<void> {
  const now = new Date();
  const [rows, registryRows] = await Promise.all([
    restAll<SeedRow>("source_offer_seeds", {
      select: "canonical_url,freshness_status,fresh_last_seen_at,fresh_channels,metadata",
      source_domain: "eq.daragadir.com",
      order: "canonical_url.asc",
    }),
    restAll<RegistryRow>("source_policy_registry", {
      select: "source_domain,discovery_policy,display_policy,machine_gate,display_gate,max_revalidation_interval_days,review_status",
      source_domain: "eq.daragadir.com",
    }),
  ]);
  if (registryRows.length !== 1) throw new Error(`Expected one Registry row, got ${registryRows.length}`);

  const marked = rows.map((row) => ({ row, marker: marker(row) })).filter((item): item is { row: SeedRow; marker: Record<string, unknown> } => item.marker !== null);
  const active = marked.filter((item) => activeEvidence(item.marker, now));
  const collided = marked.filter(({ row }) => row.freshness_status === "seed_only" && !(row.fresh_channels ?? []).includes(CHANNEL));
  const correctlyMaterialized = marked.filter(({ row }) => row.freshness_status === "fresh_confirmed" && (row.fresh_channels ?? []).includes(CHANNEL));
  const registry = registryRows[0]!;

  const proof = {
    schemaVersion: "data-4-3i-multichannel-freshness-ownership-v1",
    generatedAt: now.toISOString(),
    mode: "READ_ONLY_COLLISION_AUDIT",
    sourceDomain: "daragadir.com",
    runId: RUN_ID,
    channel: CHANNEL,
    markerRows: marked.length,
    activeEvidenceRows: active.length,
    collidedRows: collided.length,
    correctlyMaterializedRows: correctlyMaterialized.length,
    recoverableFromTypedEvidenceRows: active.length,
    registry,
    databaseWrites: 0,
    freshnessWrites: 0,
    policyChanges: 0,
    productionActivation: false,
  };

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, "proof.json"), `${JSON.stringify(proof, null, 2)}\n`);
  console.log(JSON.stringify(proof, null, 2));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
