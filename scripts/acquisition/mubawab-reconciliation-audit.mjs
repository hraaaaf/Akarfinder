import fs from 'node:fs/promises';

const outDir = 'artifacts/mubawab-reconciliation-audit';
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Missing Supabase read credentials');

const headers = { apikey: key, Authorization: `Bearer ${key}` };
const pageSize = 1000;
const rows = [];
let lastId = null;
let scannedRows = 0;
for (;;) {
  const endpoint = new URL('/rest/v1/discovery_candidates', url);
  endpoint.searchParams.set('select', 'id,source_domain,canonical_url,discovery_status,last_seen_at');
  endpoint.searchParams.set('limit', String(pageSize));
  endpoint.searchParams.set('order', 'id.asc');
  if (lastId) endpoint.searchParams.set('id', `gt.${lastId}`);
  const res = await fetch(endpoint, { headers });
  if (!res.ok) throw new Error(`Supabase read failed: ${res.status} ${await res.text()}`);
  const batch = await res.json();
  scannedRows += batch.length;
  for (const r of batch) {
    const host = String(r.source_domain || '').toLowerCase().replace(/^www\./, '');
    if (host === 'mubawab.ma') rows.push(r);
  }
  if (batch.length < pageSize) break;
  lastId = batch.at(-1)?.id;
  if (!lastId) throw new Error('Keyset pagination lost last id');
}

const uniq = new Map();
for (const r of rows) {
  if (!r.canonical_url) continue;
  const prev = uniq.get(r.canonical_url);
  if (!prev || new Date(r.last_seen_at || 0) > new Date(prev.last_seen_at || 0)) uniq.set(r.canonical_url, r);
}
const now = Date.now();
const days = n => now - n * 86400000;
const values = [...uniq.values()];
const byStatus = {};
for (const r of values) byStatus[r.discovery_status || 'null'] = (byStatus[r.discovery_status || 'null'] || 0) + 1;

const safePath = raw => {
  try { return new URL(raw).pathname; } catch { return ''; }
};

const summary = {
  generated_at: new Date().toISOString(),
  source: 'public.discovery_candidates',
  source_filter: 'local source_domain normalization == mubawab.ma',
  pagination: 'full-table id keyset; local filter',
  zero_db_writes: true,
  scanned_rows: scannedRows,
  raw_rows: rows.length,
  unique_canonical_urls: uniq.size,
  exact_duplicates: rows.length - uniq.size,
  by_status_unique: byStatus,
  seen_7d_unique: values.filter(r => Date.parse(r.last_seen_at || '') >= days(7)).length,
  seen_30d_unique: values.filter(r => Date.parse(r.last_seen_at || '') >= days(30)).length,
  shard_like_unique: values.filter(r => /\/(cc|ct|cd|sd)\//i.test(safePath(r.canonical_url))).length,
  numeric_path_unique: values.filter(r => /\/[0-9]+[A-Za-z0-9_-]*(?:\/|$)/.test(safePath(r.canonical_url))).length,
  claim_30k_supported: uniq.size >= 30000,
};

await fs.mkdir(outDir, { recursive: true });
await fs.writeFile(`${outDir}/summary.json`, JSON.stringify(summary, null, 2) + '\n');
await fs.writeFile(`${outDir}/mubawab_unique_urls.txt`, [...uniq.keys()].sort().join('\n') + '\n');
console.log(summary);
