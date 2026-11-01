// Partner feed READINESS shadow audit. No DB, network, publishing or partner authorization.
import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { parseCsvFeed, parseJsonFeed, parseXmlFeed } from '../../../lib/feeds/parsers.js';
import { stageFeed } from '../../../lib/feeds/staging.js';
import type { RawFeedRow } from '../../../lib/feeds/schema.js';

export const MAX_FEED_BYTES = 20 * 1024 * 1024;
export const SOURCE_UPDATE_WINDOW_MS = 72 * 60 * 60 * 1000;
export type ShadowMetrics = {
  total_input_rows: number;
  staged_rows: number;
  rejected_rows: number;
  duplicate_rows: number;
  source_timestamp_recent_candidates: number;
  source_timestamp_missing_or_stale: number;
  active_status_verified: 0;
  source_rights_verified: 0;
  ready_for_use: 0;
  publication_eligible: false;
  reason: string;
};

export function auditRows(rows: RawFeedRow[], now = new Date()): ShadowMetrics {
  const result = stageFeed(rows);
  const candidates = result.staged.filter((entry) =>
    entry.action === 'create' || entry.action === 'update');
  let recent = 0;
  for (const item of candidates) {
    const raw = item.row.updated_at_source;
    if (!raw) continue;
    const date = Date.parse(raw);
    if (Number.isFinite(date) && date <= now.getTime() &&
        now.getTime() - date <= SOURCE_UPDATE_WINDOW_MS) recent += 1;
  }
  return {
    total_input_rows: result.total_input_rows,
    staged_rows: result.staged_rows,
    rejected_rows: result.rejected_rows.length,
    duplicate_rows: result.duplicate_count,
    source_timestamp_recent_candidates: recent,
    source_timestamp_missing_or_stale: candidates.length - recent,
    active_status_verified: 0,
    source_rights_verified: 0,
    ready_for_use: 0,
    publication_eligible: false,
    reason: 'Un feed ou un updated_at seul ne prouve ni disponibilite ni droits de diffusion. Accord ecrit et statut actif verifie indispensables.',
  };
}

export async function auditFile(file: string, now = new Date()) {
  const info = await stat(file);
  if (info.size > MAX_FEED_BYTES || info.size < 1) {
    throw new Error('Partner feed file must be non-empty and <= 20 MiB');
  }
  const content = await readFile(file, 'utf8');
  const ext = file.split('.').pop()?.toLowerCase();
  const rows = ext === 'csv' ? parseCsvFeed(content)
    : ext === 'json' ? parseJsonFeed(content)
    : ext === 'xml' ? parseXmlFeed(content)
    : null;
  if (!rows) throw new Error('Unsupported partner feed extension: ' + ext);
  return {
    format: ext,
    input_sha256: createHash('sha256').update(content).digest('hex'),
    ...auditRows(rows, now),
  };
}

async function main() {
  const fixtures = [
    'data/imports/fixtures/agency-feed.csv',
    'data/imports/fixtures/promoter-feed.json',
    'data/imports/fixtures/agency-feed-update.xml',
  ];
  const reports = [];
  for (const file of fixtures) reports.push({fixture: file, ...await auditFile(file)});
  const result = {
    mode: 'OFFLINE_FIXTURES_ONLY',
    real_partner_connected: false,
    live_inventory_obtained: 0,
    verified_ready_for_use: 0,
    production_writes: 0,
    generated_at_utc: new Date().toISOString(),
    feed_reports: reports,
  };
  await mkdir('artifacts/akar-200k-feed-readiness', {recursive:true});
  await writeFile('artifacts/akar-200k-feed-readiness/report.json', JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result));
}

if (process.argv[1]?.endsWith('audit.ts')) main().catch((e) => {
  console.error(e);
  process.exitCode = 2;
});
