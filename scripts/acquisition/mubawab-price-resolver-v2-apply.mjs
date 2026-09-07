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
    const r = await fetch(`${base}/rest/v1/mubawab_listing_corpus_v1?select=source_listing_id,evidence_status,metadata&order=source_listing_id.asc&limit=1000&offset=${offset}&evidence_status=eq.current_verified`, { headers });
    if (!r.ok) throw new Error(`read failed ${r.status}: ${await r.text()}`);
    const batch = await r.json();
    out.push(...batch);
    if (batch.length < 1000) break;
  }
  return out;
}

function isUnique(row) {
  return row.metadata?.card_enrichment_v1?.price?.status === 'unique';
}
function isUnknown(row) {
  return row.metadata?.card_enrichment_v1?.price?.status === 'unknown';
}

async function patchOne(row, resolution) {
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
}

const resolved = JSON.parse(await fs.readFile(resolvedPath, 'utf8'));
if (resolved.length !== 944) throw new Error(`expected 944 resolved rows, got ${resolved.length}`);

const before = await getAllCurrent();
const byId = new Map(before.map((r) => [String(r.source_listing_id), r]));
const beforeUnique = before.filter(isUnique).length;
const eligible = [];
let missingCurrent = 0;
let alreadyResolved = 0;
for (const resolution of resolved) {
  const row = byId.get(String(resolution.id));
  if (!row) { missingCurrent += 1; continue; }
  if (!isUnknown(row)) { alreadyResolved += 1; continue; }
  eligible.push({ row, resolution });
}
const expectedAfterUnique = beforeUnique + eligible.length;

const concurrency = 12;
for (let i = 0; i < eligible.length; i += concurrency) {
  await Promise.all(eligible.slice(i, i + concurrency).map((t) => patchOne(t.row, t.resolution)));
}

const after = await getAllCurrent();
const afterUnique = after.filter(isUnique).length;
const report = {
  success: afterUnique === expectedAfterUnique,
  certifiedResolvedCount: resolved.length,
  beforeUnique,
  eligibleCount: eligible.length,
  missingCurrent,
  alreadyResolved,
  expectedAfterUnique,
  finalPriceUniqueCount: afterUnique,
  finalCoveragePct: Number((afterUnique / 18445 * 100).toFixed(2)),
};
await fs.mkdir('artifacts/mubawab-price-resolver-v2-apply', { recursive: true });
await fs.writeFile('artifacts/mubawab-price-resolver-v2-apply/report.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!report.success) process.exitCode = 2;
