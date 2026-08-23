import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const OUTPUT = "artifacts/mass-index/m6-search-seo-baseline.json";

async function exactCount(query: any): Promise<number> {
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("MISSING_SUPABASE_ENV");

  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const totalRealEstateListings = await exactCount(
    db.from("thin_index_search_documents")
      .select("*", { count: "exact", head: true })
      .eq("vertical_classification", "real_estate_likely")
      .eq("document_kind", "LISTING"),
  );
  const freshConfirmedListings = await exactCount(
    db.from("thin_index_search_documents")
      .select("*", { count: "exact", head: true })
      .eq("vertical_classification", "real_estate_likely")
      .eq("document_kind", "LISTING")
      .eq("freshness_status", "fresh_confirmed"),
  );
  const seedOnlyListings = await exactCount(
    db.from("thin_index_search_documents")
      .select("*", { count: "exact", head: true })
      .eq("vertical_classification", "real_estate_likely")
      .eq("document_kind", "LISTING")
      .eq("freshness_status", "seed_only"),
  );
  const publicFreshEligible = await exactCount(
    db.from("thin_index_search_documents")
      .select("*", { count: "exact", head: true })
      .eq("document_kind", "LISTING")
      .in("display_eligibility", ["eligible_primary", "eligible_secondary"])
      .eq("freshness_status", "fresh_confirmed"),
  );
  const publicSeedOnlyEligible = await exactCount(
    db.from("thin_index_search_documents")
      .select("*", { count: "exact", head: true })
      .eq("document_kind", "LISTING")
      .in("display_eligibility", ["eligible_primary", "eligible_secondary"])
      .eq("freshness_status", "seed_only"),
  );

  const rpc = await db.rpc("search_public_representations_v2", { p_limit: 1 });
  if (rpc.error) throw new Error(`M6_PUBLIC_RPC_FAILED:${rpc.error.message}`);
  const first = (rpc.data ?? [])[0] as { total_count?: number; freshness_status?: string } | undefined;
  const publicRpcTotal = Number(first?.total_count ?? 0);
  const publicRpcFirstStatus = first?.freshness_status ?? null;

  const fallback = await db.rpc("search_thin_index_v3", { p_limit: 100 });
  if (fallback.error) throw new Error(`M6_FALLBACK_RPC_FAILED:${fallback.error.message}`);
  const fallbackStatuses = [...new Set((fallback.data ?? [])
    .map((row: { freshness_status?: string }) => row.freshness_status)
    .filter((status): status is string => Boolean(status)))].sort();

  const result = {
    schemaVersion: "MASS_INDEX_M6_SEARCH_SEO_BASELINE_V1",
    mode: "read_only_baseline",
    generatedAt: new Date().toISOString(),
    currentMainContract: {
      canonicalSearchRpc: "search_public_representations_v2",
      fallbackSearchRpc: "search_thin_index_v3",
      searchPageNoindexExpected: true,
      sitemapSearchExcludedExpected: true,
      citySeoUsesLegacySearchExpected: true,
      districtSeoUsesLegacySearchExpected: true,
      publicRoutingCanaryGovernedExpected: true,
    },
    liveDatabase: {
      totalRealEstateListings,
      freshConfirmedListings,
      seedOnlyListings,
      publicFreshEligible,
      publicSeedOnlyEligible,
      publicRpcTotal,
      publicRpcFirstStatus,
      fallbackStatuses,
    },
    invariants: {
      databaseWrites: 0,
      searchActivationChanges: 0,
      seoIndexabilityChanges: 0,
      sourceNetworkRequests: 0,
      providerRelabels: 0,
      vercelDeployments: 0,
      uniquePropertyMetricClaimed: false,
    },
  };

  if (publicRpcFirstStatus && publicRpcFirstStatus !== "fresh_confirmed") {
    throw new Error("M6_PUBLIC_RPC_NONFRESH_LEAK");
  }
  if (fallbackStatuses.some((status) => status !== "fresh_confirmed")) {
    throw new Error("M6_FALLBACK_RPC_NONFRESH_LEAK");
  }
  if (publicFreshEligible > freshConfirmedListings) throw new Error("M6_FRESH_COUNT_INVARIANT");

  const outputPath = resolve(process.env.MASS_INDEX_M6_AUDIT_OUTPUT || OUTPUT);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
