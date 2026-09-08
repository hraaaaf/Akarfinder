import fs from 'node:fs/promises';
import path from 'node:path';
import * as cheerio from 'cheerio';

const OUT = process.env.FALSE_NEGATIVE_AUDIT_OUT ?? '.tmp/price-false-negative-audit';
const LIMIT = Math.max(1, Number(process.env.FALSE_NEGATIVE_AUDIT_LIMIT ?? 5000));
const PAGE = Math.max(50, Math.min(1000, Number(process.env.FALSE_NEGATIVE_AUDIT_PAGE ?? 500)));
const CONCURRENCY = Math.max(1, Math.min(5, Number(process.env.FALSE_NEGATIVE_AUDIT_CONCURRENCY ?? 3)));

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`missing ${name}`);
  return value;
}

function sleep(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)); }
function compact(s: string) { return s.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim(); }

type Thin = {
  seed_id: string;
  canonical_url: string;
  source_domain: string;
  intent: string | null;
  title: string | null;
  city: string | null;
  property_type: string | null;
  freshness_status: string | null;
  display_eligibility: string;
};

type JsonPrice = { value: number; currency: string | null; evidence: string };
type Result = Thin & {
  httpStatus: number | null;
  fetched: boolean;
  finalUrl: string | null;
  redirected: boolean;
  categoryRedirect: boolean;
  titleAfterFetch: string | null;
  jsonPrice: JsonPrice | null;
  visibleMoney: string[];
  classification: 'false_negative_high' | 'price_signal_only' | 'dead_redirect' | 'blocked' | 'no_price_found' | 'fetch_error';
  error: string | null;
};

async function loadRows(): Promise<Thin[]> {
  const base = new URL('/rest/v1/thin_index_search_documents', env('SUPABASE_URL'));
  base.searchParams.set('select', 'seed_id,canonical_url,source_domain,intent,title,city,property_type,freshness_status,display_eligibility');
  base.searchParams.set('price_mad', 'is.null');
  base.searchParams.set('display_eligibility', 'in.(eligible_primary,eligible_secondary)');
  base.searchParams.set('document_kind', 'eq.LISTING');
  base.searchParams.set('order', 'seed_id.asc');
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  const rows: Thin[] = [];
  for (let offset = 0; offset < LIMIT; offset += PAGE) {
    const url = new URL(base);
    url.searchParams.set('limit', String(Math.min(PAGE, LIMIT - offset)));
    url.searchParams.set('offset', String(offset));
    const r = await fetch(url, {
      headers: { apikey: key, authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(60_000),
    });
    if (!r.ok) throw new Error(`thin_index_search_documents ${r.status} ${await r.text()}`);
    const batch = await r.json() as Thin[];
    rows.push(...batch);
    if (batch.length < Math.min(PAGE, LIMIT - offset)) break;
  }
  return rows;
}

function moneyContexts($: cheerio.CheerioAPI): string[] {
  const out: string[] = [];
  $('body *').each((_, el) => {
    if (out.length >= 20 || !el || el.type !== 'tag') return;
    const own = compact($(el).clone().children().remove().end().text());
    if (!own || own.length > 220) return;
    if (/(?:\d[\d\s,.]{1,16})\s*(?:DH|DHS|MAD|dirhams?)/i.test(own)) out.push(own.slice(0, 220));
  });
  return [...new Set(out)];
}

function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v !== 'string') return null;
  const cleaned = v.replace(/[^0-9.,]/g, '').replace(/\s/g, '');
  if (!cleaned) return null;
  const normalized = cleaned.includes(',') && !cleaned.includes('.') ? cleaned.replace(',', '.') : cleaned.replace(/,/g, '');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function walkJson(node: unknown, out: JsonPrice[], source: string) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach((v, i) => walkJson(v, out, `${source}[${i}]`)); return; }
  const obj = node as Record<string, unknown>;
  const type = String(obj['@type'] ?? '').toLowerCase();
  if (type === 'offer' || type === 'aggregateoffer') {
    const v = num(obj.price ?? obj.lowPrice ?? obj.highPrice);
    if (v != null && v > 0) out.push({ value: v, currency: typeof obj.priceCurrency === 'string' ? obj.priceCurrency : null, evidence: `${source}:${type}.price` });
  }
  for (const [k, v] of Object.entries(obj)) {
    if (k === 'price' || k === 'lowPrice' || k === 'highPrice' || k === 'priceCurrency') continue;
    walkJson(v, out, `${source}.${k}`);
  }
}

