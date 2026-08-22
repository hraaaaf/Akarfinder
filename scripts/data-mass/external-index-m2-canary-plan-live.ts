import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { buildUniversalCandidatePromotionManifest, type UniversalDiscoveryCandidate } from "./universal-candidate-promotion";
import { buildExternalIndexSeedWritePlan, summarizeExternalIndexSeedWritePlan, type ExistingSourceOfferSeedIdentity } from "./external-index-seed-write-plan";

const OUTPUT = "artifacts/mass-index/m2-bounded-canary-plan.json";
const PER_PROVIDER_LIMIT = 500;
const CANARY_MAX_ROWS = 10;
const NATIVE_PROVIDERS = ["openserp", "serper_mass_harvest"] as const;

type DiscoveryRow = {
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

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("MISSING_SUPABASE_ENV");
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const candidates: UniversalDiscoveryCandidate[] = [];
  const fetchedByProvider: Record<string, number> = {};
  for (const provider of NATIVE_PROVIDERS) {
    const { data, error } = await db
      .from("discovery_candidates")
      .select("provider,source_domain,source_url,canonical_url,title,snippet,discovery_query,discovered_at,last_seen_at")
      .eq("discovery_status", "accepted")
      .eq("provider", provider)
      .order("id", { ascending: true })
      .limit(PER_PROVIDER_LIMIT);
    if (error) throw error;
    const rows = (data ?? []) as DiscoveryRow[];
    fetchedByProvider[provider] = rows.length;
    for (const row of rows) {
      candidates.push({
        sourceDomain: row.source_domain,
        provider: row.provider,
        url: row.canonical_url ?? row.source_url,
        title: row.title,
        snippet: row.snippet,
        discoveryQuery: row.discovery_query,
        firstSeenAt: row.discovered_at,
        lastSeenAt: row.last_seen_at,
      });
    }
  }

  const manifest = buildUniversalCandidatePromotionManifest(candidates);
  const accepted = manifest.filter((row) => row.promotionStatus === "EXTERNAL_INDEX_CANDIDATE");
  if (accepted.length === 0) throw new Error("MASS_INDEX_M2_BOUNDED_NO_ACCEPTED_CANDIDATES");

  const urls = accepted.map((row) => row.canonicalUrl).filter((value): value is string => Boolean(value));
  const existing: ExistingSourceOfferSeedIdentity[] = [];
  for (let i = 0; i < urls.length; i += 200) {
    const { data, error } = await db
      .from("source_offer_seeds")
      .select("canonical_url,source_domain,seed_provider")
      .in("canonical_url", urls.slice(i, i + 200));
    if (error) throw error;
    existing.push(...((data ?? []) as ExistingSourceOfferSeedIdentity[]));
  }

  const plan = buildExternalIndexSeedWritePlan(accepted, existing);
  const summary = summarizeExternalIndexSeedWritePlan(plan);
  const inserts = plan.filter((row) => row.action === "INSERT_NATIVE");
  const canary = inserts.slice(0, CANARY_MAX_ROWS).map((row) => {
    if (row.action !== "INSERT_NATIVE") throw new Error("MASS_INDEX_M2_CANARY_ACTION_INVARIANT");
    return { canonicalUrl: row.canonicalUrl, sourceDomain: row.seed.source_domain, seedProvider: row.seed.seed_provider, seed: row.seed };
  });

  if (canary.length !== CANARY_MAX_ROWS) throw new Error(`MASS_INDEX_M2_BOUNDED_CANARY_INCOMPLETE:${canary.length}`);
  const canaryByProvider = Object.fromEntries(NATIVE_PROVIDERS.map((provider) => [provider, canary.filter((row) => row.seedProvider === provider).length]));

  const outputPath = resolve(process.env.MASS_INDEX_M2_BOUNDED_PLAN_OUTPUT || OUTPUT);
  const result = {
    schemaVersion: "MASS_INDEX_M2_BOUNDED_CANARY_PLAN_V1",
    mode: "read_only",
    cohort: { discoveryStatus: "accepted", providers: NATIVE_PROVIDERS, perProviderLimit: PER_PROVIDER_LIMIT, fetchedByProvider, classifier: "M1_UNIVERSAL_PROMOTION_V1" },
    summary,
    canary,
    canaryByProvider,
    invariants: { databaseWrites: 0, sourceNetworkRequests: 0, fullReservoirScan: false, existingSeedsMutated: 0, canaryRows: canary.length, canaryMaxRows: CANARY_MAX_ROWS, providerRelabels: 0 },
  };
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ ...result, canary: canary.map(({ canonicalUrl, sourceDomain, seedProvider }) => ({ canonicalUrl, sourceDomain, seedProvider })) }, null, 2));
}

main().catch((error) => { console.error(error); process.exit(1); });
