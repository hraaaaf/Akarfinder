import fs from 'node:fs/promises';
import path from 'node:path';
import { extractDetailPrice } from './extract-detail-price';

const OUT = process.env.PRICE_RECOVERY_OUT ?? '.tmp/price-recovery';
const LIMIT = Math.max(1, Number(process.env.PRICE_RECOVERY_LIMIT ?? 100));
const CONCURRENCY = Math.max(1, Math.min(5, Number(process.env.PRICE_RECOVERY_CONCURRENCY ?? 3)));
const SOURCES = (process.env.PRICE_RECOVERY_SOURCES ?? 'agenz.ma,mubawab.ma')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`missing ${name}`);
  return value;
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

type Result = Thin & {
  httpStatus: number | null;
  fetched: boolean;
  extraction: ReturnType<typeof extractDetailPrice> | null;
  error: string | null;
};

async function fetchOne(row: Thin): Promise<Result> {
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
    if (!response.ok) return { ...row, httpStatus, fetched: false, extraction: null, error: `http_${httpStatus}` };
    const html = await response.text();
    const extraction = extractDetailPrice(row.source_domain, html, row.intent);
    return { ...row, httpStatus, fetched: true, extraction, error: null };
  } catch (error) {
    return { ...row, httpStatus: null, fetched: false, extraction: null, error: error instanceof Error ? error.message : String(error) };
  }
}

async function mapLimited<T, R>(items: T[], fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i]);
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, () => worker()));
  return out;
}

async function main() {
  const rows: Thin[] = [];
  for (const source of SOURCES) {
    const sourceRows = await rest<Thin>('thin_index_search_documents', {
      select: 'seed_id,canonical_url,source_domain,intent,freshness_status,display_eligibility',
      source_domain: `eq.${source}`,
      price_mad: 'is.null',
      display_eligibility: 'in.(eligible_primary,eligible_secondary)',
      document_kind: 'eq.LISTING',
      order: 'canonical_url.asc',
      limit: String(LIMIT),
    });
    rows.push(...sourceRows);
  }

  const results = await mapLimited(rows, fetchOne);
  const extracted = results.filter(r => r.extraction?.currentPriceMad != null);
  const high = extracted.filter(r => r.extraction?.confidence === 'high');
  const monthly = extracted.filter(r => r.extraction?.period === 'month');
  const sale = extracted.filter(r => r.extraction?.period === 'sale_total');
  const perM2Only = results.filter(r => !r.extraction?.currentPriceMad && r.extraction?.pricePerM2Mad != null);

  await fs.mkdir(OUT, { recursive: true });
  await fs.writeFile(path.join(OUT, 'results.jsonl'), results.map(r => JSON.stringify(r)).join('\n') + '\n');
  const summary = {
    readOnly: true,
    databaseWrites: 0,
    requested: rows.length,
    fetched: results.filter(r => r.fetched).length,
    extracted: extracted.length,
    highConfidence: high.length,
    monthly: monthly.length,
    saleTotal: sale.length,
    perM2Only: perM2Only.length,
    bySource: Object.fromEntries(SOURCES.map(source => {
      const scoped = results.filter(r => r.source_domain === source);
      return [source, {
        requested: scoped.length,
        fetched: scoped.filter(r => r.fetched).length,
        extracted: scoped.filter(r => r.extraction?.currentPriceMad != null).length,
        highConfidence: scoped.filter(r => r.extraction?.confidence === 'high').length,
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
