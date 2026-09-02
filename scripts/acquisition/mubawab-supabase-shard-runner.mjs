import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  enumerateMubawab,
  isRobotsSafeUrl,
  normalizeMubawabUrl,
  shardKind,
  shardRank,
} from './mubawab-exhaustive-enumerator.mjs';

export const DEFAULT_DB_PAGE_SIZE = 1000;
export const DEFAULT_MANIFEST_LIMIT = 50;

export function selectSafeShardManifest(rows) {
  const unique = new Map();
  for (const row of rows || []) {
    const normalized = normalizeMubawabUrl(row?.canonical_url || '');
    if (!normalized || !isRobotsSafeUrl(normalized) || !shardKind(normalized)) continue;
    unique.set(normalized, normalized);
  }
  return [...unique.values()].sort((a, b) => {
    const rankDiff = shardRank(b) - shardRank(a);
    return rankDiff || a.localeCompare(b);
  });
}

export async function loadMubawabShardManifestFromSupabase({
  supabaseUrl,
  serviceRoleKey,
  fetchImpl = globalThis.fetch,
  pageSize = DEFAULT_DB_PAGE_SIZE,
} = {}) {
  if (!supabaseUrl || !serviceRoleKey) throw new Error('Supabase read credentials are required');
  if (typeof fetchImpl !== 'function') throw new TypeError('fetchImpl must be a function');

  const base = supabaseUrl.replace(/\/$/, '');
  const rows = [];
  for (let offset = 0; ; offset += pageSize) {
    const url = new URL(`${base}/rest/v1/discovery_candidates`);
    url.searchParams.set('select', 'canonical_url');
    url.searchParams.set('source_domain', 'eq.mubawab.ma');
    url.searchParams.set('order', 'id.asc');
    const response = await fetchImpl(url, {
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        range: `${offset}-${offset + pageSize - 1}`,
        'range-unit': 'items',
      },
    });
    if (!response.ok) throw new Error(`Supabase manifest read failed: HTTP ${response.status}`);
    const batch = await response.json();
    if (!Array.isArray(batch)) throw new Error('Supabase manifest response was not an array');
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }
  return {
    zeroDbWrites: true,
    sourceRowCount: rows.length,
    shardUrls: selectSafeShardManifest(rows),
  };
}

export async function runShardManifest({
  supabaseUrl,
  serviceRoleKey,
  fetchImpl = globalThis.fetch,
  manifestLimit = DEFAULT_MANIFEST_LIMIT,
  maxRequests = manifestLimit,
} = {}) {
  const manifest = await loadMubawabShardManifestFromSupabase({ supabaseUrl, serviceRoleKey, fetchImpl });
  const roots = manifest.shardUrls.slice(0, manifestLimit);
  const enumeration = await enumerateMubawab({
    roots,
    fetchImpl,
    maxRequests,
    maxDepth: 0,
  });
  return {
    ...enumeration,
    zeroDbWrites: true,
    sourceRowCount: manifest.sourceRowCount,
    safeShardCount: manifest.shardUrls.length,
    selectedShardCount: roots.length,
  };
}

export async function runCli() {
  const manifestLimit = Number.parseInt(process.env.MUBAWAB_MANIFEST_LIMIT || String(DEFAULT_MANIFEST_LIMIT), 10);
  const maxRequests = Number.parseInt(process.env.MUBAWAB_MAX_REQUESTS || String(manifestLimit), 10);
  const report = await runShardManifest({
    supabaseUrl: process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    manifestLimit,
    maxRequests,
  });
  report.startedAt = new Date().toISOString();
  report.success = report.zeroDbWrites
    && report.safeShardCount > 0
    && report.selectedShardCount > 0
    && report.requestCount > 0
    && report.stoppedEarly !== 'http_429';

  const outDir = 'artifacts/morocco-web-l8-mubawab-manifest';
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(outDir, 'listing-urls.txt'), `${report.listingUrls.join('\n')}\n`);
  await fs.writeFile(path.join(outDir, 'report.md'), [
    '# Morocco Web L8 — Mubawab Supabase Shard Manifest Replay',
    '',
    `- Success: **${report.success ? 'YES' : 'NO'}**`,
    `- Zero DB writes: **${report.zeroDbWrites}**`,
    `- Mubawab source rows read: **${report.sourceRowCount}**`,
    `- Robots-safe shard URLs: **${report.safeShardCount}**`,
    `- Selected shards: **${report.selectedShardCount}**`,
    `- HTTP requests: **${report.requestCount}**`,
    `- Unique listing URLs: **${report.uniqueListingUrlCount}**`,
    `- Early stop: **${report.stoppedEarly || 'none'}**`,
    '',
    '## Contract',
    '- Supabase access is read-only in this runner.',
    '- Only public robots-safe Mubawab shard URLs are fetched.',
    '- Deepest known shards are replayed first.',
    '- Listing URLs are deduplicated by Mubawab listing ID.',
    '- HTTP 429 stops enumeration immediately.',
  ].join('\n'));
  console.log(JSON.stringify({ ...report, listingUrls: undefined, shards: undefined }, null, 2));
  if (!report.success) process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await runCli();
