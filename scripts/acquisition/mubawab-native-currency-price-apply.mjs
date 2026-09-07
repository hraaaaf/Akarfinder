import fs from 'node:fs/promises';

const inputPath = process.argv[2];
if (!inputPath) throw new Error('recoverable.json path required');
const base = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!base || !key) throw new Error('Supabase credentials required');
const headers = { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' };

async function getAllCurrent() {
  const out = [];
  for (let offset = 0;; offset += 1000) {
    const r = await fetch(`${base}/rest/v1/mubawab_listing_corpus_v1?select=source_listing_id,evidence_status,metadata&limit=1000&offset=${offset}&evidence_status=eq.current_verified`, { headers });
    if (!r.ok) throw new Error(`read failed ${r.status}: ${await r.text()}`);
    const batch = await r.json();
    out.push(...batch);
    if (batch.length < 1000) break;
  }
  return out;
}

async function patch(row, resolution) {
  const price = row?.metadata?.card_enrichment_v1?.price;
  if (price?.status !== 'unknown') return 'skipped';
  const now = new Date().toISOString();
  const metadata = {
    ...(row.metadata || {}),
    card_enrichment_v1: {
      ...(row.metadata?.card_enrichment_v1 || {}),
      price: {
        status: 'unique',
        value: resolution.value,
        currency: resolution.category === 'eur_unique' ? 'EUR' : 'USD',
        source: 'safe_shard_card_native_currency',
        resolved_at: now,
        resolver_version: 'native_currency_v1',
      },
    },
  };
  const r = await fetch(`${base}/rest/v1/mubawab_listing_corpus_v1?source_listing_id=eq.${row.source_listing_id}&evidence_status=eq.current_verified`, {
    method: 'PATCH', headers: { ...headers, prefer: 'return=minimal' }, body: JSON.stringify({ metadata, updated_at: now }),
  });
  if (!r.ok) throw new Error(`patch ${row.source_listing_id} failed ${r.status}: ${await r.text()}`);
  return 'patched';
}

const raw = JSON.parse(await fs.readFile(inputPath, 'utf8'));
const certified = raw.filter((r) => r.category === 'eur_unique' || r.category === 'usd_unique');
if (certified.length !== 340) throw new Error(`expected 340 certified native-currency prices, got ${certified.length}`);
const current = await getAllCurrent();
const byId = new Map(current.map((r) => [String(r.source_listing_id), r]));
const beforeUnique = current.filter((r) => r?.metadata?.card_enrichment_v1?.price?.status === 'unique').length;
let patched = 0, skipped = 0, missing = 0;
for (let i = 0; i < certified.length; i += 20) {
  const batch = certified.slice(i, i + 20);
  const results = await Promise.all(batch.map(async (resolution) => {
    const row = byId.get(String(resolution.id));
    if (!row) return 'missing';
    return patch(row, resolution);
  }));
  patched += results.filter((x) => x === 'patched').length;
  skipped += results.filter((x) => x === 'skipped').length;
  missing += results.filter((x) => x === 'missing').length;
}
const verify = await getAllCurrent();
const afterUnique = verify.filter((r) => r?.metadata?.card_enrichment_v1?.price?.status === 'unique').length;
const nativeCount = verify.filter((r) => ['EUR','USD'].includes(r?.metadata?.card_enrichment_v1?.price?.currency) && r?.metadata?.card_enrichment_v1?.price?.source === 'safe_shard_card_native_currency').length;
const expectedAfter = beforeUnique + patched;
const report = {
  success: afterUnique === expectedAfter && patched + skipped + missing === 340,
  certifiedCount: 340,
  beforeUnique,
  patched,
  skipped,
  missing,
  afterUnique,
  nativeCurrencyCount: nativeCount,
  coveragePct: Number((afterUnique / 18445 * 100).toFixed(2)),
};
await fs.mkdir('artifacts/mubawab-native-currency-price-apply', { recursive: true });
await fs.writeFile('artifacts/mubawab-native-currency-price-apply/report.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!report.success) process.exitCode = 2;
