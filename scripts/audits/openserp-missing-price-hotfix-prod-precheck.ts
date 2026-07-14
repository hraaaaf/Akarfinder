import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { loadEnvFile } from "../../lib/openserp-ingestion/env";

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function main(): Promise<void> {
  const root = resolve(process.cwd());
  loadEnvFile(join(root, ".env.local"));
  loadEnvFile(join(root, ".env.mission"));
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials.");
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const [propertyCount, sourceCount, openSerpPropertyCount] = await Promise.all([
    supabase.from("property_listings").select("*", { count: "exact", head: true }),
    supabase.from("listing_sources").select("*", { count: "exact", head: true }),
    supabase.from("property_listings").select("*", { count: "exact", head: true }).contains("field_confidence", { acquisition_provider: "openserp" }),
  ]);
  for (const response of [propertyCount, sourceCount, openSerpPropertyCount]) if (response.error) throw response.error;

  const openSerpProperties = await supabase
    .from("property_listings")
    .select("id")
    .contains("field_confidence", { acquisition_provider: "openserp" });
  if (openSerpProperties.error) throw openSerpProperties.error;
  const openSerpPropertyIds = (openSerpProperties.data ?? []).map((row) => row.id as number);

  let openSerpSources: Array<{ id: number; property_listing_id: number; listing_url: string }> = [];
  const chunkSize = 200;
  for (let i = 0; i < openSerpPropertyIds.length; i += chunkSize) {
    const idsChunk = openSerpPropertyIds.slice(i, i + chunkSize);
    const response = await supabase
      .from("listing_sources")
      .select("id,property_listing_id,listing_url")
      .in("property_listing_id", idsChunk);
    if (response.error) throw response.error;
    openSerpSources = openSerpSources.concat((response.data ?? []) as Array<{ id: number; property_listing_id: number; listing_url: string }>);
  }

  const allSourcesResponse = await supabase.from("listing_sources").select("id,property_listing_id,listing_url");
  if (allSourcesResponse.error) throw allSourcesResponse.error;
  const allSources = (allSourcesResponse.data ?? []) as Array<{ id: number; property_listing_id: number; listing_url: string }>;
  const allPropertyIdsResponse = await supabase.from("property_listings").select("id");
  if (allPropertyIdsResponse.error) throw allPropertyIdsResponse.error;
  const allPropertyIds = new Set((allPropertyIdsResponse.data ?? []).map((row) => row.id as number));

  const orphanSources = allSources.filter((row) => !allPropertyIds.has(row.property_listing_id)).length;
  const urlCounts = new Map<string, number>();
  for (const row of allSources) urlCounts.set(row.listing_url, (urlCounts.get(row.listing_url) ?? 0) + 1);
  const duplicateCanonicalUrls = [...urlCounts.values()].filter((n) => n > 1).length;

  function isSafeExternalUrl(value: string): boolean {
    try {
      const parsed = new URL(value);
      return (parsed.protocol === "https:" || parsed.protocol === "http:") && Boolean(parsed.hostname) && !parsed.username && !parsed.password;
    } catch {
      return false;
    }
  }
  const unsafeCollisions = allSources.filter((row) => !isSafeExternalUrl(row.listing_url)).length;

  const result = {
    precheck_id: "openserp-missing-price-hotfix-prod-precheck-2026-07-14",
    checked_at_utc: new Date().toISOString(),
    deployment_before_hotfix: {
      deployment_id: "dpl_DWw8kA4LDEv2R8tHSAXqzFGFPEPF",
      alias: "https://akarfinder.vercel.app",
      status: "Ready",
      commit_reference_source: "docs/SESSION.md provenance (project is CLI-deployed, not GitHub-linked; Vercel API exposes no git SHA for this deployment)",
      commit_reference_best_effort: "d9a08bf (fix(search): harden persisted OpenSERP listing display) — 3eaa7d4 is the docs-only follow-up commit that recorded this deployment id",
    },
    flag_before: {
      PERSISTED_OPENSERP_LISTINGS_ENABLED: "present in Vercel Production env (value not read/printed; existence confirmed via `vercel env ls production`)",
    },
    db_counts_read_only: {
      property_listings: propertyCount.count ?? 0,
      listing_sources: sourceCount.count ?? 0,
      openserp_property_listings: openSerpPropertyCount.count ?? 0,
      openserp_listing_sources: openSerpSources.length,
    },
    db_integrity_read_only: {
      orphan_sources_global: orphanSources,
      duplicate_canonical_urls_global: duplicateCanonicalUrls,
      unsafe_collisions_global: unsafeCollisions,
    },
    reference_counts_from_mission_brief: {
      property_listings: 316,
      listing_sources: 321,
      openserp_listings: 177,
      openserp_sources: 177,
    },
  };
  await writeJson(join(root, "data", "audits", "openserp-missing-price-hotfix-prod-precheck.json"), result);
  console.log(JSON.stringify(result, null, 2));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
