import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  buildM4NationalWritePlan,
  filterM4Wave1Manifest,
  M4_WAVE1_DOMAINS,
  selectM4RoundRobinCanary,
  summarizeM4Plan,
  type M4ExistingSeedIdentity,
} from "./national-mass-m4-plan";
import {
  buildUniversalCandidatePromotionManifest,
  type UniversalDiscoveryCandidate,
  type UniversalCandidatePromotionRow,
} from "./universal-candidate-promotion";

const OUTPUT = "artifacts/mass-index/m4-national-ingest-plan.json";
const PAGE_SIZE = 1000;
const LOOKUP_CHUNK = 40;

type DiscoveryRow = {
  id: string;
  provider: string;
  source_domain: string;
  source_url: string;
  canonical_url: string | null;
  title: string | null;
  snippet: string | null;
  discovery_query: string | null;
  discovered_at: string;
  last_seen_at: string;
};

async function fetchDomainReservoir(db: ReturnType<typeof createClient>, sourceDomain: string) {
  const rows: DiscoveryRow[] = [];
  let cursor: string | null = null;
  let pages = 0;
  for (;;) {
    const base = db
      .from("discovery_candidates")
      .select("id,provider,source_domain,source_url,canonical_url,title,snippet,discovery_query,discovered_at,last_seen_at")
      .eq("source_domain", sourceDomain)
      .in("provider", ["openserp", "serper_mass_harvest"])
      .order("id", { ascending: true })
      .limit(PAGE_SIZE);
    const query = cursor ? base.gt("id", cursor) : base;
    const { data, error } = await query;
    if (error) throw error;
    const page = (data ?? []) as DiscoveryRow[];
    rows.push(...page);
    pages += 1;
    if (page.length < PAGE_SIZE) break;
    const next = page.at(-1)?.id;
    if (!next || next === cursor) throw new Error(`M4_DISCOVERY_CURSOR_STALLED:${sourceDomain}`);
    cursor = next;
  }
  return { rows, pages };
}

function toCandidates(rows: DiscoveryRow[]): UniversalDiscoveryCandidate[] {
  return rows.map((row) => ({
    sourceDomain: row.source_domain,
    provider: row.provider,
    url: row.canonical_url ?? row.source_url,
    title: row.title,
    snippet: row.snippet,
    discoveryQuery: row.discovery_query,
    firstSeenAt: row.discovered_at,
    lastSeenAt: row.last_seen_at,
  }));
}

async function fetchExistingSeeds(
  db: ReturnType<typeof createClient>,
  canonicalUrls: string[],
): Promise<M4ExistingSeedIdentity[]> {
  const rows: M4ExistingSeedIdentity[] = [];
  for (let index = 0; index < canonicalUrls.length; index += LOOKUP_CHUNK) {
    const chunk = canonicalUrls.slice(index, index + LOOKUP_CHUNK);
    if (chunk.length === 0) continue;
    const { data, error } = await db
      .from("source_offer_seeds")
      .select("canonical_url,source_domain,seed_provider")
      .in("canonical_url", chunk);
    if (error) throw error;
    rows.push(...((data ?? []) as M4ExistingSeedIdentity[]));
  }
  return rows;
}

async function exactCount(db: ReturnType<typeof createClient>, table: string) {
  const { count, error } = await db.from(table).select("*", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("MISSING_SUPABASE_ENV");
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const manifest: UniversalCandidatePromotionRow[] = [];
  const rawRowsByDomain: Record<string, number> = {};
  const pagesByDomain: Record<string, number> = {};

  for (const sourceDomain of M4_WAVE1_DOMAINS) {
    const reservoir = await fetchDomainReservoir(db, sourceDomain);
    rawRowsByDomain[sourceDomain] = reservoir.rows.length;
    pagesByDomain[sourceDomain] = reservoir.pages;
    manifest.push(...buildUniversalCandidatePromotionManifest(toCandidates(reservoir.rows)));
  }

  const filtered = filterM4Wave1Manifest(manifest);
  const validUrls = filtered.map((row) => row.canonicalUrl!).sort();
  const existingSeeds = await fetchExistingSeeds(db, validUrls);
  const plan = buildM4NationalWritePlan(manifest, existingSeeds);
  const summary = summarizeM4Plan(manifest, plan);
  const inserts = plan.flatMap((row) =>
    row.action === "INSERT_NATIVE" ? [{ canonicalUrl: row.canonicalUrl, seed: row.seed }] : [],
  );
  const canary = selectM4RoundRobinCanary(plan, 10).map((row) => ({
    canonicalUrl: row.canonicalUrl,
    sourceDomain: row.seed.source_domain,
    seedProvider: row.seed.seed_provider,
    seed: row.seed,
  }));

  const before = {
    sourceOfferSeeds: await exactCount(db, "source_offer_seeds"),
    thinIndexDocuments: await exactCount(db, "thin_index_search_documents"),
  };

  const result = {
    schemaVersion: "MASS_INDEX_M4_NATIONAL_PLAN_V2",
    mode: "read_only",
    generatedAt: new Date().toISOString(),
    cohort: {
      domains: M4_WAVE1_DOMAINS,
      providers: ["openserp", "serper_mass_harvest"],
      rawRowsByDomain,
      pagesByDomain,
      pagination: "keyset_id_per_domain",
      pageSize: PAGE_SIZE,
    },
    before,
    summary,
    inserts,
    canary,
    invariants: {
      databaseWrites: 0,
      sourceNetworkRequests: 0,
      directFetches: 0,
      existingSeedsMutated: 0,
      providerRelabels: 0,
      publicActivations: 0,
      canaryMaxRows: 10,
      onlyM3PositiveSources: true,
      persistedMetadataIsNull: inserts.every((row) => row.seed.metadata === null),
      persistedExternalIndexScope: "CANONICAL_URL_SOURCE_DOMAIN_PROVENANCE_ONLY",
    },
  };

  if (summary.sourceSpecificValid !== summary.insertNative + summary.preserveExisting) {
    throw new Error("M4_WRITE_PLAN_ACCOUNTING_DRIFT");
  }
  if ((inserts.length > 0 && canary.length === 0) || canary.length > 10) {
    throw new Error("M4_CANARY_SIZE_INVALID");
  }
  if (summary.byDomain.some((row) => row.canonicalCandidates === 0)) throw new Error("M4_EMPTY_SOURCE_RESERVOIR");
  if (inserts.some((row) => !["openserp", "serper_mass_harvest"].includes(row.seed.seed_provider))) {
    throw new Error("M4_PROVIDER_DRIFT");
  }
  if (!result.invariants.persistedMetadataIsNull) throw new Error("M4_METADATA_SCOPE_DRIFT");

  const outputPath = resolve(process.env.MASS_INDEX_M4_OUTPUT || OUTPUT);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({
    ...result,
    inserts: { count: inserts.length },
    canary: canary.map(({ canonicalUrl, sourceDomain, seedProvider }) => ({ canonicalUrl, sourceDomain, seedProvider })),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