function jsonLdPrice($: cheerio.CheerioAPI): JsonPrice | null {
  const candidates: JsonPrice[] = [];
  $('script[type="application/ld+json"]').each((i, el) => {
    const raw = $(el).text().trim();
    if (!raw) return;
    try { walkJson(JSON.parse(raw), candidates, `jsonld[${i}]`); } catch { /* diagnostics only */ }
  });
  if (!candidates.length) return null;
  const mad = candidates.filter(c => !c.currency || /MAD/i.test(c.currency));
  const pool = mad.length ? mad : candidates;
  const distinct = [...new Map(pool.map(c => [`${c.value}:${c.currency ?? ''}`, c])).values()];
  return distinct.length === 1 ? distinct[0] : null;
}

function looksLikeCategoryRedirect(original: string, finalUrl: string): boolean {
  if (original === finalUrl) return false;
  try {
    const a = new URL(original); const b = new URL(finalUrl);
    const originalId = (a.pathname.match(/(?:\/a\/|\/property\/|\/annonces?[^/]*\/|_)(\d{5,})/i) ?? [])[1];
    const finalHasId = originalId ? b.pathname.includes(originalId) : false;
    if (originalId && !finalHasId) return true;
    if (/\/(sd|search|recherche|annonces|maroc)\//i.test(b.pathname) && !/\/(a|property)\//i.test(b.pathname)) return true;
  } catch {}
  return false;
}

async function fetchOne(row: Thin): Promise<Result> {
  try {
    const response = await fetch(row.canonical_url, {
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; AkarFinderAudit/1.0; +read-only)',
        accept: 'text/html,application/xhtml+xml',
        'accept-language': 'fr-FR,fr;q=0.9,en;q=0.7',
      },
      redirect: 'follow', signal: AbortSignal.timeout(25_000),
    });
    const finalUrl = response.url || row.canonical_url;
    const redirected = finalUrl !== row.canonical_url;
    const categoryRedirect = looksLikeCategoryRedirect(row.canonical_url, finalUrl);
    if (response.status === 403 || response.status === 429) return { ...row, httpStatus: response.status, fetched: false, finalUrl, redirected, categoryRedirect, titleAfterFetch: null, jsonPrice: null, visibleMoney: [], classification: 'blocked', error: `http_${response.status}` };
    if (!response.ok) return { ...row, httpStatus: response.status, fetched: false, finalUrl, redirected, categoryRedirect, titleAfterFetch: null, jsonPrice: null, visibleMoney: [], classification: 'fetch_error', error: `http_${response.status}` };
    const html = await response.text();
    const $ = cheerio.load(html);
    const titleAfterFetch = compact($('title').first().text()) || null;
    const visibleMoney = moneyContexts($);
    const jp = jsonLdPrice($);
    const classification = categoryRedirect ? 'dead_redirect' : jp ? 'false_negative_high' : visibleMoney.length ? 'price_signal_only' : 'no_price_found';
    return { ...row, httpStatus: response.status, fetched: true, finalUrl, redirected, categoryRedirect, titleAfterFetch, jsonPrice: jp, visibleMoney, classification, error: null };
  } catch (e) {
    return { ...row, httpStatus: null, fetched: false, finalUrl: null, redirected: false, categoryRedirect: false, titleAfterFetch: null, jsonPrice: null, visibleMoney: [], classification: 'fetch_error', error: e instanceof Error ? e.message : String(e) };
  }
}

async function mapLimited<T, R>(items: T[], fn: (x: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length); let next = 0;
  async function worker() {
    while (true) {
      const i = next++; if (i >= items.length) return;
      out[i] = await fn(items[i]);
      const domain = (items[i] as any)?.source_domain;
      await sleep(domain === 'agenz.ma' ? 2500 : 350);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker));
  return out;
}

async function main() {
  const rows = await loadRows();
  const results = await mapLimited(rows, fetchOne);
  const bySource: Record<string, Record<string, number>> = {};
  for (const r of results) {
    bySource[r.source_domain] ??= {};
    bySource[r.source_domain][r.classification] = (bySource[r.source_domain][r.classification] ?? 0) + 1;
  }
  const summary = {
    readOnly: true, databaseWrites: 0, requested: rows.length, fetched: results.filter(r => r.fetched).length,
    falseNegativeHigh: results.filter(r => r.classification === 'false_negative_high').length,
    priceSignalOnly: results.filter(r => r.classification === 'price_signal_only').length,
    deadRedirect: results.filter(r => r.classification === 'dead_redirect').length,
    blocked: results.filter(r => r.classification === 'blocked').length,
    noPriceFound: results.filter(r => r.classification === 'no_price_found').length,
    fetchError: results.filter(r => r.classification === 'fetch_error').length,
    bySource,
  };
  await fs.mkdir(OUT, { recursive: true });
  await fs.writeFile(path.join(OUT, 'results.jsonl'), results.map(r => JSON.stringify(r)).join('\n') + '\n');
  await fs.writeFile(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify(summary, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
