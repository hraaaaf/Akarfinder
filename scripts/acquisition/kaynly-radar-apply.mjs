import fs from 'node:fs/promises';
import path from 'node:path';
import { buildManifest, diffAgainstExisting } from './kaynly-radar-ingestion.mjs';

const MAX_BATCH_SIZE = 100;

async function fetchExistingAvitoRows({ supabaseUrl, serviceRoleKey, fetchImpl = globalThis.fetch, pageSize = 1000 }) {
  const rows = [];
  const base = supabaseUrl.replace(/\/$/, '');
  for (let offset = 0; ; offset += pageSize) {
    const url = new URL(`${base}/rest/v1/discovery_candidates`);
    url.searchParams.set('select', 'provider,query_hash,canonical_url,source_url');
    url.searchParams.set('source_domain', 'eq.avito.ma');
    const response = await fetchImpl(url, {
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        range: `${offset}-${offset + pageSize - 1}`,
        'range-unit': 'items',
      },
    });
    if (!response.ok) throw new Error(`Supabase read failed: HTTP ${response.status}`);
    const batch = await response.json();
    if (!Array.isArray(batch)) throw new Error('Supabase read response was not an array');
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }
  return rows;
}

function assertGuard(env) {
  if (!['1', 'true', 'yes', 'on'].includes(String(env.KAYNLY_RADAR_INGESTION_ENABLED || '').toLowerCase())) {
    throw new Error('KAYNLY_RADAR_INGESTION_ENABLED must be true');
  }
  if (String(env.DATABASE_PROVIDER || '').toLowerCase() !== 'supabase') throw new Error('DATABASE_PROVIDER must be supabase');
  const allowed = new Set(String(env.THIRD_PARTY_DB_INGESTION_ALLOWED_HOSTS || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean));
  if (!allowed.has('avito.ma')) throw new Error('avito.ma must be allowlisted');
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase credentials are required');
}

async function insertBatch(batch, { supabaseUrl, serviceRoleKey, fetchImpl = globalThis.fetch }) {
  const url = new URL(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/discovery_candidates`);
  url.searchParams.set('on_conflict', 'provider,query_hash,canonical_url');
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      'content-type': 'application/json',
      prefer: 'resolution=ignore-duplicates,return=representation',
    },
    body: JSON.stringify(batch),
  });
  if (!response.ok) throw new Error(`Supabase insert failed: HTTP ${response.status} ${await response.text()}`);
  const inserted = await response.json();
  if (!Array.isArray(inserted)) throw new Error('Supabase insert response was not an array');
  return inserted;
}

export async function applyKaynlyRadar({ payload, env = process.env, batchSize = 100, fetchImpl = globalThis.fetch, evidenceDir = 'artifacts/avito-kaynly-apply' }) {
  assertGuard(env);
  if (batchSize < 1 || batchSize > MAX_BATCH_SIZE) throw new RangeError('batchSize must be 1..100');

  const manifest = buildManifest(payload);
  const beforeRows = await fetchExistingAvitoRows({ supabaseUrl: env.SUPABASE_URL, serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY, fetchImpl });
  const pre = diffAgainstExisting(manifest, beforeRows);

  await fs.mkdir(evidenceDir, { recursive: true });
  const rollback = {
    table: 'discovery_candidates',
    run: 'avito-kaynly-radar',
    note: 'Delete only these exact provider/query_hash/canonical_url identities if rollback is required.',
    identities: pre.novel.map((row) => ({ provider: row.provider, query_hash: row.query_hash, canonical_url: row.canonical_url, avito_id: row.metadata.avito_id })),
  };
  await fs.writeFile(path.join(evidenceDir, 'rollback-manifest.json'), JSON.stringify(rollback, null, 2));

  let insertedCount = 0;
  const insertedIds = [];
  for (let offset = 0; offset < pre.novel.length; offset += batchSize) {
    const batch = pre.novel.slice(offset, offset + batchSize);
    const inserted = await insertBatch(batch, { supabaseUrl: env.SUPABASE_URL, serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY, fetchImpl });
    insertedCount += inserted.length;
    for (const row of inserted) insertedIds.push(row?.metadata?.avito_id || null);
    console.log(JSON.stringify({ batch: Math.floor(offset / batchSize) + 1, offset, requested: batch.length, inserted: inserted.length, cumulativeInserted: insertedCount }));
  }

  const afterRows = await fetchExistingAvitoRows({ supabaseUrl: env.SUPABASE_URL, serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY, fetchImpl });
  const post = diffAgainstExisting(manifest, afterRows);
  const verified = post.novelCount === 0 && post.existingCount === manifest.acceptedCount && insertedCount === pre.novelCount;
  const report = {
    inputCount: manifest.inputCount,
    acceptedCount: manifest.acceptedCount,
    rejectedCount: manifest.rejectedCount,
    duplicateInputCount: manifest.duplicateInputCount,
    preExistingCount: pre.existingCount,
    preNovelCount: pre.novelCount,
    insertedCount,
    postExistingCount: post.existingCount,
    postNovelCount: post.novelCount,
    verified,
    batchSize,
    batchCount: Math.ceil(pre.novelCount / batchSize),
    rollbackIdentityCount: rollback.identities.length,
  };
  await fs.writeFile(path.join(evidenceDir, 'apply-report.json'), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(evidenceDir, 'inserted-avito-ids.json'), JSON.stringify(insertedIds.filter(Boolean), null, 2));
  if (!verified) throw new Error(`Post-write verification failed: ${JSON.stringify(report)}`);
  return report;
}

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error('Usage: node kaynly-radar-apply.mjs <records.json>');
  const payload = JSON.parse(await fs.readFile(file, 'utf8'));
  const report = await applyKaynlyRadar({ payload });
  console.log(JSON.stringify(report, null, 2));
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) await main();
