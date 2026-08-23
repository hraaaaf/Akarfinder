import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const OUTPUT = "artifacts/mass-index/m5-public-freshness-audit.json";

async function countEligibleListings(db: ReturnType<typeof createClient>, freshness: string) {
  const { count, error } = await db
    .from("thin_index_search_documents")
    .select("*", { count: "exact", head: true })
    .eq("document_kind", "LISTING")
    .in("display_eligibility", ["eligible_primary", "eligible_secondary"])
    .eq("freshness_status", freshness);
  if (error) throw error;
  return count ?? 0;
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");

  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [seedOnlyEligibleListings, freshConfirmedEligibleListings] = await Promise.all([
    countEligibleListings(db, "seed_only"),
    countEligibleListings(db, "fresh_confirmed"),
  ]);

  const report = {
    schemaVersion: "MASS_INDEX_M5_PUBLIC_FRESHNESS_AUDIT_V1",
    mode: "read_only_preparation",
    observedAt: new Date().toISOString(),
    summary: {
      seedOnlyEligibleListings,
      freshConfirmedEligibleListings,
      currentEligibleListingsAcrossTargetStates:
        seedOnlyEligibleListings + freshConfirmedEligibleListings,
    },
    target: {
      publicServingFreshnessStatus: "fresh_confirmed",
      seedOnlyReservoirPreserved: true,
      rpcFunctions: [
        "search_public_representations_v2",
        "search_thin_index_v3",
      ],
    },
    invariants: {
      databaseWrites: 0,
      seedRowsDeleted: 0,
      thinIndexRowsDeleted: 0,
      sourceNetworkRequests: 0,
      providerRelabels: 0,
      productionMigrationApplied: false,
      vercelDeployments: 0,
    },
  };

  await mkdir(dirname(resolve(OUTPUT)), { recursive: true });
  await writeFile(resolve(OUTPUT), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
