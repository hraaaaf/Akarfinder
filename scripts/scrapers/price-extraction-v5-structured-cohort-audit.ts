import { pathToFileURL } from "node:url";
import { getSupabaseServerClient } from "../../lib/db/supabase-client";
import { extractDetail, loadHtml } from "./utils/extract";
import { fetchHtml, isAllowedByRobots } from "./utils/fetch-html";
import { getThirdPartyIngestionGuard } from "./utils/motor-purity-guard";
import { safeDelay } from "./utils/safe-delay";

export type CohortRow = {
  seed_id: string;
  canonical_url: string;
  source_domain: string;
  normalized_intent: string | null;
};

function normalizedHostPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return `${u.hostname.toLowerCase().replace(/^www\./, "")}${decodeURIComponent(u.pathname).replace(/\/+$/, "") || "/"}`.toLowerCase();
  } catch {
    return null;
  }
}

function mubawabKey(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    const m = decodeURIComponent(u.pathname).match(/^\/(?:fr|en|ar)\/a\/(\d+)(?:\/|$)/i);
    return m ? `${host}/a/${m[1]}` : null;
  } catch {
    return null;
  }
}

function sameIdentity(domain: string, targetUrl: string, html: string, resolvedUrl?: string | null): boolean {
  const $ = loadHtml(html);
  const candidates = [resolvedUrl, $("link[rel='canonical']").attr("href"), $("meta[property='og:url']").attr("content")];
  if (domain === "mubawab.ma") {
    const target = mubawabKey(targetUrl);
    return !!target && candidates.some((url) => mubawabKey(url) === target);
  }
  const target = normalizedHostPath(targetUrl);
  return !!target && candidates.some((url) => normalizedHostPath(url) === target);
}

function intent(row: CohortRow): "sale" | "rent" | null {
  if (["buy", "sale", "new"].includes(row.normalized_intent ?? "")) return "sale";
  if (["rent", "location"].includes(row.normalized_intent ?? "")) return "rent";
  const u = decodeURIComponent(row.canonical_url).toLowerCase();
  if (/vente|achat|a-vendre|à-vendre/.test(u)) return "sale";
  if (/location|a-louer|à-louer/.test(u)) return "rent";
  return null;
}

function amount(raw: string | null, tx: "sale" | "rent" | null): number | null {
  if (!raw || !tx) return null;
  if (!/(?:\bmad\b|\bdhs?\b|dirhams?)/i.test(raw)) return null;
  if (/(?:\/|par|le)\s*m(?:²|2)\b|par[-_ ]?jour|par\s+nuit|nuit[eé]e|journalier|quotidien|prix\s+sur\s+demande/i.test(raw)) return null;
  const digits = raw.replace(/([.,])00\b/, "").replace(/[^0-9]/g, "");
  if (!digits) return null;
  const n = Number(digits);
  if (!Number.isFinite(n) || n <= 0 || n > 500_000_000) return null;
  if (tx === "sale" && n < 10_000) return null;
  if (tx === "rent" && n < 1_000) return null;
  return n;
}

export function auditStructuredCohortHtml(html: string, row: CohortRow, resolvedUrl?: string | null) {
  const identity = sameIdentity(row.source_domain, row.canonical_url, html, resolvedUrl);
  const detail = extractDetail(html);
  const parsed = identity && detail._confidence.price === "high" ? amount(detail.price_raw, intent(row)) : null;
  return { identity, amount: parsed, price_raw: detail.price_raw, confidence: detail._confidence.price };
}

async function loadRows(source: string, limit: number): Promise<CohortRow[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("thin_index_search_documents")
    .select("seed_id,canonical_url,source_domain,normalized_intent")
    .eq("document_kind", "LISTING")
    .in("display_eligibility", ["eligible_primary", "eligible_secondary"])
    .eq("source_domain", source)
    .is("normalized_price_mad", null)
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as CohortRow[];
}

async function main() {
  const guard = getThirdPartyIngestionGuard({ scriptName: "price-extraction-v5-structured-cohort-audit" });
  if (guard.blocked) throw new Error(guard.message);
  if (process.env.PRICE_V5_WRITE === "true") throw new Error("structured cohort audit is read-only");

  const limit = Math.max(1, Math.min(Number(process.env.PRICE_V5_COHORT_LIMIT ?? 120), 250));
  const sources = ["mubawab.ma", "masaken.ma"];
  const bySource: Record<string, { candidates: number; fetched: number; identity: number; reliable: number; failed: number }> = {};

  for (const source of sources) {
    const rows = await loadRows(source, limit);
    const stat = { candidates: rows.length, fetched: 0, identity: 0, reliable: 0, failed: 0 };
    bySource[source] = stat;
    for (const row of rows) {
      try {
        if (!(await isAllowedByRobots(row.canonical_url))) continue;
        const res = await fetchHtml(row.canonical_url, { timeoutMs: 15_000 });
        stat.fetched += 1;
        const audit = auditStructuredCohortHtml(res.html, row, res.url);
        if (audit.identity) stat.identity += 1;
        if (audit.amount != null) stat.reliable += 1;
      } catch (error) {
        stat.failed += 1;
        console.warn(`[price-v5-cohort] ${source}: ${error instanceof Error ? error.message : String(error)}`);
      }
      await safeDelay(300, 700);
    }
  }

  console.log(JSON.stringify({ write: false, limit, bySource }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
