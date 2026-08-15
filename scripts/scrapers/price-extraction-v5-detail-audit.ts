import { pathToFileURL } from "node:url";
import { getSupabaseServerClient } from "../../lib/db/supabase-client";
import { extractDetail, getJsonLd, loadHtml } from "./utils/extract";
import { fetchHtml, isAllowedByRobots } from "./utils/fetch-html";
import { getThirdPartyIngestionGuard } from "./utils/motor-purity-guard";
import { safeDelay } from "./utils/safe-delay";

export type PriceV5Candidate = {
  seed_id: string;
  canonical_url: string;
  source_domain: string;
  normalized_intent: string | null;
};

export type PriceV5Signal = {
  amount: number;
  signal: "jsonld_canonical_offer" | "meta_canonical_price" | "mouldar_primary_phrase" | "masaken_h1_price";
};

export type PriceV5Audit = {
  reliable: PriceV5Signal | null;
  generic_high_amount: number | null;
  canonical_identity: boolean;
};

const SOURCES = ["mubawab.ma", "masaken.ma", "mouldar.com", "agenz.ma"] as const;
const SOURCE_SET = new Set<string>(SOURCES);

function identityUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    const path = decodeURIComponent(u.pathname).replace(/\/+$/, "") || "/";
    return `${host}${path}`.toLowerCase();
  } catch {
    return null;
  }
}

