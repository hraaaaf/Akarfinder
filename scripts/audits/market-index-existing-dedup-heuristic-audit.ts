import { createClient } from "@supabase/supabase-js";
import { join } from "node:path";
import { loadEnvFile } from "../../lib/openserp-ingestion/env";
loadEnvFile(join(process.cwd(), ".env.local"));
loadEnvFile(join(process.cwd(), ".env.mission"));

async function main() {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: listings, error } = await supabase
    .from("property_listings")
    .select("id, duplicate_group_id, duplicate_score, canonical_fingerprint, city, property_type, transaction_type, price_mad, surface_m2");
  if (error) throw error;

  const groups = new Map<string, typeof listings>();
  for (const l of listings ?? []) {
    if (l.duplicate_group_id == null) continue;
    const arr = groups.get(l.duplicate_group_id) ?? [];
    arr.push(l);
    groups.set(l.duplicate_group_id, arr);
  }
  const multi = [...groups.entries()].filter(([, arr]) => arr.length > 1);
  console.log("multi-member duplicate groups:", multi.length);
  for (const [gid, arr] of multi.slice(0, 5)) {
    console.log(`\ngroup ${gid} (${arr.length} members):`);
    for (const l of arr) {
      console.log(`  id=${l.id} fp=${l.canonical_fingerprint} score=${l.duplicate_score} ${l.city}/${l.property_type}/${l.transaction_type} price=${l.price_mad} surface=${l.surface_m2}`);
    }
  }

  // Same-URL check for multi-source property_listing_ids
  const { data: sources } = await supabase.from("listing_sources").select("property_listing_id, listing_url, source_name, first_seen_at");
  const bySource = new Map<number, typeof sources>();
  for (const s of sources ?? []) {
    const arr = bySource.get(s.property_listing_id) ?? [];
    arr.push(s);
    bySource.set(s.property_listing_id, arr);
  }
  console.log("\n=== multi-source listing_sources detail ===");
  for (const [pid, arr] of bySource) {
    if (arr.length > 1) {
      console.log(`property_listing_id=${pid}:`, arr.map((a) => `${a.source_name}:${a.listing_url}`));
    }
  }
}
main();
