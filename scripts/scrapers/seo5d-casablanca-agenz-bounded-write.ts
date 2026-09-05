import { pathToFileURL } from "node:url";
import { getSupabaseServerClient } from "../../lib/db/supabase-client";
import { extractStrictDetailPrice } from "./price-detail-enrichment-v2";
import {
  SEO5C_AGENZ_SOURCE,
  SEO5C_CITY,
  SEO5C_INTENT,
  SEO5C_MAX_DETAIL_LIMIT,
  SEO5C_SOURCE_SCAN_CAP,
  selectSeo5cCasablancaAgenzCandidates,
} from "./seo5c-casablanca-agenz-price-audit";
import { fetchHtml, isAllowedByRobots } from "./utils/fetch-html";
import { getThirdPartyIngestionGuard } from "./utils/motor-purity-guard";
import { safeDelay } from "./utils/safe-delay";

export const SEO5D_MAX_WRITES = 34;
export const SEO5D_WRITE_CONFIRMATION = "WRITE_SEO5D_AGENZ_CASABLANCA_PRICES";

type Candidate = {
  seed_id: string;
  canonical_url: string;
  source_domain: string;
  normalized_city: string | null;
  normalized_intent: string | null;
  normalized_price_mad: number | null;
  normalized_surface_m2: number | null;
  updated_at: string | null;
};

export function hasSeo5dWriteConfirmation(raw: string | undefined): boolean {
  return raw === SEO5D_WRITE_CONFIRMATION;
}

export function boundSeo5dWriteLimit(raw: number): number {
  if (!Number.isFinite(raw)) throw new Error("SEO5D_AGENZ_PRICE_MAX_WRITES must be finite");
  return Math.max(1, Math.min(Math.trunc(raw), SEO5D_MAX_WRITES));
}

async function writeOne(row: Candidate, amount: number) {
  const db = getSupabaseServerClient();
  const { data, error } = await db
    .from("thin_index_search_documents")
    .update({ normalized_price_mad: amount })
    .eq("seed_id", row.seed_id)
    .eq("source_domain", SEO5C_AGENZ_SOURCE)
    .eq("canonical_url", row.canonical_url)
    .eq("normalized_city", SEO5C_CITY)
    .eq("normalized_intent", SEO5C_INTENT)
    .is("normalized_price_mad", null)
    .select("seed_id");
  if (error) throw new Error(`write failed for ${row.seed_id}: ${error.message}`);
  return data?.length ?? 0;
}

async function main() {
  const guard = getThirdPartyIngestionGuard({ scriptName: "seo5d-casablanca-agenz-bounded-write" });
  if (guard.blocked) throw new Error(guard.message);

  const writeRequested = process.env.SEO5D_AGENZ_PRICE_WRITE === "true";
  if (writeRequested && !hasSeo5dWriteConfirmation(process.env.SEO5D_AGENZ_PRICE_WRITE_CONFIRMATION)) {
    throw new Error("SEO5D Agenz write blocked: explicit confirmation missing");
  }

  const maxWrites = boundSeo5dWriteLimit(Number(process.env.SEO5D_AGENZ_PRICE_MAX_WRITES ?? SEO5D_MAX_WRITES));
  const db = getSupabaseServerClient();
  const { data, error } = await db
    .from("thin_index_search_documents")
    .select("seed_id,canonical_url,source_domain,normalized_city,normalized_intent,normalized_price_mad,normalized_surface_m2,updated_at")
    .eq("normalized_city", SEO5C_CITY)
    .eq("normalized_intent", SEO5C_INTENT)
    .eq("vertical_classification", "real_estate_likely")
    .eq("document_kind", "LISTING")
    .in("display_eligibility", ["eligible_primary", "eligible_secondary"])
    .eq("source_domain", SEO5C_AGENZ_SOURCE)
    .is("normalized_price_mad", null)
    .not("normalized_surface_m2", "is", null)
    .order("updated_at", { ascending: false })
    .limit(SEO5C_SOURCE_SCAN_CAP);

  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Candidate[];
  if (rows.length >= SEO5C_SOURCE_SCAN_CAP) {
    throw new Error(`SEO5D Agenz source scan reached cap ${SEO5C_SOURCE_SCAN_CAP}; refusing incomplete write cohort`);
  }

  const candidates = selectSeo5cCasablancaAgenzCandidates(rows, SEO5C_MAX_DETAIL_LIMIT);
  let fetched = 0;
  let robotsSkipped = 0;
  let failed = 0;
  let reliable = 0;
  let written = 0;
  const evidence: Array<{ seed_id: string; canonical_url: string; recoverable_price_mad: number; write_count: number }> = [];

  for (const row of candidates) {
    if ((writeRequested ? written : reliable) >= maxWrites) break;
    try {
      if (!(await isAllowedByRobots(row.canonical_url))) {
        robotsSkipped += 1;
        continue;
      }
      const response = await fetchHtml(row.canonical_url, { timeoutMs: 15_000 });
      fetched += 1;
      const amount = extractStrictDetailPrice(response.html, "sale");
      if (amount == null) continue;

      reliable += 1;
      let writeCount = 0;
      if (writeRequested) {
        writeCount = await writeOne(row, amount);
        written += writeCount;
      }
      evidence.push({ seed_id: row.seed_id, canonical_url: row.canonical_url, recoverable_price_mad: amount, write_count: writeCount });
    } catch (errorValue) {
      failed += 1;
      console.warn(`[seo5d-casablanca-agenz-bounded-write] ${row.seed_id}: ${errorValue instanceof Error ? errorValue.message : String(errorValue)}`);
    }
    await safeDelay(500, 1200);
  }

  console.log(JSON.stringify({
    mode: writeRequested ? "bounded_write" : "dry_run",
    source: SEO5C_AGENZ_SOURCE,
    city: SEO5C_CITY,
    intent: SEO5C_INTENT,
    writeRequested,
    maxWrites,
    queriedRows: rows.length,
    detailCandidates: candidates.length,
    fetched,
    robotsSkipped,
    failed,
    reliable,
    productionWriteCount: written,
    evidence,
  }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
