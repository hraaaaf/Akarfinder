#!/usr/bin/env tsx
// Verifie que Supabase est correctement configure et que les donnees sont accessibles.
// Usage: npm run check:supabase

import { createClient } from "@supabase/supabase-js";
import { join } from "node:path";
import { loadEnvFile } from "@/lib/openserp-ingestion/env";

loadEnvFile(join(process.cwd(), ".env.local"));
loadEnvFile(join(process.cwd(), ".env.mission"));

type Check = { label: string; ok: boolean; detail?: string };

const P8A_SELECT =
  "built_surface_m2, plot_surface_m2, condition, property_age_range, orientation, floor_type, floors_count, garden_m2, terrace_m2, garage_spaces, has_pool, has_concierge, has_moroccan_living_room, has_european_living_room, has_equipped_kitchen, premium_features";

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log(`\n[check] SUPABASE_URL              : ${url ? "OK configured" : "missing"}`);
  console.log(`[check] SUPABASE_SERVICE_ROLE_KEY : ${key ? `OK ***${key.slice(-6)}` : "missing"}`);

  if (!url || !key) {
    console.error(
      "\n[check] Variables manquantes.\n" +
      "  Remplir .env.local avec SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY.\n"
    );
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const results: Check[] = [];

  async function check(
    label: string,
    fn: () => Promise<{ ok: boolean; detail?: string }>
  ) {
    try {
      const result = await fn();
      results.push({ label, ...result });
    } catch (error) {
      results.push({ label, ok: false, detail: String(error) });
    }
  }

  await check("Connexion Supabase", async () => {
    const { error } = await supabase.from("property_listings").select("id").limit(1);
    return error ? { ok: false, detail: error.message } : { ok: true };
  });

  await check("Table property_listings accessible", async () => {
    const { count, error } = await supabase
      .from("property_listings")
      .select("*", { count: "exact", head: true });
    if (error) return { ok: false, detail: error.message };
    return { ok: true, detail: `${count ?? 0} rows` };
  });

  await check("Colonnes P6 presentes", async () => {
    const { data, error } = await supabase
      .from("property_listings")
      .select("reliability_score, reliability_badge, duplicate_score, duplicate_group_id, reliability_reasons")
      .limit(1);
    if (error) return { ok: false, detail: error.message };
    return { ok: true, detail: `${data?.length ?? 0} row(s) read` };
  });

  await check("Colonnes P8A presentes", async () => {
    const { data, error } = await supabase
      .from("property_listings")
      .select(P8A_SELECT)
      .limit(1);
    if (error) return { ok: false, detail: error.message };
    return { ok: true, detail: `${data?.length ?? 0} row(s) read` };
  });

  await check("Table listing_sources accessible", async () => {
    const { count, error } = await supabase
      .from("listing_sources")
      .select("*", { count: "exact", head: true });
    if (error) return { ok: false, detail: error.message };
    return { ok: true, detail: `${count ?? 0} rows` };
  });

  await check("Donnees scorees disponibles", async () => {
    const { count, error } = await supabase
      .from("property_listings")
      .select("*", { count: "exact", head: true })
      .not("reliability_score", "is", null);
    if (error) return { ok: false, detail: error.message };
    if ((count ?? 0) === 0) {
      return { ok: false, detail: "0 listing with score - rerun npm run sync:supabase" };
    }
    return { ok: true, detail: `${count} listings with score` };
  });

  await check("Relation property_listings -> listing_sources", async () => {
    const { data, error } = await supabase
      .from("property_listings")
      .select("id, listing_sources(source_name)")
      .limit(3);
    if (error) return { ok: false, detail: error.message };
    const withSources = (data ?? []).filter(
      (row: { listing_sources?: unknown[] }) =>
        Array.isArray(row.listing_sources) && row.listing_sources.length > 0
    ).length;
    return withSources > 0
      ? { ok: true, detail: `${withSources}/3 listings have sources` }
      : { ok: false, detail: "No linked source found - sync:supabase may be incomplete" };
  });

  await check("Annonces avec champs P8A remplis", async () => {
    const { count, error } = await supabase
      .from("property_listings")
      .select("*", { count: "exact", head: true })
      .or([
        "built_surface_m2.not.is.null",
        "plot_surface_m2.not.is.null",
        "condition.not.is.null",
        "property_age_range.not.is.null",
        "orientation.not.is.null",
        "floor_type.not.is.null",
        "floors_count.not.is.null",
        "garden_m2.not.is.null",
        "terrace_m2.not.is.null",
        "garage_spaces.not.is.null",
        "has_pool.eq.true",
        "has_concierge.eq.true",
        "has_moroccan_living_room.eq.true",
        "has_european_living_room.eq.true",
        "has_equipped_kitchen.eq.true",
        "premium_features.not.is.null",
      ].join(","));
    if (error) return { ok: false, detail: error.message };
    return { ok: true, detail: `${count ?? 0} listings with at least one P8A field` };
  });

  console.log("\n------------------------------------------");
  for (const result of results) {
    const icon = result.ok ? "OK" : "KO";
    const detail = result.detail ? ` (${result.detail})` : "";
    console.log(`  ${icon}  ${result.label}${detail}`);
  }
  console.log("------------------------------------------");

  const failed = results.filter((result) => !result.ok).length;
  if (failed === 0) {
    console.log(`\n  Supabase pret - ${results.length}/${results.length} verifications OK`);
    console.log("  Prochaine etape : npm run sync:supabase\n");
    process.exit(0);
  }

  console.error(`\n  ${failed} verification(s) echouee(s).\n`);
  process.exit(1);
}

main().catch((error) => {
  console.error("[check] Fatal:", error);
  process.exit(1);
});
