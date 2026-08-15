import { getSupabaseServerClient } from "../../lib/db/supabase-client";
import { getThirdPartyIngestionGuard } from "./utils/motor-purity-guard";

type Candidate = {
  seed_id: string;
  canonical_url: string;
  source_domain: string;
  seed_provider: string | null;
  freshness_status: string | null;
  title: string | null;
  snippet: string | null;
  normalized_intent: string | null;
};

export type ResidualPriceMatch = {
  amount: number;
  source: "masaken_title" | "mouldar_strong_phrase" | "mubawab_exact_prefix";
};

const SOURCES = ["masaken.ma", "mouldar.com", "mubawab.ma"] as const;
const ALLOWED_PROVIDERS = new Set(["public_sitemap", "commoncrawl_cdx", "serper_search"]);
const ALLOWED_FRESHNESS = new Set(["seed_only", "fresh_confirmed"]);

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
}

export function parseMoneyAmountV4(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const normalized = raw.trim().replace(/([.,])00$/, "");
  const digits = normalized.replace(/[^0-9]/g, "");
  if (!digits) return null;
  const amount = Number(digits);
  return Number.isFinite(amount) ? amount : null;
}

function plausible(amount: number | null, intent: "sale" | "rent" | null): number | null {
  if (amount == null || amount <= 0 || amount > 500_000_000 || intent == null) return null;
  if (intent === "sale" && amount < 10_000) return null;
  if (intent === "rent" && amount < 1_000) return null;
  return amount;
}

function normalizedIntent(value: string | null | undefined): "sale" | "rent" | null {
  if (["buy", "sale", "new"].includes(value ?? "")) return "sale";
  if (["rent", "location"].includes(value ?? "")) return "rent";
  return null;
}

function hasPerM2Context(text: string): boolean {
  return /(?:dh|dhs|mad|dirhams?)\s*(?:\/|par|le)\s*m(?:²|2)\b/i.test(text);
}

function hasShortStayContext(text: string): boolean {
  return /(?:per day|daily|par[-_ ]?jour|par\s+nuit|nuit[eé]e|journalier|journali[eè]re|quotidien|vacances)/i.test(text);
}

function hasOnRequestContext(text: string): boolean {
  return /prix\s+(?:sur\s+demande|à\s+consulter|a\s+consulter)/i.test(text);
}

function inferMasakenIntent(row: Candidate): "sale" | "rent" | null {
  const url = normalizeText(row.canonical_url);
  const title = normalizeText(row.title);
  if (url.includes("/vente-") || title.startsWith("vente ")) return "sale";
  if (url.includes("/location-") || title.startsWith("location ")) return "rent";
  return normalizedIntent(row.normalized_intent);
}

function extractMasaken(row: Candidate): ResidualPriceMatch | null {
  let path = "";
  try {
    path = new URL(row.canonical_url).pathname;
  } catch {
    return null;
  }
  if (!/\/\d+$/.test(path)) return null;

  const title = normalizeText(row.title);
  const snippet = normalizeText(row.snippet);
  const intent = inferMasakenIntent(row);
  if (!intent || hasPerM2Context(snippet) || hasShortStayContext(`${title} ${snippet}`)) return null;

  const match = title.match(/m(?:²|2)\s+([0-9][0-9 .]{2,18})\s*(?:dh|dhs|mad|dirhams?)(?:\s+masaken\.ma)?$/i);
  const amount = plausible(parseMoneyAmountV4(match?.[1]), intent);
  return amount == null ? null : { amount, source: "masaken_title" };
}

function extractMouldar(row: Candidate): ResidualPriceMatch | null {
  let path = "";
  try {
    path = new URL(row.canonical_url).pathname;
  } catch {
    return null;
  }
  if (!/\/[0-9a-f]{8}$/i.test(path)) return null;

  const snippet = normalizeText(row.snippet);
  const intent = normalizedIntent(row.normalized_intent);
  if (!intent || hasPerM2Context(snippet) || hasShortStayContext(snippet) || hasOnRequestContext(snippet)) return null;

  const match = snippet.match(
    /(?:ce bien est proposé au prix de|ce bien est propose au prix de|le loyer est de|loyer est de)\s*([0-9][0-9 .]{2,18})\s*(?:dh|dhs|mad|dirhams?)/i,
  );
  const amount = plausible(parseMoneyAmountV4(match?.[1]), intent);
  return amount == null ? null : { amount, source: "mouldar_strong_phrase" };
}

