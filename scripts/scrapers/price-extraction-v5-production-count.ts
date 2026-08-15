import { getSupabaseServerClient } from "../../lib/db/supabase-client";

async function main() {
  const supabase = getSupabaseServerClient();

  const base = supabase
    .from("thin_index_search_documents")
    .select("seed_id", { count: "exact", head: true })
    .eq("document_kind", "LISTING")
    .in("display_eligibility", ["eligible_primary", "eligible_secondary"]);

  const reliableQuery = supabase
    .from("thin_index_search_documents")
    .select("seed_id", { count: "exact", head: true })
    .eq("document_kind", "LISTING")
    .in("display_eligibility", ["eligible_primary", "eligible_secondary"])
    .not("normalized_price_mad", "is", null);

  const [{ count: total, error: totalError }, { count: reliable, error: reliableError }] = await Promise.all([base, reliableQuery]);
  if (totalError) throw new Error(totalError.message);
  if (reliableError) throw new Error(reliableError.message);

  const totalCount = total ?? 0;
  const reliableCount = reliable ?? 0;
  const coveragePct = totalCount > 0 ? Number(((reliableCount / totalCount) * 100).toFixed(2)) : 0;

  console.log(JSON.stringify({ total: totalCount, reliable: reliableCount, coverage_pct: coveragePct }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
