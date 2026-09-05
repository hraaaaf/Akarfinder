import fs from 'node:fs/promises';
import path from 'node:path';

const TYPE_MAP = new Map([
  ['appartements','apartment'],['terrains','land'],['villas-et-maisons-de-luxe','villa'],
  ['bureaux-et-commerces','office_commercial'],['locaux','commercial'],['maisons','house'],
  ['riads','riad'],['fermes','farm']
]);
const BATCH_SIZE = 250;

function parseRoute(raw) {
  const u = new URL(raw);
  const p = u.pathname.split('/').filter(Boolean);
  if (p[0] !== 'fr') return {};
  const kind = p[1];
  const out = { kind };
  let tail = '';
  if (kind === 'cc') tail = p[2] || '';
  else if (kind === 'ct') { out.city = p[2] || null; tail = p[3] || ''; }
  else if (kind === 'cd' || kind === 'sd') { out.city = p[2] || null; out.district = p[3] || null; tail = p[4] || ''; }
  else return out;
  if (tail.endsWith('-a-vendre') || tail === 'immobilier-a-vendre') out.transaction = 'sale';
  else if (tail.endsWith('-a-louer') || tail === 'immobilier-a-louer') out.transaction = 'rent';
  else if (tail.includes('vacational')) out.transaction = 'vacation';
  const typeSlug = tail.replace(/-a-vendre$|-a-louer$/,'');
  if (TYPE_MAP.has(typeSlug)) out.propertyType = TYPE_MAP.get(typeSlug);
  return out;
}

function add(set, value) { if (value) set.add(value); }
function classify(set) {
  const values = [...set].sort();
  if (values.length === 0) return { status: 'unknown' };
  if (values.length === 1) return { status: 'unique', value: values[0] };
  return { status: 'conflict', values };
}
function headers(key) {
  return { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' };
}
async function getAll(base, key) {
  const out = [];
  for (let offset = 0;; offset += 1000) {
    const r = await fetch(`${base}/rest/v1/mubawab_listing_corpus_v1?select=source_listing_id,evidence_status,metadata&limit=1000&offset=${offset}&evidence_status=eq.current_verified`, { headers: headers(key) });
    if (!r.ok) throw new Error(`corpus read failed ${r.status}: ${await r.text()}`);
    const batch = await r.json(); out.push(...batch); if (batch.length < 1000) break;
  }
  return out;
}
async function upsertBatch(base, key, rows) {
  const r = await fetch(`${base}/rest/v1/mubawab_listing_corpus_v1?on_conflict=source_listing_id`, {
    method: 'POST',
    headers: { ...headers(key), prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(rows)
  });
  if (!r.ok) throw new Error(`corpus upsert failed ${r.status}: ${await r.text()}`);
}

const reportFiles = (process.env.MUBAWAB_REPORT_FILES || '').split(',').map(v => v.trim()).filter(Boolean);
if (!reportFiles.length) throw new Error('MUBAWAB_REPORT_FILES is required');
const supabaseUrl = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !key) throw new Error('Supabase credentials are required');
const base = supabaseUrl.replace(/\/$/, '');

const byId = new Map();
let shardCount = 0;
for (const file of reportFiles) {
  const report = JSON.parse(await fs.readFile(file, 'utf8'));
  for (const shard of report.shards || []) {
    if (shard?.fetchState !== 'ok') continue;
    shardCount += 1;
    const route = parseRoute(shard.url);
    for (const rawId of shard.listingIds || []) {
      const id = String(rawId);
      if (!byId.has(id)) byId.set(id, { city:new Set(), district:new Set(), propertyType:new Set(), transaction:new Set() });
      const row = byId.get(id);
      add(row.city, route.city); add(row.district, route.district); add(row.propertyType, route.propertyType); add(row.transaction, route.transaction);
    }
  }
}
if (shardCount !== 3174 || byId.size !== 18445) throw new Error(`certified evidence mismatch shards=${shardCount} ids=${byId.size}`);

const corpus = await getAll(base, key);
if (corpus.length !== 18445) throw new Error(`current corpus mismatch ${corpus.length}`);
const now = new Date().toISOString();
const outputRows = corpus.map(row => {
  const evidence = byId.get(String(row.source_listing_id));
  if (!evidence) throw new Error(`missing route evidence for ${row.source_listing_id}`);
  return {
    source_listing_id: row.source_listing_id,
    metadata: {
      ...(row.metadata || {}),
      route_enrichment_v1: {
        version: 1,
        derived_at: now,
        source: 'certified_safe_shard_manifest',
        city: classify(evidence.city),
        transaction: classify(evidence.transaction),
        property_type: classify(evidence.propertyType),
        district: classify(evidence.district)
      }
    },
    updated_at: now
  };
});

for (let i = 0; i < outputRows.length; i += BATCH_SIZE) {
  await upsertBatch(base, key, outputRows.slice(i, i + BATCH_SIZE));
}

const verify = await getAll(base, key);
let enriched = 0;
const counts = { city:{unique:0,conflict:0,unknown:0}, transaction:{unique:0,conflict:0,unknown:0}, property_type:{unique:0,conflict:0,unknown:0}, district:{unique:0,conflict:0,unknown:0} };
for (const row of verify) {
  const e = row.metadata?.route_enrichment_v1;
  if (!e) continue;
  enriched += 1;
  for (const field of Object.keys(counts)) counts[field][e[field]?.status || 'unknown'] += 1;
}
const report = { success: enriched === 18445, currentCorpusCount: verify.length, enrichedCount: enriched, shardCount, counts, batchSize: BATCH_SIZE };
const dir = 'artifacts/mubawab-corpus-route-enrichment-apply';
await fs.mkdir(dir, { recursive: true });
await fs.writeFile(path.join(dir, 'report.json'), JSON.stringify(report, null, 2));
await fs.writeFile(path.join(dir, 'report.md'), [
  '# Mubawab corpus-wide route enrichment apply','',
  `- Success: **${report.success ? 'YES' : 'NO'}**`,
  `- Current corpus enriched: **${enriched}/18445**`,
  `- City unique: **${counts.city.unique}**`,
  `- Transaction unique: **${counts.transaction.unique}**`,
  `- Property type unique: **${counts.property_type.unique}**`,
  `- District unique: **${counts.district.unique}**`
].join('\n'));
console.log(JSON.stringify(report, null, 2));
if (!report.success) process.exitCode = 2;
