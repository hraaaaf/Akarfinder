#!/usr/bin/env node
// FeenWay N01: reconcile URL-only discoveries across snapshots. Offline/read-only.
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const sha256 = value => createHash('sha256').update(value).digest('hex');
export function validListing(raw) {
  if (typeof raw !== 'string') return false;
  try {
    const u = new URL(raw);
    return u.href === raw && u.origin === 'https://www.feenway.com' &&
      /^\/listings\/[1-9]\d{0,11}$/.test(u.pathname) && !u.search && !u.hash;
  } catch { return false; }
}
export function decodeJsonl(source) {
  if (typeof source !== 'string') throw Error('jsonl_not_text');
  return source.split('\n').filter(line => line.trim()).map((line, index) => {
    try { return JSON.parse(line); } catch { throw Error('bad_jsonl_line_' + (index + 1)); }
  });
}
export function reconcile({sitemapRows, priorRows, batches}) {
  const sitemap = new Set();
  for (const row of sitemapRows) {
    if (!validListing(row.url) || sitemap.has(row.url)) throw Error('invalid_or_duplicate_sitemap_url');
    sitemap.add(row.url);
  }
  if (!sitemap.size) throw Error('empty_sitemap');
  const provenance = new Map();
  const validateSources = row => {
    const source = row.landing_pages ?? row.discovered_on ?? [];
    if (!Array.isArray(source) || !source.length || source.some(v => {
      if (typeof v !== 'string') return true;
      try {const u = new URL(v);return u.origin !== 'https://www.feenway.com' || u.href !== v;} catch {return true;}
    })) throw Error('missing_or_invalid_provenance');
    return source;
  };
  const mergeRow = row => {
    if (!validListing(row.url)) throw Error('invalid_listing_url');
    const sources = validateSources(row);
    if (!provenance.has(row.url)) provenance.set(row.url, new Set());
    sources.forEach(s => provenance.get(row.url).add(s));
  };
  for (const row of priorRows) mergeRow(row);
  const prior = new Set(priorRows.map(row => row.url));
  if (prior.size !== priorRows.length) throw Error('duplicate_previous_manifest_url');
  const batchDetails = [];
  const newlyObserved = new Set();
  for (const {report, rows, rawBytes} of batches) {
    if (!report.complete || report.errors?.length || report.pages_ok !== report.planned_pages || report.listing_detail_requests !== 0 || report.db_writes !== 0) {
      throw Error('unverified_or_incomplete_batch');
    }
    if (report.listing_manifest_size !== sitemap.size) throw Error('batch_sitemap_snapshot_mismatch');
    if (report.not_in_six_count !== rows.length) throw Error('batch_count_mismatch');
    if (sha256(rawBytes) !== report.outside_manifest_sha256) throw Error('batch_sha256_mismatch');
    const seen = new Set();
    for (const row of rows) {
      if (seen.has(row.url)) throw Error('duplicate_batch_url');
      seen.add(row.url);
      if (sitemap.has(row.url)) throw Error('batch_claims_off_sitemap_but_in_sitemap');
      mergeRow(row);
      newlyObserved.add(row.url);
    }
    batchDetails.push({batch_number: report.batch_number, pages_ok: report.pages_ok, observed_listing_links: report.unique_sample_listing_links, outside_sitemap: seen.size, outside_manifest_sha256: report.outside_manifest_sha256});
  }
  const off = [...provenance.keys()].filter(url => !sitemap.has(url)).sort();
  const lines = off.map(url => JSON.stringify({url,landing_pages: [...provenance.get(url)].sort(),status: 'discovered_unverified'})).join('\n') + '\n';
  const evidence = {
    schema: 'FEENWAY_N01_RECONCILIATION_V1',
    source: 'https://www.feenway.com',
    sitemap_urls: sitemap.size,
    prior_outside_sitemap_urls: prior.size,
    prior_now_in_sitemap: [...prior].filter(url => sitemap.has(url)).length,
    observed_in_batches_unique: newlyObserved.size,
    observed_in_batches_prior_overlap: [...newlyObserved].filter(url => prior.has(url)).length,
    new_off_sitemap_urls: [...newlyObserved].filter(url => !prior.has(url) && !sitemap.has(url)).length,
    off_sitemap_unique: off.length,
    discovered_urls_unique: sitemap.size + off.length,
    batches: batchDetails,
    merged_manifest_sha256: sha256(lines),
    certification: {urls_only: true,active: false,physical_uniqueness: false,reuse_rights: false},
    db_writes: 0,
    listing_detail_requests: 0
  };
  return {evidence,manifest:lines};
}
async function main() {
  const args = Object.fromEntries(process.argv.slice(2).filter(a => !a.startsWith('--batch=')).map(a => a.replace(/^--/, '').split(/=(.*)/s).slice(0,2)));
  const batches = process.argv.slice(2).filter(a => a.startsWith('--batch=')).map(a => a.slice('--batch='.length));
  if (!args.sitemap || !args.prior || !args.out || !batches.length) throw Error('usage: --sitemap=discovery.jsonl --prior=merged.jsonl --batch=dir (repeat) --out=directory');
  const sitemapRows = decodeJsonl(await readFile(args.sitemap, 'utf8'));
  const priorRows = decodeJsonl(await readFile(args.prior, 'utf8'));
  const inputs = await Promise.all(batches.map(async dir => {
    const [reportText,rawBytes] = await Promise.all([readFile(resolve(dir,'report.json'),'utf8'),readFile(resolve(dir,'report.jsonl'))]);
    return {report:JSON.parse(reportText),rows:decodeJsonl(rawBytes.toString('utf8')),rawBytes};
  }));
  const {evidence,manifest} = reconcile({sitemapRows,priorRows,batches:inputs});
  await mkdir(args.out, {recursive:true});
  await writeFile(resolve(args.out,'reconciliation.json'),JSON.stringify(evidence,null,2)+'\n');
  await writeFile(resolve(args.out,'off-sitemap-merged.jsonl'),manifest);
  console.log(JSON.stringify(evidence));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(e => {console.error('N01 reconciliation: '+e.message);process.exitCode=1;});
