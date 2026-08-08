import fs from "node:fs/promises";
import path from "node:path";
import { rankReservoirs, type ReservoirCandidate } from "../data4/second-reservoir-qualification";

const OUT_DIR = process.env.DATA_4_4A_OUT_DIR ?? ".tmp/data-4-4a/results";
const CANDIDATES = [
  "promoimmomarrakech.com",
  "limmobiliersansfrontieres.com",
  "atlasimmobilier.com",
  "aykana.ma",
] as const;

type RegistryRow = {
  source_domain: string;
  acquisition_mode: string;
  discovery_policy: string;
  display_policy: string;
  display_gate: string;
  machine_gate: string;
  review_status: string | null;
};

type NormalizedRow = {
  source_domain: string;
  normalization_status: string;
  freshness_status: string;
  city: string | null;
  property_type: string | null;
  intent: string | null;
};

type DisplayRow = { source_domain: string };

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`DATA-4.4A requires ${name}`);
  return value;
}

function inFilter(values: readonly string[]): string {
  return `in.(${values.map((value) => `"${value}"`).join(",")})`;
}

async function restAll<T>(table: string, params: Record<string, string>): Promise<T[]> {
  const rows: T[] = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const url = new URL(`/rest/v1/${table}`, env("SUPABASE_URL"));
    for (const [key, value] of Object.entries({ ...params, limit: String(pageSize), offset: String(offset) })) {
      url.searchParams.set(key, value);
    }
    const key = env("SUPABASE_SERVICE_ROLE_KEY");
    const response = await fetch(url, {
      headers: { apikey: key, authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`${table} read failed: ${response.status} ${await response.text()}`);
    const page = await response.json() as T[];
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

function nonEmpty(value: string | null): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

async function main(): Promise<void> {
  const [registryRows, normalizedRows, displayRows] = await Promise.all([
    restAll<RegistryRow>("source_policy_registry", {
      select: "source_domain,acquisition_mode,discovery_policy,display_policy,display_gate,machine_gate,review_status",
      source_domain: inFilter(CANDIDATES),
    }),
    restAll<NormalizedRow>("thin_index_normalized_documents_v2", {
      select: "source_domain,normalization_status,freshness_status,city,property_type,intent",
      source_domain: inFilter(CANDIDATES),
    }),
    restAll<DisplayRow>("thin_index_display_eligible_v1", {
      select: "source_domain",
      source_domain: inFilter(CANDIDATES),
    }),
  ]);

  const registryByDomain = new Map(registryRows.map((row) => [row.source_domain, row]));
  const displayCountByDomain = new Map<string, number>();
  for (const row of displayRows) displayCountByDomain.set(row.source_domain, (displayCountByDomain.get(row.source_domain) ?? 0) + 1);

  const candidates: ReservoirCandidate[] = CANDIDATES.map((sourceDomain) => {
    const rows = normalizedRows.filter((row) => row.source_domain === sourceDomain);
    const registry = registryByDomain.get(sourceDomain);
    if (!registry) throw new Error(`Missing Registry row for ${sourceDomain}`);
    return {
      sourceDomain,
      totalNormalized: rows.length,
      normalizedOk: rows.filter((row) => row.normalization_status === "normalized").length,
      technicalDisplay: displayCountByDomain.get(sourceDomain) ?? 0,
      freshConfirmed: rows.filter((row) => row.freshness_status === "fresh_confirmed").length,
      seedOnly: rows.filter((row) => row.freshness_status === "seed_only").length,
      withCity: rows.filter((row) => nonEmpty(row.city)).length,
      withType: rows.filter((row) => nonEmpty(row.property_type)).length,
      withIntent: rows.filter((row) => nonEmpty(row.intent)).length,
      registryAcquisitionMode: registry.acquisition_mode,
      registryDiscoveryPolicy: registry.discovery_policy,
      registryDisplayPolicy: registry.display_policy,
      registryDisplayGate: registry.display_gate,
      registryMachineGate: registry.machine_gate,
      reviewStatus: registry.review_status,
    };
  });

  const ranking = rankReservoirs(candidates);
  const preferred = ranking[0];
  if (!preferred || preferred.sourceDomain !== "promoimmomarrakech.com") {
    throw new Error(`Unexpected DATA-4.4A preferred candidate: ${preferred?.sourceDomain ?? "none"}`);
  }
  if (preferred.decision !== "PREFERRED_PENDING_REVALIDATION") {
    throw new Error(`Preferred candidate is not pending revalidation: ${preferred.decision}`);
  }

  const proof = {
    schemaVersion: "data-4-4a-second-reservoir-qualification-v1",
    generatedAt: new Date().toISOString(),
    mode: "READ_ONLY_QUALIFICATION",
    preferredCandidate: preferred.sourceDomain,
    preferredDecision: preferred.decision,
    nextLot: "DATA-4.4B_SOURCE_REVALIDATION_CANARY",
    databaseWrites: 0,
    registryWrites: 0,
    freshnessWrites: 0,
    displayPolicyChanges: 0,
    ranking,
  };

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(path.join(OUT_DIR, "proof.json"), `${JSON.stringify(proof, null, 2)}\n`);
  console.log(JSON.stringify(proof, null, 2));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
