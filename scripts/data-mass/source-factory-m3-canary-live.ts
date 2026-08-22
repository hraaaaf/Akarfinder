import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  buildUniversalCandidatePromotionManifest,
  type UniversalDiscoveryCandidate,
} from "./universal-candidate-promotion";
import {
  assertM3SourceCanaryReport,
  buildM3PriorityAdapterConfigs,
  buildM3SourceCanaryReport,
  validateM3AdapterConfigs,
} from "./source-factory-m3-adapter";

const OUTPUT = "artifacts/mass-index/m3-source-factory-canary-report.json";

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
  const configs = buildM3PriorityAdapterConfigs();
  validateM3AdapterConfigs(configs);

  const reports = [];
  const fetchedByDomain: Record<string, number> = {};

  for (const config of configs) {
    // M3 measures the existing discovery reservoir independently from the legacy
    // discovery_status gate. M1 is the authoritative listing/Morocco classifier.
    const { data, error } = await db
      .from("discovery_candidates")
      .select("provider,source_domain,source_url,canonical_url,title,snippet,discovery_query,discovered_at,last_seen_at")
      .eq("source_domain", config.sourceDomain)
      .in("provider", [...config.providers])
      .order("id", { ascending: true })
      .limit(config.candidateReadBudget);
    if (error) throw error;

    const rows = (data ?? []) as DiscoveryRow[];
    fetchedByDomain[config.sourceDomain] = rows.length;
    const candidates: UniversalDiscoveryCandidate[] = rows.map((row) => ({
      sourceDomain: row.source_domain,
      provider: row.provider,
      url: row.canonical_url ?? row.source_url,
      title: row.title,
      snippet: row.snippet,
      discoveryQuery: row.discovery_query,
      firstSeenAt: row.discovered_at,
      lastSeenAt: row.last_seen_at,
    }));

    const promotionRows = buildUniversalCandidatePromotionManifest(candidates);
    const report = buildM3SourceCanaryReport(config, promotionRows);
    assertM3SourceCanaryReport(config, report);
    reports.push(report);
  }

  const domainsWithMeasuredYield = reports.filter((report) => report.candidateCanonicalUrls > 0).length;
  const domainsWithValidListings = reports.filter((report) => report.validListings > 0).length;
  const totalCandidateCanonicalUrls = reports.reduce((sum, report) => sum + report.candidateCanonicalUrls, 0);
  const totalValidListings = reports.reduce((sum, report) => sum + report.validListings, 0);

  const result = {
    schemaVersion: "MASS_INDEX_M3_SOURCE_FACTORY_CERTIFICATION_V1",
    mode: "read_only",
    generatedAt: new Date().toISOString(),
    cohort: {
      domains: configs.map((config) => config.sourceDomain),
      providers: ["openserp", "serper_mass_harvest"],
      candidateReadBudgetPerDomain: 40,
      validListingCanaryBudgetPerDomain: 10,
      fetchedByDomain,
    },
    summary: {
      domains: reports.length,
      domainsWithMeasuredYield,
      domainsWithValidListings,
      totalCandidateCanonicalUrls,
      totalValidListings,
      aggregateCandidateToValidListingYield:
        totalCandidateCanonicalUrls === 0 ? null : totalValidListings / totalCandidateCanonicalUrls,
    },
    reports,
    invariants: {
      databaseWrites: 0,
      sourceNetworkRequests: 0,
      directFetches: 0,
      fullReservoirScan: false,
      publicActivations: 0,
      providerRelabels: 0,
      policyLayerMutations: 0,
      adapterErrors: reports.reduce((sum, report) => sum + report.adapterErrors, 0),
      openCircuitBreakers: reports.filter((report) => report.circuitBreaker === "OPEN").length,
    },
  };

  if (result.summary.domains !== 10) throw new Error(`M3_DOMAIN_COUNT_DRIFT:${result.summary.domains}`);
  if (result.summary.domainsWithMeasuredYield !== 10) {
    throw new Error(`M3_UNMEASURED_PRIORITY_DOMAINS:${10 - result.summary.domainsWithMeasuredYield}`);
  }
  if (result.invariants.databaseWrites !== 0 || result.invariants.sourceNetworkRequests !== 0 || result.invariants.directFetches !== 0) {
    throw new Error("M3_SIDE_EFFECT_INVARIANT");
  }
  if (result.invariants.openCircuitBreakers !== 0 || result.invariants.adapterErrors !== 0) {
    throw new Error("M3_ADAPTER_HEALTH_INVARIANT");
  }

  const outputPath = resolve(process.env.MASS_INDEX_M3_OUTPUT || OUTPUT);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
