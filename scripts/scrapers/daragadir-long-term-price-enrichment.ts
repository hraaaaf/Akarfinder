import { getSupabaseServerClient } from "../../lib/db/supabase-client";
import { fetchHtml, isAllowedByRobots } from "./utils/fetch-html";
import { safeDelay } from "./utils/safe-delay";
import { getThirdPartyIngestionGuard } from "./utils/motor-purity-guard";
import { extractStrictDetailPrice, isRecognizedDetailUrl } from "./price-detail-enrichment-v2";

type Candidate = {
  seed_id: string;
  canonical_url: string;
  normalized_intent: string | null;
};

export function isDarAgadirShortStay(url: string): boolean {
  const u = decodeURIComponent(url).toLowerCase();
  return /location-de-vacances|par[-_ ]jour|journalier|quotidien|(?:^|[-_/ ])nuit(?:[-_/ .]|$)/.test(u);
}

function inferLongTermIntent(row: Candidate): "sale" | "rent" | null {
  if (["buy", "sale", "new"].includes(row.normalized_intent ?? "")) return "sale";
  if (["rent", "location"].includes(row.normalized_intent ?? "")) return "rent";
  const u = decodeURIComponent(row.canonical_url).toLowerCase();
  if (/\/vente\/|vendre|a-vendre|à-vendre/.test(u)) return "sale";
  if (/\/location\/|a-louer|à-louer/.test(u) && !isDarAgadirShortStay(u)) return "rent";
  return null;
}

async function main() {
  const guard = getThirdPartyIngestionGuard({ scriptName: "daragadir-long-term-price-enrichment" });
  if (guard.blocked) throw new Error(guard.message);

  const write = process.env.PRICE_DETAIL_ENRICH_WRITE === "true";
  const limit = Math.max(1, Math.min(Number(process.env.PRICE_DETAIL_LIMIT ?? 120), 300));
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("thin_index_search_documents")
    .select("seed_id,canonical_url,normalized_intent")
    .eq("document_kind", "LISTING")
    .eq("source_domain", "daragadir.com")
    .in("display_eligibility", ["eligible_primary", "eligible_secondary"])
    .is("normalized_price_mad", null)
    .order("updated_at", { ascending: false })
    .limit(Math.min(limit * 12, 3000));
  if (error) throw new Error(error.message);

  const candidates = ((data ?? []) as Candidate[])
    .filter((row) => !isDarAgadirShortStay(row.canonical_url))
    .filter((row) => isRecognizedDetailUrl("daragadir.com", row.canonical_url))
    .filter((row) => inferLongTermIntent(row) != null)
    .slice(0, limit);

  let fetched = 0;
  let extracted = 0;
  let updated = 0;
  let robotsSkipped = 0;
  let failed = 0;

  for (const row of candidates) {
    try {
      if (!(await isAllowedByRobots(row.canonical_url))) {
        robotsSkipped += 1;
        continue;
      }
      const intent = inferLongTermIntent(row);
      if (!intent) continue;
      const result = await fetchHtml(row.canonical_url, { timeoutMs: 15_000 });
      fetched += 1;
      const amount = extractStrictDetailPrice(result.html, intent);
      if (amount == null) continue;
      extracted += 1;
      if (write) {
        const { data: changed, error: updateError } = await supabase
          .from("thin_index_search_documents")
          .update({ normalized_price_mad: amount })
          .eq("seed_id", row.seed_id)
          .is("normalized_price_mad", null)
          .select("seed_id");
        if (updateError) throw new Error(updateError.message);
        if ((changed ?? []).length > 0) updated += 1;
      }
    } catch (error) {
      failed += 1;
      console.warn(`[daragadir-long-term-price] ${row.canonical_url}: ${error instanceof Error ? error.message : String(error)}`);
    }
    await safeDelay(800, 1600);
  }

  console.log(JSON.stringify({ write, limit, candidates: candidates.length, fetched, extracted, updated, robotsSkipped, failed }, null, 2));
}

if (process.argv[1]?.endsWith("/daragadir-long-term-price-enrichment.ts")) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
