import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { isPolicyAdmissible, type MinimalListingRegistryRow } from "../data-mass/minimal-listing-index-policy";

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("MISSING_SUPABASE_ENV");

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase
    .from("source_policy_registry")
    .select("source_domain,authorization_status,acquisition_mode,machine_gate,ingestion_gate,display_policy,policy_expires_at")
    .order("source_domain");
  if (error) throw error;

  const rows = (data ?? []) as MinimalListingRegistryRow[];
  const now = new Date();
  const admissible = rows.filter((row) => isPolicyAdmissible(row, now));
  const blocked = admissible.length === 0;

  const proof = {
    schemaVersion: "MASS_3C_CANARY_READINESS_SHADOW_V1",
    status: blocked ? "PASS" : "REVIEW_REQUIRED",
    mode: "shadow_read_only",
    generatedAt: now.toISOString(),
    headSha: process.env.GITHUB_HEAD_SHA ?? process.env.GITHUB_SHA ?? null,
    registryRows: rows.length,
    policyAdmissibleRegistryRows: admissible.length,
    policyAdmissibleDomains: admissible.map((row) => row.source_domain),
    canaryStatus: blocked ? "BLOCKED_NO_POLICY_ADMISSIBLE_SOURCE" : "REVIEW_REQUIRED_POLICY_STATE_CHANGED",
    canaryCandidates: 0,
    productionWriteAuthorizedByThisLot: false,
    databaseWrites: 0,
    registryWrites: 0,
    searchActivations: 0,
    sourceNetworkRequests: 0,
    detailPageFetches: 0,
    permissionsInferred: 0,
  };

  const out = path.join(process.cwd(), ".tmp/data-mass-3c/results");
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, "proof.json"), JSON.stringify(proof, null, 2));
  console.log(JSON.stringify(proof, null, 2));

  if (!blocked) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