function extractMubawab(row: Candidate): ResidualPriceMatch | null {
  let path = "";
  try {
    path = new URL(row.canonical_url).pathname;
  } catch {
    return null;
  }
  if (!/^\/(?:fr|en|ar)\/a\/\d+\//i.test(path)) return null;

  const title = normalizeText(row.title);
  const snippet = normalizeText(row.snippet);
  const intent = normalizedIntent(row.normalized_intent);
  if (!intent || title.length < 8 || !snippet.startsWith(title)) return null;
  if (hasPerM2Context(snippet) || hasShortStayContext(snippet) || hasOnRequestContext(snippet)) return null;

  const segment = snippet.slice(0, Math.max(title.length + 120, 160));
  const match = segment.match(
    /(?:^|[^0-9])([0-9]{1,3}(?:[ .,][0-9]{3})+|[0-9]{4,9})(?:[.,]00)?\s*(?:dh|dhs|mad|dirhams?)/i,
  );
  const amount = plausible(parseMoneyAmountV4(match?.[1]), intent);
  return amount == null ? null : { amount, source: "mubawab_exact_prefix" };
}

export function extractResidualPriceV4(row: Candidate): ResidualPriceMatch | null {
  if (!ALLOWED_PROVIDERS.has(row.seed_provider ?? "")) return null;
  if (!ALLOWED_FRESHNESS.has(row.freshness_status ?? "")) return null;
  if (row.source_domain === "masaken.ma") return extractMasaken(row);
  if (row.source_domain === "mouldar.com") return extractMouldar(row);
  if (row.source_domain === "mubawab.ma") return extractMubawab(row);
  return null;
}

async function loadSourceCandidates(source: string): Promise<Candidate[]> {
  const supabase = getSupabaseServerClient();
  const pageSize = 500;
  const rows: Candidate[] = [];

  for (let from = 0; from < 10_000; from += pageSize) {
    const { data, error } = await supabase
      .from("thin_index_search_documents")
      .select(
        "seed_id,canonical_url,source_domain,seed_provider,freshness_status,title,snippet,normalized_intent",
      )
      .eq("document_kind", "LISTING")
      .in("display_eligibility", ["eligible_primary", "eligible_secondary"])
      .eq("source_domain", source)
      .is("normalized_price_mad", null)
      .order("seed_id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const page = (data ?? []) as Candidate[];
    rows.push(...page);
    if (page.length < pageSize) break;
  }

  return rows;
}

async function main() {
  const guard = getThirdPartyIngestionGuard({ scriptName: "price-extraction-v4-strict-residual" });
  if (guard.blocked) throw new Error(guard.message);

  const write = process.env.PRICE_V4_WRITE === "true";
  const supabase = getSupabaseServerClient();
  const bySource: Record<string, { scanned: number; matched: number; updated: number }> = {};
  let scanned = 0;
  let matched = 0;
  let updated = 0;

  for (const source of SOURCES) {
    const rows = await loadSourceCandidates(source);
    const stat = { scanned: rows.length, matched: 0, updated: 0 };
    bySource[source] = stat;
    scanned += rows.length;

    for (const row of rows) {
      const match = extractResidualPriceV4(row);
      if (!match) continue;
      matched += 1;
      stat.matched += 1;

      if (!write) continue;
      const { data, error } = await supabase
        .from("thin_index_search_documents")
        .update({ normalized_price_mad: match.amount })
        .eq("seed_id", row.seed_id)
        .is("normalized_price_mad", null)
        .select("seed_id");
      if (error) throw new Error(error.message);
      if ((data ?? []).length > 0) {
        updated += 1;
        stat.updated += 1;
      }
    }
  }

  console.log(JSON.stringify({ write, scanned, matched, updated, bySource }, null, 2));
}

if (process.argv[1]?.includes("price-extraction-v4-strict-residual")) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
