import fs from 'node:fs/promises';
import path from 'node:path';
import { extractDetailPrice } from './extract-detail-price';
import { validateMubawabFinalUrl } from './mubawab-url-identity';

const OUT = process.env.PRICE_RECOVERY_OUT ?? '.tmp/price-recovery';
const LIMIT = Math.max(1, Number(process.env.PRICE_RECOVERY_LIMIT ?? 300));
const CONCURRENCY = Math.max(1, Math.min(8, Number(process.env.PRICE_RECOVERY_CONCURRENCY ?? 6)));
const MANIFEST = process.env.PRICE_RECOVERY_FALLBACK_MANIFEST;
if (!MANIFEST) throw new Error('missing PRICE_RECOVERY_FALLBACK_MANIFEST');

type Thin = {
  seed_id: string;
  canonical_url: string;
  source_domain: string;
  intent: string | null;
  freshness_status?: string | null;
  display_eligibility?: string;
};

type Result = Thin & {
  httpStatus: number | null;
  fetched: boolean;
  finalUrl: string | null;
  identityStatus: string | null;
  extraction: ReturnType<typeof extractDetailPrice> | null;
  error: string | null;
};

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchOne(row: Thin): Promise<Result> {
  try {
    const response = await fetch(row.canonical_url, {
      headers: {
        'user-agent': 'AkarFinder-PriceRecovery/1.1 (+read-only audit)',
        accept: 'text/html,application/xhtml+xml',
        'accept-language': 'fr-FR,fr;q=0.9,en;q=0.7',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(20_000),
    });
    const httpStatus = response.status;
    const finalUrl = response.url || row.canonical_url;
    if (!response.ok) {
      return { ...row, httpStatus, fetched: false, finalUrl, identityStatus: null, extraction: null, error: `http_${httpStatus}` };
    }
    const identityStatus = validateMubawabFinalUrl(row.canonical_url, finalUrl);
    if (identityStatus !== 'exact') {
      return { ...row, httpStatus, fetched: true, finalUrl, identityStatus, extraction: null, error: `identity_${identityStatus}` };
    }
    const html = await response.text();
    const extraction = extractDetailPrice('mubawab.ma', html, row.intent);
    return { ...row, httpStatus, fetched: true, finalUrl, identityStatus, extraction, error: null };
  } catch (error) {
    return { ...row, httpStatus: null, fetched: false, finalUrl: null, identityStatus: null, extraction: null, error: error instanceof Error ? error.message : String(error) };
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
      await sleep(150);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker));
  return out;
}

async function main() {
  const raw = await fs.readFile(MANIFEST, 'utf8');
  const rows = (JSON.parse(raw) as Thin[])
    .filter(r => r.source_domain === 'mubawab.ma')
    .slice(0, LIMIT);
  if (!rows.length) throw new Error('empty Mubawab manifest');

  const results = await mapLimited(rows, fetchOne);
  const exact = results.filter(r => r.identityStatus === 'exact');
  const extracted = exact.filter(r => r.extraction?.currentPriceMad != null);
  const high = extracted.filter(r => r.extraction?.confidence === 'high');
  const monthly = high.filter(r => r.extraction?.period === 'month');
  const sale = high.filter(r => r.extraction?.period === 'sale_total');
  const perM2Only = exact.filter(r => !r.extraction?.currentPriceMad && r.extraction?.pricePerM2Mad != null);
  const notDisclosed = exact.filter(r => r.extraction?.priceStatus === 'not_disclosed');
  const unresolved = exact.filter(r => r.fetched && !r.extraction?.currentPriceMad && r.extraction?.priceStatus !== 'not_disclosed');
  const identityRejected = results.filter(r => r.fetched && r.identityStatus && r.identityStatus !== 'exact');

  await fs.mkdir(OUT, { recursive: true });
  await fs.writeFile(path.join(OUT, 'results.jsonl'), results.map(r => JSON.stringify(r)).join('\n') + '\n');
  const summary = {
    readOnly: true,
    databaseWrites: 0,
    inputMode: 'fallback_manifest',
    requested: results.length,
    fetched: results.filter(r => r.fetched).length,
    identityExact: exact.length,
    identityRejected: identityRejected.length,
    identityRejectBreakdown: Object.fromEntries(['category_redirect','listing_mismatch','missing_listing_id'].map(s => [s, results.filter(r => r.identityStatus === s).length])),
    extracted: extracted.length,
    highConfidence: high.length,
    monthly: monthly.length,
    saleTotal: sale.length,
    perM2Only: perM2Only.length,
    notDisclosed: notDisclosed.length,
    unresolved: unresolved.length,
    rateLimited: results.filter(r => r.httpStatus === 429).length,
  };
  await fs.writeFile(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify(summary, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
