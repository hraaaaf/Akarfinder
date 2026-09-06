import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { conservativeUrlIdentity } from '../data4/mass-source-onboarding-qualification';
import { classifyStructuralIdentity, DATA_4_9B_SOURCES } from '../data4/high-capacity-structural-detail-qualification';

const OUT = process.env.Q1A_DATA49B_TEMPORAL_OUT ?? '.tmp/candidate-lake-q1a-data49b-wayback-temporal';
const EXPECTED: Record<string, number> = {
  'valfoncier.ma': 709,
  'christiesrealestatemorocco.com': 602,
  'immo-maroc.com': 276,
  'agadirimmobilier.ma': 37,
  'proimmobilier.ma': 99,
  'capital-properties.ma': 603,
};
const WINDOWS = [
  { label: 'day', from: '20260810', to: '20260810' },
  { label: 'plusminus1d', from: '20260809', to: '20260811' },
  { label: 'plusminus7d', from: '20260803', to: '20260817' },
  { label: 'august', from: '20260801', to: '20260831' },
] as const;
const sha256 = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex');
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function request(url: URL): Promise<string> {
  let last = '';
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { 'user-agent': 'AkarFinder-Q1A-DATA49B-temporal-CDX/1.0 metadata-only' }, signal: AbortSignal.timeout(45_000) });
      const body = await response.text();
      if (response.ok) return body;
      last = `HTTP ${response.status}: ${body.slice(0, 300)}`;
      if (response.status !== 429 && response.status < 500) throw new Error(last);
    } catch (error) {
      last = error instanceof Error ? error.message : String(error);
    }
    if (attempt < 4) await sleep(1000 * attempt);
  }
  throw new Error(last || 'CDX request failed');
}

async function query(pattern: string, from: string, to: string): Promise<string[]> {
  const u = new URL('https://web.archive.org/cdx/search/cdx');
  u.searchParams.set('url', pattern);
  u.searchParams.set('output', 'json');
  u.searchParams.set('fl', 'original');
  u.searchParams.append('filter', 'statuscode:200');
  u.searchParams.set('collapse', 'urlkey');
  u.searchParams.set('from', from);
  u.searchParams.set('to', to);
  const text = await request(u);
  if (!text.trim()) return [];
  const rows = JSON.parse(text) as unknown[][];
  if (!Array.isArray(rows) || rows.length < 2) return [];
  const header = rows[0].map(String), oi = header.indexOf('original');
  if (oi < 0) throw new Error('original column missing');
  return [...new Set(rows.slice(1).map((r) => r?.[oi]).filter((v): v is string => typeof v === 'string' && !!v))];
}

async function main(): Promise<void> {
  await fs.mkdir(OUT, { recursive: true });
  const results: any[] = [];
  for (const window of WINDOWS) {
    const manifest: Array<{source_domain:string;identity:string;canonical_url:string}> = [];
    const domains: any[] = [];
    for (const domain of DATA_4_9B_SOURCES) {
      const raw = new Set<string>();
      const errors: string[] = [];
      for (const pattern of [`${domain}/*`, `www.${domain}/*`]) {
        try { for (const url of await query(pattern, window.from, window.to)) raw.add(url); }
        catch (error) { errors.push(`${pattern}: ${error instanceof Error ? error.message : String(error)}`); }
      }
      const buckets = new Map<string,string[]>();
      for (const url of raw) {
        const id = conservativeUrlIdentity(domain, url); if (!id) continue;
        const rows = buckets.get(id) ?? []; rows.push(url); buckets.set(id, rows);
      }
      const candidates = [...buckets.entries()].sort(([a],[b])=>a.localeCompare(b))
        .map(([identity,urls])=>classifyStructuralIdentity(domain, identity, [...new Set(urls)].sort()))
        .filter((row)=>row.classification==='DETAIL_PATTERN_MATCH');
      const lines = candidates.map((row)=>`${row.identity}\t${row.canonicalUrls[0] ?? ''}`);
      for (const row of candidates) manifest.push({source_domain:domain,identity:row.identity,canonical_url:row.canonicalUrls[0] ?? ''});
      domains.push({domain,queryComplete:errors.length===0,errors,rawUrls:raw.size,identityRows:buckets.size,candidateRows:candidates.length,expected:EXPECTED[domain],exactCountMatch:errors.length===0&&candidates.length===EXPECTED[domain],candidateDigestSha256:sha256(lines.join('\n'))});
    }
    manifest.sort((a,b)=>a.source_domain.localeCompare(b.source_domain)||a.identity.localeCompare(b.identity));
    const text=manifest.map((r)=>JSON.stringify(r)).join('\n')+(manifest.length?'\n':'');
    await fs.writeFile(path.join(OUT,`${window.label}.manifest.jsonl`),text);
    results.push({window,...window,domains,total:manifest.length,expectedTotal:2326,allPerSourceCountsMatch:domains.every((d)=>d.exactCountMatch),manifestSha256:sha256(text)});
  }
  const summary={schemaVersion:'Q1A_DATA49B_WAYBACK_TEMPORAL_CDX_V1',historicalObservedAt:'2026-08-10T08:32:48.268Z',historicalRun:31370449455,readOnly:true,databaseWrites:0,productionWrites:0,sourceSiteFetches:0,sourceContentFetches:0,archiveContentFetches:0,warcFetches:0,waybackCdxUrlIndexRequestsOnly:true,vercelDeployments:0,results,certificationRule:'Temporal CDX is evidence-only. Counts alone never certify. Exact identity recovery still requires independent set/hash stability evidence.'};
  await fs.writeFile(path.join(OUT,'summary.json'),JSON.stringify(summary,null,2)+'\n');
  console.log(JSON.stringify(results.map(r=>({window:r.window,total:r.total,allPerSourceCountsMatch:r.allPerSourceCountsMatch,manifestSha256:r.manifestSha256,domains:r.domains.map((d:any)=>({domain:d.domain,candidates:d.candidateRows,expected:d.expected,digest:d.candidateDigestSha256,complete:d.queryComplete}))})),null,2));
}
main().catch((e)=>{console.error(e);process.exit(1)});
