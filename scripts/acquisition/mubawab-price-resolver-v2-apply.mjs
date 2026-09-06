import fs from 'node:fs/promises';

const resolvedPath = process.argv[2];
if (!resolvedPath) throw new Error('resolved.json path required');
const base = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!base || !key) throw new Error('Supabase credentials required');

const headers = {
  apikey: key,
  authorization: `Bearer ${key}`,
  'content-type': 'application/json',
};

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

async function patchOne(row, resolution) {
  const currentPrice = row.metadata?.card_enrichment_v1?.price;
  if (currentPrice?.status !== 'unknown') return 'skipped_not_unknown';
  const now = new Date().toISOString();
  const metadata = {
    ...(row.metadata || {}),
    card_enrichment_v1: {
      ...(row.metadata?.card_enrichment_v1 || {}),
      price: {
        status: 'unique',
        value: resolution.value,
        currency: 'MAD',
        source: resolution.source,
        evidence_count: resolution.evidenceCount,
        resolved_at: now,
        resolver_version: 2,
      },
    },
  };
  const r = await fetch(`${base}/rest/v1/mubawab_listing_corpus_v1?source_listing_id=eq.${row.source_listing_id}&evidence_status=eq.current_verified`, {
    method: 'PATCH',
    headers: { ...headers, prefer: 'return=minimal' },
    body: JSON.stringify({ metadata, updated_at: now }),
  });
  if (!r.ok) throw new Error(`patch ${row.source_listing_id} failed ${r.status}: ${await r.text()}`);
  return 'patched';
}

const resolved = JSON.parse(await fs.readFile(resolvedPath, 'utf8'));
if (resolved.length !== 944) throw new Error(`expected 944 resolved rows, got ${resolved.length}`);
const current = await getAllCurrent();
const byId = new Map(current.map((r) => [String(r.source_listing_id), r]));
const targets = resolved.map((r) => ({ resolution: r, row: byId.get(String(r.id)) }));
if (targets.some((t) => !t.row)) throw new Error('resolved target missing from current corpus');

let patched = 0;
let skipped = 0;
const concurrency = 12;
for (let i = 0; i < targets.length; i += concurrency) {
  const results = await Promise.all(targets.slice(i, i + concurrency).map((t) => patchOne(t.row, t.resolution)));
  patched += results.filter((x) => x === 'patched').length;
  skipped += results.filter((x) => x !== 'patched').length;
}

const verify = await getAllCurrent();
let unique = 0;
for (const row of verify) if (row.metadata?.card_enrichment_v1?.price?.status === 'unique') unique += 1;
const report = {
  success: unique === 12240,
  targetCount: resolved.length,
  patched,
  skipped,
  finalPriceUniqueCount: unique,
  finalCoveragePct: Number((unique / 18445 * 100).toFixed(2)),
};
await fs.mkdir('artifacts/mubawab-price-resolver-v2-apply', { recursive: true });
await fs.writeFile('artifacts/mubawab-price-resolver-v2-apply/report.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!report.success) process.exitCode = 2;
