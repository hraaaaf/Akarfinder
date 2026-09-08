import fs from 'node:fs/promises';
import path from 'node:path';
import * as cheerio from 'cheerio';
import { extractDetailPrice } from './extract-detail-price';

const OUT = process.env.PRICE_RECOVERY_OUT ?? '.tmp/price-recovery';
const LIMIT = Math.max(1, Number(process.env.PRICE_RECOVERY_LIMIT ?? 100));
const CONCURRENCY = Math.max(1, Math.min(5, Number(process.env.PRICE_RECOVERY_CONCURRENCY ?? 3)));
const SOURCES = (process.env.PRICE_RECOVERY_SOURCES ?? 'agenz.ma,mubawab.ma')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
const FALLBACK_MANIFEST = process.env.PRICE_RECOVERY_FALLBACK_MANIFEST
  ?? 'scripts/price-recovery/fallback-seed-manifest.json';

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`missing ${name}`);
  return value;
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function rest<T>(table: string, params: Record<string, string>): Promise<T[]> {
  const url = new URL(`/rest/v1/${table}`, env('SUPABASE_URL'));
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  const response = await fetch(url, {
    headers: { apikey: key, authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`${table} ${response.status} ${await response.text()}`);
  return response.json() as Promise<T[]>;
}

type Thin = {
  seed_id: string;
  canonical_url: string;
  source_domain: string;
  intent: string | null;
  freshness_status: string | null;
  display_eligibility: string;
};

type Diagnostic = {
  title: string;
  h1: string[];
  metaDescription: string;
  moneyContexts: string[];
  scriptSources: string[];
  apiHints: string[];
  nextDataHints: string[];
};

type Result = Thin & {
  httpStatus: number | null;
  fetched: boolean;
  extraction: ReturnType<typeof extractDetailPrice> | null;
  diagnostic: Diagnostic | null;
  error: string | null;
  attempts: number;
};

function compact(value: string): string {
  return value.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function contexts(text: string, pattern: RegExp, radius = 180, limit = 20): string[] {
  const out: string[] = [];
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  const rx = new RegExp(pattern.source, flags);
  let match: RegExpExecArray | null;
  while ((match = rx.exec(text)) && out.length < limit) {
    const start = Math.max(0, match.index - radius);
    const end = Math.min(text.length, match.index + match[0].length + radius);
    out.push(compact(text.slice(start, end)).slice(0, radius * 2 + 120));
    if (match[0].length === 0) rx.lastIndex++;
  }
  return [...new Set(out)];
}

function buildDiagnostic(html: string): Diagnostic {
  const $ = cheerio.load(html);
  const title = compact($('title').first().text()).slice(0, 300);
  const h1 = $('h1').toArray().map(el => compact($(el).text())).filter(Boolean).slice(0, 8);
  const metaDescription = compact($('meta[name="description"]').attr('content') ?? '').slice(0, 600);
  const moneyContexts: string[] = [];
  $('body *').each((_, el) => {
    if (moneyContexts.length >= 12 || !el || el.type !== 'tag') return;
    const own = compact($(el).clone().children().remove().end().text());
    if (!own || own.length > 220) return;
    if (/(?:\d[\d\s,.]{1,14})\s*(?:DH|DHS|MAD|dirhams?)/i.test(own)) moneyContexts.push(own.slice(0, 220));
  });

  const scriptSources = $('script[src]').toArray()
    .map(el => String($(el).attr('src') ?? '').trim())
    .filter(Boolean)
    .slice(0, 80);
  const inlineScripts = $('script:not([src])').toArray().map(el => $(el).html() ?? '').join('\n');
  const apiHints = [
    ...contexts(html, /api\.agenz\.ma/ig, 220, 20),
    ...contexts(inlineScripts, /https?:\\?\/\\?\/[^\s"'<>]*agenz[^\s"'<>]*/ig, 180, 20),
    ...contexts(inlineScripts, /(?:fetch|axios|graphql|annonce|listing|property|offer|price)/ig, 140, 30),
  ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 40);
  const nextData = $('#__NEXT_DATA__').text() || inlineScripts;
  const nextDataHints = [
    ...contexts(nextData, /api\.agenz\.ma/ig, 220, 20),
    ...contexts(nextData, /(?:price|prix|loyer|annonce|listing|property|offer)/ig, 160, 30),
  ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 40);

  return { title, h1, metaDescription, moneyContexts, scriptSources, apiHints, nextDataHints };
}

async function loadFallbackManifest(): Promise<Thin[]> {
  const raw = await fs.readFile(FALLBACK_MANIFEST, 'utf8');
  const rows = JSON.parse(raw) as Thin[];
  return rows.filter(row => SOURCES.includes(row.source_domain));
}

async function fetchOne(row: Thin): Promise<Result> {
  const maxAttempts = row.source_domain === 'agenz.ma' ? 4 : 1;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(row.canonical_url, {
        headers: {
          'user-agent': 'AkarFinder-PriceRecovery/1.0 (+read-only audit)',
          accept: 'text/html,application/xhtml+xml',
          'accept-language': 'fr-FR,fr;q=0.9,en;q=0.7',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(20_000),
      });
      const httpStatus = response.status;
      if (httpStatus === 429 && attempt < maxAttempts) {
        const retryAfter = Number(response.headers.get('retry-after'));
        const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : attempt * 5000;
        await sleep(waitMs);
        continue;
      }
      if (!response.ok) return { ...row, httpStatus, fetched: false, extraction: null, diagnostic: null, error: `http_${httpStatus}`, attempts: attempt };
      const html = await response.text();
      const extraction = extractDetailPrice(row.source_domain, html, row.intent);
      const diagnostic = row.source_domain === 'agenz.ma' && extraction.currentPriceMad == null ? buildDiagnostic(html) : null;
      return { ...row, httpStatus, fetched: true, extraction, diagnostic, error: null, attempts: attempt };
    } catch (error) {
      if (attempt < maxAttempts) {
        await sleep(attempt * 3000);
        continue;
      }
      return { ...row, httpStatus: null, fetched: false, extraction: null, diagnostic: null, error: error instanceof Error ? error.message : String(error), attempts: attempt };
    }
  }
  return { ...row, httpStatus: null, fetched: false, extraction: null, diagnostic: null, error: 'unreachable', attempts: maxAttempts };
}

async function mapLimited<T, R>(items: T[], fn: (item: T) => Promise<R>, concurrency = CONCURRENCY, pauseMs = 250): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i]);
      await sleep(pauseMs);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return out;
}

async function main() {
  const rowsBySource = new Map<string, Thin[]>();
  let inputMode: 'supabase_rest' | 'fallback_manifest' = 'supabase_rest';

  try {
    for (const source of SOURCES) {
      const sourceRows = await rest<Thin>('thin_index_search_documents', {
        select: 'seed_id,canonical_url,source_domain,intent,freshness_status,display_eligibility',
        source_domain: `eq.${source}`,
        price_mad: 'is.null',
        display_eligibility: 'in.(eligible_primary,eligible_secondary)',
        document_kind: 'eq.LISTING',
        limit: String(LIMIT),
      });
      rowsBySource.set(source, sourceRows);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/\b402\b|exceed_egress_quota/i.test(message)) throw error;
    const fallback = await loadFallbackManifest();
    inputMode = 'fallback_manifest';
    for (const source of SOURCES) {
      rowsBySource.set(source, fallback.filter(row => row.source_domain === source).slice(0, LIMIT));
    }
    console.warn(`Supabase REST unavailable due to egress restriction; using ${FALLBACK_MANIFEST}`);
  }

  const results: Result[] = [];
  for (const source of SOURCES) {
    const sourceRows = rowsBySource.get(source) ?? [];
    const sourceConcurrency = source === 'agenz.ma' ? 1 : CONCURRENCY;
    const pauseMs = source === 'agenz.ma' ? 2500 : 250;
    results.push(...await mapLimited(sourceRows, fetchOne, sourceConcurrency, pauseMs));
  }

  const extracted = results.filter(r => r.extraction?.currentPriceMad != null);
  const high = extracted.filter(r => r.extraction?.confidence === 'high');
  const monthly = extracted.filter(r => r.extraction?.period === 'month');
  const sale = extracted.filter(r => r.extraction?.period === 'sale_total');
  const perM2Only = results.filter(r => !r.extraction?.currentPriceMad && r.extraction?.pricePerM2Mad != null);
  const notDisclosed = results.filter(r => r.extraction?.priceStatus === 'not_disclosed');
  const unresolved = results.filter(r => r.fetched && !r.extraction?.currentPriceMad && r.extraction?.priceStatus !== 'not_disclosed');

  await fs.mkdir(OUT, { recursive: true });
  await fs.writeFile(path.join(OUT, 'results.jsonl'), results.map(r => JSON.stringify(r)).join('\n') + '\n');
  const summary = {
    readOnly: true,
    databaseWrites: 0,
    inputMode,
    requested: results.length,
    fetched: results.filter(r => r.fetched).length,
    extracted: extracted.length,
    highConfidence: high.length,
    monthly: monthly.length,
    saleTotal: sale.length,
    perM2Only: perM2Only.length,
    notDisclosed: notDisclosed.length,
    unresolved: unresolved.length,
    rateLimited: results.filter(r => r.httpStatus === 429).length,
    bySource: Object.fromEntries(SOURCES.map(source => {
      const scoped = results.filter(r => r.source_domain === source);
      return [source, {
        requested: scoped.length,
        fetched: scoped.filter(r => r.fetched).length,
        extracted: scoped.filter(r => r.extraction?.currentPriceMad != null).length,
        highConfidence: scoped.filter(r => r.extraction?.confidence === 'high').length,
        notDisclosed: scoped.filter(r => r.extraction?.priceStatus === 'not_disclosed').length,
        unresolved: scoped.filter(r => r.fetched && !r.extraction?.currentPriceMad && r.extraction?.priceStatus !== 'not_disclosed').length,
        rateLimited: scoped.filter(r => r.httpStatus === 429).length,
      }];
    })),
  };
  await fs.writeFile(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify(summary, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
