import { createClient } from "@supabase/supabase-js";
import { isPolicyAdmissible, type MinimalListingRegistryRow } from "./minimal-listing-index-policy";

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("MISSING_SUPABASE_ENV");
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const now = new Date();
  const { count: listingCount, error: listingError } = await db.from("property_listings").select("id", { count: "exact", head: true });
  if (listingError) throw listingError;
  const { count: sourceCount, error: sourceError } = await db.from("listing_sources").select("id", { count: "exact", head: true }).eq("is_active", true);
  if (sourceError) throw sourceError;
  const { data, error } = await db.from("source_policy_registry").select("source_domain,authorization_status,acquisition_mode,machine_gate,ingestion_gate,display_policy,policy_expires_at");
  if (error) throw error;
  const registry = (data ?? []) as MinimalListingRegistryRow[];
  const admissible = registry.filter((row) => isPolicyAdmissible(row, now));
  console.log(JSON.stringify({
    schemaVersion: "MASS_4_RECLASSIFICATION_SHADOW_V1",
    status: "PASS",
    mode: "shadow_read_only",
    propertyListingRows: listingCount ?? 0,
    activeListingSourceRows: sourceCount ?? 0,
    registryRows: registry.length,
    policyAdmissibleRegistryRows: admissible.length,
    qualityCanGrantPermission: false,
    qualityCanRevokeStructuralEligibility: false,
    databaseWrites: 0,
    registryWrites: 0,
    searchActivations: 0,
    sourceNetworkRequests: 0,
    detailPageFetches: 0,
    permissionsInferred: 0
  }, null, 2));
}

main().catch((error) => { console.error(error); process.exit(1); });
