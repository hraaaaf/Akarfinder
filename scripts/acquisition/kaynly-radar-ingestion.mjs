import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

export const PROVIDER = 'kaynly';
export const DEFAULT_BATCH_SIZE = 100;
export const MAX_BATCH_SIZE = 100;
const AVITO_HOSTS = new Set(['avito.ma', 'www.avito.ma']);
const ID_RE = /_(\d{7,9})\.htm$/i;

export function avitoIdFromUrl(raw) {
  try {
    const url = new URL(String(raw || ''));
    if (url.protocol !== 'https:' || !AVITO_HOSTS.has(url.hostname)) return null;
    const match = url.pathname.match(ID_RE);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

export function normalizeAvitoListingUrl(raw) {
  const id = avitoIdFromUrl(raw);
  if (!id) return null;
  const url = new URL(raw);
  url.protocol = 'https:';
  url.hostname = 'avito.ma';
  url.port = '';
  url.search = '';
  url.hash = '';
  return url.href;
}

function hash(provider, query) {
  return crypto.createHash('sha256').update(`${provider.toLowerCase()}\n${query}`).digest('hex');
}

function uniq(values) {
  return [...new Set(values.filter(Boolean))];
}

export function candidateFromKaynlyRecord(record) {
  const legacyUrls = Array.isArray(record?.urls) ? record.urls : [];
  const urls = uniq([record?.avito_url, ...legacyUrls]);
  const normalized = urls.map(normalizeAvitoListingUrl).filter(Boolean);
  const id = String(record?.source_id || record?.avitoId || avitoIdFromUrl(normalized[0]) || '').trim();
  if (!id || !normalized.length || !normalized.some((url) => avitoIdFromUrl(url) === id)) return null;

  const canonicalUrl = normalized.find((url) => avitoIdFromUrl(url) === id);
  const discoveries = Array.isArray(record?.discoveries) ? record.discoveries : [];
  const transactions = uniq([record?.transaction, ...discoveries.map((item) => item?.transaction)]);
  const cities = uniq([record?.city_slug, ...discoveries.map((item) => item?.city)]);
  const pages = uniq([...(Array.isArray(record?.control_pages) ? record.control_pages : []), ...discoveries.map((item) => item?.page)]);
  const sourceKinds = uniq([record?.discovered_via, ...discoveries.map((item) => item?.source)]);
  const discoveryQuery = `avito-kaynly-radar:${id}`;

  return {
    provider: PROVIDER,
    discovery_query: discoveryQuery,
    query_hash: hash(PROVIDER, discoveryQuery),
    result_rank: null,
    source_domain: 'avito.ma',
    source_url: canonicalUrl,
    canonical_url: canonicalUrl,
    title: null,
    snippet: null,
    discovery_status: 'discovered',
    compliance_status: null,
    content_fingerprint: null,
    metadata: {
      ingestion_run_id: 'avito-kaynly-radar',
      discovery_surface: 'kaynly-public-seo-lattice',
      avito_id: id,
      occurrences: Number(record?.occurrences || discoveries.length || pages.length || 1),
      first_observed_at: record?.first_observed_at || null,
      transactions,
      cities,
      kaynly_sources: sourceKinds,
      kaynly_pages: pages,
    },
  };
}

export function buildManifest(payload) {
  const records = Array.isArray(payload) ? payload : payload?.records;
  if (!Array.isArray(records)) throw new TypeError('Kaynly payload must contain a records array');

  const byId = new Map();
  let rejected = 0;
  for (const record of records) {
    const candidate = candidateFromKaynlyRecord(record);
    if (!candidate) {
      rejected += 1;
      continue;
    }
    const id = candidate.metadata.avito_id;
    if (!byId.has(id)) byId.set(id, candidate);
  }

  return {
    inputCount: records.length,
    acceptedCount: byId.size,
    rejectedCount: rejected,
    duplicateInputCount: records.length - rejected - byId.size,
    rows: [...byId.values()],
  };
}

export function existingAvitoIds(rows) {
  const ids = new Set();
  for (const row of rows || []) {
    const id = avitoIdFromUrl(row?.canonical_url || row?.source_url);
    if (id) ids.add(id);
  }
  return ids;
}

export function diffAgainstExisting(manifest, existingRows) {
  const existingIds = existingAvitoIds(existingRows);
  const novel = [];
  const duplicates = [];
  for (const row of manifest?.rows || []) {
    const id = row?.metadata?.avito_id || avitoIdFromUrl(row?.canonical_url);
    (existingIds.has(id) ? duplicates : novel).push(row);
  }
  return {
    discoveredCount: manifest?.acceptedCount || 0,
    existingCount: duplicates.length,
    novelCount: novel.length,
    novel,
    duplicates,
  };
}

async function fetchExistingAvitoRows({ supabaseUrl, serviceRoleKey, fetchImpl = globalThis.fetch, pageSize = 1000 }) {
  if (!supabaseUrl || !serviceRoleKey) throw new Error('Supabase credentials are required for DB preflight');
  const rows = [];
  const base = supabaseUrl.replace(/\/$/, '');
  for (let offset = 0; ; offset += pageSize) {
    const url = new URL(`${base}/rest/v1/discovery_candidates`);
    url.searchParams.set('select', 'canonical_url,source_url');
    url.searchParams.set('source_domain', 'eq.avito.ma');
    const response = await fetchImpl(url, {
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        range: `${offset}-${offset + pageSize - 1}`,
        'range-unit': 'items',
      },
    });
    if (!response.ok) throw new Error(`Supabase preflight failed: HTTP ${response.status}`);
    const batch = await response.json();
    if (!Array.isArray(batch)) throw new Error('Supabase preflight response was not an array');
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }
  return rows;
}

function assertApplyGuard(env = process.env) {
  if (!['1', 'true', 'yes', 'on'].includes(String(env.KAYNLY_RADAR_INGESTION_ENABLED || '').toLowerCase())) {
    throw new Error('KAYNLY_RADAR_INGESTION_ENABLED must be true');
  }
  if (String(env.DATABASE_PROVIDER || '').toLowerCase() !== 'supabase') {
    throw new Error('DATABASE_PROVIDER must be supabase');
  }
  const hosts = new Set(String(env.THIRD_PARTY_DB_INGESTION_ALLOWED_HOSTS || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean));
  if (!hosts.has('avito.ma')) throw new Error('avito.ma must be present in THIRD_PARTY_DB_INGESTION_ALLOWED_HOSTS');
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase credentials are required');
}

async function insertNovelRows(rows, { supabaseUrl, serviceRoleKey, batchSize = DEFAULT_BATCH_SIZE, fetchImpl = globalThis.fetch }) {
  if (batchSize < 1 || batchSize > MAX_BATCH_SIZE) throw new RangeError(`batchSize must be 1..${MAX_BATCH_SIZE}`);
  const base = supabaseUrl.replace(/\/$/, '');
  let insertedCount = 0;
  for (let offset = 0; offset < rows.length; offset += batchSize) {
    const batch = rows.slice(offset, offset + batchSize);
    const url = new URL(`${base}/rest/v1/discovery_candidates`);
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
    if (!response.ok) throw new Error(`Supabase insert failed at offset ${offset}: HTTP ${response.status} ${await response.text()}`);
    const inserted = await response.json();
    if (!Array.isArray(inserted)) throw new Error('Supabase insert response was not an array');
    insertedCount += inserted.length;
  }
  return insertedCount;
}

export async function runIngestion({ payload, env = process.env, apply = false, fetchImpl = globalThis.fetch, batchSize = DEFAULT_BATCH_SIZE }) {
  const manifest = buildManifest(payload);
  const existingRows = await fetchExistingAvitoRows({
    supabaseUrl: env.SUPABASE_URL,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    fetchImpl,
  });
  const diff = diffAgainstExisting(manifest, existingRows);
  const report = {
    inputCount: manifest.inputCount,
    acceptedCount: manifest.acceptedCount,
    rejectedCount: manifest.rejectedCount,
    duplicateInputCount: manifest.duplicateInputCount,
    existingCount: diff.existingCount,
    novelCount: diff.novelCount,
    insertedCount: 0,
    zeroDbWrites: true,
    mode: apply ? 'apply' : 'dry-run',
  };
  if (!apply) return report;

  assertApplyGuard(env);
  report.insertedCount = await insertNovelRows(diff.novel, {
    supabaseUrl: env.SUPABASE_URL,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    batchSize,
    fetchImpl,
  });
  report.zeroDbWrites = report.insertedCount === 0;
  return report;
}

export async function runCli() {
  const args = new Set(process.argv.slice(2));
  const fileArg = process.argv.slice(2).find((arg) => !arg.startsWith('--'));
  if (!fileArg) throw new Error('Usage: node kaynly-radar-ingestion.mjs <records.json> [--apply]');
  const payload = JSON.parse(await fs.readFile(fileArg, 'utf8'));
  const report = await runIngestion({ payload, apply: args.has('--apply') });
  console.log(JSON.stringify(report, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runCli();
}
