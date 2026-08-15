import { getSupabaseServerClient } from "../../lib/db/supabase-client";

function describeError(error: unknown): string {
  if (!error) return "unknown Supabase error";
  if (error instanceof Error) return error.message || error.name;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

async function main() {
  const supabase = getSupabaseServerClient();

  const { count: total, error: totalError } = await supabase
    .from("thin_index_search_documents")
    .select("seed_id", { count: "exact", head: true })
    .eq("document_kind", "LISTING")
    .in("display_eligibility", ["eligible_primary", "eligible_secondary"]);
  if (totalError) throw new Error(`total count failed: ${describeError(totalError)}`);

  const { count: reliable, error: reliableError } = await supabase
    .from("thin_index_search_documents")
    .select("seed_id", { count: "exact", head: true })
    .eq("document_kind", "LISTING")
    .in("display_eligibility", ["eligible_primary", "eligible_secondary"])
    .not("normalized_price_mad", "is", null);
  if (reliableError) throw new Error(`reliable count failed: ${describeError(reliableError)}`);

  const totalCount = total ?? 0;
  const reliableCount = reliable ?? 0;
  const coveragePct = totalCount > 0 ? Number(((reliableCount / totalCount) * 100).toFixed(2)) : 0;

  console.log(JSON.stringify({ total: totalCount, reliable: reliableCount, coverage_pct: coveragePct }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : describeError(error));
  process.exitCode = 1;
});