function clean(raw: string | null | undefined): string {
  return (raw ?? "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

export function parseMoneyAmountV5(raw: unknown): number | null {
  if (typeof raw !== "string" && typeof raw !== "number") return null;
  const text = String(raw).trim().replace(/([.,])00$/, "");
  const digits = text.replace(/[^0-9]/g, "");
  if (!digits) return null;
  const amount = Number(digits);
  return Number.isFinite(amount) ? amount : null;
}

function inferIntent(row: PriceV5Candidate): "sale" | "rent" | null {
  if (["buy", "sale", "new"].includes(row.normalized_intent ?? "")) return "sale";
  if (["rent", "location"].includes(row.normalized_intent ?? "")) return "rent";
  const url = decodeURIComponent(row.canonical_url).toLowerCase();
  if (/vente|vendre|achat|a-vendre|à-vendre|\/achat\//.test(url)) return "sale";
  if (/location|louer|a-louer|à-louer|\/rent\//.test(url)) return "rent";
  return null;
}

function plausible(amount: number | null, intent: "sale" | "rent" | null): number | null {
  if (amount == null || intent == null || amount <= 0 || amount > 500_000_000) return null;
  if (intent === "sale" && amount < 10_000) return null;
  if (intent === "rent" && amount < 1_000) return null;
  return amount;
}

function unsafePriceText(text: string): boolean {
  return /(?:dh|dhs|mad|dirhams?)\s*(?:\/|par|le)\s*m(?:²|2)\b|(?:per day|daily|par[-_ ]?jour|par\s+nuit|nuit[eé]e|journalier|journali[eè]re|quotidien)|prix\s+(?:sur\s+demande|à\s+consulter|a\s+consulter)/i.test(text);
}

export function isRecognizedDetailUrlV5(domain: string, rawUrl: string): boolean {
  try {
    const path = new URL(rawUrl).pathname;
    if (domain === "mubawab.ma") return /^\/(?:fr|en|ar)\/a\/\d+\//i.test(path);
    if (domain === "masaken.ma") return /\/\d+$/.test(path);
    if (domain === "mouldar.com") return /\/[0-9a-f]{8}$/i.test(path);
    if (domain === "agenz.ma") return /\/\d+$/.test(path);
    return false;
  } catch {
    return false;
  }
}

function canonicalIdentity(html: string, targetUrl: string, resolvedUrl?: string | null): boolean {
  try {
    const $ = loadHtml(html);
    const target = identityUrl(targetUrl);
    if (!target) return false;
    const resolved = identityUrl(resolvedUrl);
    if (resolved === target) return true;
    const canonical = identityUrl($("link[rel='canonical']").attr("href"));
    const ogUrl = identityUrl($("meta[property='og:url']").attr("content"));
    return canonical === target || ogUrl === target;
  } catch {
    return false;
  }
}

function currencyIsMad(raw: unknown): boolean {
  return typeof raw === "string" && /^(?:mad|dh|dhs|dirham|dirhams)$/i.test(raw.trim());
}

function jsonLdCanonicalOffer(html: string, row: PriceV5Candidate, intent: "sale" | "rent" | null, identity: boolean): number | null {
  if (!identity) return null;
  try {
    const $ = loadHtml(html);
    const target = identityUrl(row.canonical_url);
    for (const node of getJsonLd($)) {
      if (!node || typeof node !== "object") continue;
      const type = Array.isArray(node["@type"]) ? node["@type"].join(",") : String(node["@type"] ?? "");
      if (!/Residence|Apartment|House|RealEstate|Product|Accommodation/i.test(type)) continue;
      const nodeUrl = identityUrl(node.url ?? node["@id"] ?? null);
      if (nodeUrl && nodeUrl !== target) continue;
      const offers = node.offers ? (Array.isArray(node.offers) ? node.offers : [node.offers]) : [];
      for (const offer of offers) {
        if (!offer || typeof offer !== "object") continue;
        const spec = offer.priceSpecification && typeof offer.priceSpecification === "object" ? offer.priceSpecification : null;
        const currency = offer.priceCurrency ?? spec?.priceCurrency;
        if (!currencyIsMad(currency)) continue;
        const amount = plausible(parseMoneyAmountV5(offer.price ?? spec?.price), intent);
        if (amount != null) return amount;
      }
    }
  } catch {
    return null;
  }
  return null;
}

function metaCanonicalPrice(html: string, intent: "sale" | "rent" | null, identity: boolean): number | null {
  if (!identity) return null;
  try {
    const $ = loadHtml(html);
    const amountRaw = $("meta[property='product:price:amount']").attr("content") ?? $("meta[property='og:price:amount']").attr("content") ?? $("meta[itemprop='price']").attr("content") ?? null;
    const currency = $("meta[property='product:price:currency']").attr("content") ?? $("meta[property='og:price:currency']").attr("content") ?? $("meta[itemprop='priceCurrency']").attr("content") ?? null;
    if (!currencyIsMad(currency)) return null;
    return plausible(parseMoneyAmountV5(amountRaw), intent);
  } catch {
    return null;
  }
}

function mouldarPrimaryPhrase(html: string, intent: "sale" | "rent" | null): number | null {
  try {
    const $ = loadHtml(html);
    const primary = clean($("main, article, [role='main']").first().text());
    if (!primary) return null;
    const match = primary.match(/(?:ce bien est proposé au prix de|ce bien est propose au prix de|le loyer est de|loyer est de)\s*([0-9][0-9 .]{2,18})\s*(?:dh|dhs|mad|dirhams?)([^.]*)/i);
    if (!match || unsafePriceText(`${match[1]} DH ${match[2] ?? ""}`)) return null;
    return plausible(parseMoneyAmountV5(match[1]), intent);
  } catch {
    return null;
  }
}

function masakenH1Price(html: string, intent: "sale" | "rent" | null): number | null {
  try {
    const $ = loadHtml(html);
    const h1 = clean($("h1").first().text());
    if (!h1 || unsafePriceText(h1)) return null;
    const match = h1.match(/([0-9][0-9 .]{2,18})\s*(?:dh|dhs|mad|dirhams?)\s*$/i);
    return plausible(parseMoneyAmountV5(match?.[1]), intent);
  } catch {
    return null;
  }
}

export function auditPriceV5Html(html: string, row: PriceV5Candidate, resolvedUrl?: string | null): PriceV5Audit {
  const intent = inferIntent(row);
  const identity = canonicalIdentity(html, row.canonical_url, resolvedUrl);
  if (!intent) return { reliable: null, generic_high_amount: null, canonical_identity: identity };

  const jsonld = jsonLdCanonicalOffer(html, row, intent, identity);
  if (jsonld != null) return { reliable: { amount: jsonld, signal: "jsonld_canonical_offer" }, generic_high_amount: null, canonical_identity: identity };

  const meta = metaCanonicalPrice(html, intent, identity);
  if (meta != null) return { reliable: { amount: meta, signal: "meta_canonical_price" }, generic_high_amount: null, canonical_identity: identity };

  if (row.source_domain === "mouldar.com") {
    const amount = mouldarPrimaryPhrase(html, intent);
    if (amount != null) return { reliable: { amount, signal: "mouldar_primary_phrase" }, generic_high_amount: null, canonical_identity: identity };
  }

  if (row.source_domain === "masaken.ma") {
    const amount = masakenH1Price(html, intent);
    if (amount != null) return { reliable: { amount, signal: "masaken_h1_price" }, generic_high_amount: null, canonical_identity: identity };
  }

  const detail = extractDetail(html);
  const generic = detail._confidence.price === "high" && !unsafePriceText(detail.price_raw ?? "")
    ? plausible(parseMoneyAmountV5(detail.price_raw), intent)
    : null;
  return { reliable: null, generic_high_amount: generic, canonical_identity: identity };
}

async function loadCandidates(source: string, limit: number): Promise<PriceV5Candidate[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("thin_index_search_documents")
    .select("seed_id,canonical_url,source_domain,normalized_intent")
    .eq("document_kind", "LISTING")
    .in("display_eligibility", ["eligible_primary", "eligible_secondary"])
    .eq("source_domain", source)
    .is("normalized_price_mad", null)
    .order("updated_at", { ascending: false })
    .limit(limit * 3);
  if (error) throw new Error(error.message);
  return ((data ?? []) as PriceV5Candidate[]).filter((row) => isRecognizedDetailUrlV5(row.source_domain, row.canonical_url)).slice(0, limit);
}

async function main() {
  const guard = getThirdPartyIngestionGuard({ scriptName: "price-extraction-v5-detail-audit" });
  if (guard.blocked) throw new Error(guard.message);
  if (process.env.PRICE_V5_WRITE === "true") throw new Error("price-v5 audit is read-only: writes are intentionally unavailable");

  const perSourceLimit = Math.max(1, Math.min(Number(process.env.PRICE_V5_PER_SOURCE_LIMIT ?? 80), 200));
  const requestedSources = (process.env.PRICE_V5_SOURCES ?? SOURCES.join(",")).split(",").map((s) => s.trim()).filter((s) => SOURCE_SET.has(s));
  const bySource: Record<string, { candidates: number; robots_skipped: number; fetched: number; reliable: number; generic_high_only: number; canonical_mismatch: number; failed: number; signals: Record<string, number> }> = {};

  for (const source of requestedSources) {
    const rows = await loadCandidates(source, perSourceLimit);
    const stat = { candidates: rows.length, robots_skipped: 0, fetched: 0, reliable: 0, generic_high_only: 0, canonical_mismatch: 0, failed: 0, signals: {} as Record<string, number> };
    bySource[source] = stat;
    for (const row of rows) {
      try {
        if (!(await isAllowedByRobots(row.canonical_url))) {
          stat.robots_skipped += 1;
          continue;
        }
        const res = await fetchHtml(row.canonical_url, { timeoutMs: 15_000 });
        stat.fetched += 1;
        const audit = auditPriceV5Html(res.html, row, res.url);
        if (!audit.canonical_identity) stat.canonical_mismatch += 1;
        if (audit.reliable) {
          stat.reliable += 1;
          stat.signals[audit.reliable.signal] = (stat.signals[audit.reliable.signal] ?? 0) + 1;
        } else if (audit.generic_high_amount != null) {
          stat.generic_high_only += 1;
        }
      } catch (error) {
        stat.failed += 1;
        console.warn(`[price-v5-audit] ${source}: ${error instanceof Error ? error.message : String(error)}`);
      }
      await safeDelay(250, 650);
    }
  }

  const totals = Object.values(bySource).reduce(
    (acc, stat) => ({ candidates: acc.candidates + stat.candidates, fetched: acc.fetched + stat.fetched, reliable: acc.reliable + stat.reliable, generic_high_only: acc.generic_high_only + stat.generic_high_only, robots_skipped: acc.robots_skipped + stat.robots_skipped, canonical_mismatch: acc.canonical_mismatch + stat.canonical_mismatch, failed: acc.failed + stat.failed }),
    { candidates: 0, fetched: 0, reliable: 0, generic_high_only: 0, robots_skipped: 0, canonical_mismatch: 0, failed: 0 },
  );
  console.log(JSON.stringify({ write: false, per_source_limit: perSourceLimit, totals, bySource }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
