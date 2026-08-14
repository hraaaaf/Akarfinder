import { getSupabaseServerClient } from "../../lib/db/supabase-client";
import { extractDetail, loadHtml } from "./utils/extract";
import { fetchHtml, isAllowedByRobots } from "./utils/fetch-html";
import { getThirdPartyIngestionGuard } from "./utils/motor-purity-guard";
import { safeDelay } from "./utils/safe-delay";
import { normalizePrice } from "./normalizers/normalize-price";

type Candidate = {
  seed_id: string;
  canonical_url: string;
  source_domain: string;
  normalized_intent: string | null;
};

const DEFAULT_SOURCES = [
  "daragadir.com",
  "promoimmomarrakech.com",
  "avito.ma",
  "agenz.ma",
  "mubawab.ma",
  "mouldar.com",
  "1immo.ma",
  "masaken.ma",
];

function inferIntent(row: Candidate): "sale" | "rent" | null {
  if (["buy", "sale", "new"].includes(row.normalized_intent ?? "")) return "sale";
  if (["rent", "location"].includes(row.normalized_intent ?? "")) return "rent";
  const u = decodeURIComponent(row.canonical_url).toLowerCase();
  if (/vente|vendre|achat|à_vendre|a_vendre|\/achat\//.test(u)) return "sale";
  if (/location|louer|à_louer|a_louer|\/rent\//.test(u)) return "rent";
  return null;
}

export function isUnsupportedPriceCadence(domain: string, url: string): boolean {
  if (domain !== "daragadir.com") return false;
  const u = decodeURIComponent(url).toLowerCase();
  return /location-de-vacances|par[-_ ]jour|journalier|quotidien|nuit/.test(u);
}

export function isRecognizedDetailUrl(domain: string, url: string): boolean {
  try {
    const path = new URL(url).pathname;
    if (domain === "avito.ma") return /_\d+\.htm$/i.test(path);
    if (domain === "promoimmomarrakech.com") return /^\/produit\/[^/]+\/[^/]+\.html$/i.test(path);
    if (domain === "daragadir.com") return /\.html$/i.test(path) && path.includes("/annonces/");
    if (domain === "agenz.ma") return /\/\d+$/.test(path);
    if (domain === "mubawab.ma") return /\/(?:fr|en|ar)\/a\/\d+\//.test(path);
    if (domain === "mouldar.com") return /\/[0-9a-f]{8}$/i.test(path);
    if (domain === "1immo.ma") return /-\d+$/.test(path);
    if (domain === "masaken.ma") return /\/\d+$/.test(path);
    return false;
  } catch {
    return false;
  }
}

function parseAmount(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw
    .replace(/\u00a0/g, " ")
    .trim()
    .replace(/([.,])00(?=\s*(?:dh|dhs|mad|dirhams?)?\b)/i, "");
  const n = normalizePrice(cleaned);
  return n != null && Number.isFinite(n) ? n : null;
}

function plausible(amount: number | null, intent: "sale" | "rent" | null): number | null {
  if (amount == null || amount <= 0 || amount > 500_000_000 || intent == null) return null;
  if (intent === "sale" && amount < 10_000) return null;
  if (intent === "rent" && amount < 1_000) return null;
  return amount;
}

function hasPerM2Context(raw: string): boolean {
  return /(?:dh|dhs|mad|dirhams?)\s*(?:\/|par|le)\s*m(?:²|2)\b/i.test(raw);
}

function explicitHeadingPrice(html: string): string | null {
  try {
    const $ = loadHtml(html);
    const values = [
      $("h1").first().text(),
      $('meta[property="og:title"]').attr("content") ?? "",
      $("title").text(),
    ];
    for (const value of values) {
      const text = value.replace(/\s+/g, " ").trim();
      if (!text || /prix\s+(?:sur\s+demande|à\s+consulter|a\s+consulter)/i.test(text)) continue;
      const m = text.match(/([0-9][0-9\s.,]{2,18})\s*(dh|dhs|mad|dirhams?)\b/i);
      if (m && !hasPerM2Context(text)) return `${m[1]} ${m[2]}`;
    }
  } catch {
    return null;
  }
  return null;
}

export function extractStrictDetailPrice(
  html: string,
  intent: "sale" | "rent" | null,
): number | null {
  const detail = extractDetail(html);
  if (detail.price_raw && detail._confidence.price === "high" && !hasPerM2Context(detail.price_raw)) {
    const n = plausible(parseAmount(detail.price_raw), intent);
    if (n != null) return n;
  }

  const heading = explicitHeadingPrice(html);
  const headingAmount = plausible(parseAmount(heading), intent);
  if (headingAmount != null) return headingAmount;

  return null;
}

async function main() {
  const guard = getThirdPartyIngestionGuard({ scriptName: "price-detail-enrichment-v2" });
  if (guard.blocked) throw new Error(guard.message);

  const write = process.env.PRICE_DETAIL_ENRICH_WRITE === "true";
  const limit = Math.max(1, Math.min(Number(process.env.PRICE_DETAIL_LIMIT ?? 120), 500));
  const sources = (process.env.PRICE_DETAIL_SOURCES ?? DEFAULT_SOURCES.join(","))
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("thin_index_search_documents")
    .select("seed_id,canonical_url,source_domain,normalized_intent")
    .eq("document_kind", "LISTING")
    .in("display_eligibility", ["eligible_primary", "eligible_secondary"])
    .is("normalized_price_mad", null)
    .in("source_domain", sources)
    .order("updated_at", { ascending: false })
    .limit(limit * 3);
  if (error) throw new Error(error.message);

  const candidates = ((data ?? []) as Candidate[])
    .filter((row) => isRecognizedDetailUrl(row.source_domain, row.canonical_url))
    .filter((row) => !isUnsupportedPriceCadence(row.source_domain, row.canonical_url))
    .slice(0, limit);

  let fetched = 0;
  let robotsSkipped = 0;
  let extracted = 0;
  let updated = 0;
  let failed = 0;
  const bySource: Record<string, { fetched: number; extracted: number; updated: number; failed: number }> = {};

  for (const row of candidates) {
    const stat = bySource[row.source_domain] ?? { fetched: 0, extracted: 0, updated: 0, failed: 0 };
    bySource[row.source_domain] = stat;
    try {
      if (!(await isAllowedByRobots(row.canonical_url))) {
        robotsSkipped += 1;
        continue;
      }
      const intent = inferIntent(row);
      if (!intent) continue;
      const res = await fetchHtml(row.canonical_url, { timeoutMs: 15_000 });
      fetched += 1;
      stat.fetched += 1;
      const amount = extractStrictDetailPrice(res.html, intent);
      if (amount == null) continue;
      extracted += 1;
      stat.extracted += 1;

      if (write) {
        const { data: changed, error: updateError } = await supabase
          .from("thin_index_search_documents")
          .update({ normalized_price_mad: amount })
          .eq("seed_id", row.seed_id)
          .is("normalized_price_mad", null)
          .select("seed_id");
        if (updateError) throw new Error(updateError.message);
        if ((changed ?? []).length > 0) {
          updated += 1;
          stat.updated += 1;
        }
      }
    } catch (e) {
      failed += 1;
      stat.failed += 1;
      console.warn(`[price-detail-v2] ${row.source_domain} ${row.canonical_url}: ${e instanceof Error ? e.message : String(e)}`);
    }
    await safeDelay(500, 1200);
  }

  console.log(JSON.stringify({ write, limit, candidates: candidates.length, fetched, robotsSkipped, extracted, updated, failed, bySource }, null, 2));
}

if (process.argv[1]?.includes("price-detail-enrichment-v2")) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
