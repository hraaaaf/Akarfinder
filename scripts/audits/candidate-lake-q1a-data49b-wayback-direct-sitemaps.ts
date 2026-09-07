import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { allowedHost, conservativeUrlIdentity, decodeSitemapPayload, parseSitemapXml } from '../data4/mass-source-onboarding-qualification';
import { classifyStructuralIdentity, DATA_4_9B_SOURCES } from '../data4/high-capacity-structural-detail-qualification';

type Domain = typeof DATA_4_9B_SOURCES[number];
const domain = process.env.Q1A_DATA49B_DOMAIN?.trim() as Domain | undefined;
if (!domain || !DATA_4_9B_SOURCES.includes(domain)) throw new Error(`Q1A_DATA49B_DOMAIN invalid: ${domain ?? ''}`);
const OUT = process.env.Q1A_DATA49B_WAYBACK_DIRECT_OUT ?? `.tmp/candidate-lake-q1a-data49b-wayback-direct-${domain.replaceAll('.', '-')}`;
const CUTOFF = '20260810083248';
const EXPECTED_RAW: Record<Domain, number> = {
  'valfoncier.ma': 6195, 'christiesrealestatemorocco.com': 1252, 'immo-maroc.com': 1204,
  'agadirimmobilier.ma': 366, 'proimmobilier.ma': 267, 'capital-properties.ma': 844,
};
const EXPECTED_CANDIDATES: Record<Domain, number> = {
  'valfoncier.ma': 709, 'christiesrealestatemorocco.com': 602, 'immo-maroc.com': 276,
  'agadirimmobilier.ma': 37, 'proimmobilier.ma': 99, 'capital-properties.ma': 603,
};
const ROOT_PATHS = ['/sitemap.xml','/sitemap_index.xml','/sitemap-index.xml','/wp-sitemap.xml','/sitemap.xml.gz','/sitemap_index.xml.gz'] as const;
type Capture = { timestamp: string; original: string; digest: string | null };
const sha256 = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex');
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchRetry(url: string, binary = false): Promise<string | Uint8Array> {
  let last = '';
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    try {
      const r = await fetch(url, { headers: { 'user-agent': 'AkarFinder-Q1A-DATA49B/direct-archived-sitemap-only' }, redirect: 'follow', signal: AbortSignal.timeout(60_000) });
      if (r.ok) return binary ? new Uint8Array(await r.arrayBuffer()) : await r.text();
      last = `HTTP ${r.status}: ${(await r.text()).slice(0,300)}`;
      if (r.status !== 429 && r.status < 500) throw new Error(last);
    } catch (e) {
      last = e instanceof Error ? e.message : String(e);
      if (attempt === 6) throw new Error(last);
    }
    await sleep(Math.min(12_000, 800 * 2 ** (attempt - 1)));
  }
  throw new Error(last || 'archive fetch failed');
}

async function latestCapture(rawUrl: string): Promise<Capture | null> {
  const u = new URL('https://web.archive.org/cdx/search/cdx');
  u.searchParams.set('url', rawUrl); u.searchParams.set('output','json'); u.searchParams.set('fl','timestamp,original,digest');
  u.searchParams.append('filter','statuscode:200'); u.searchParams.set('to',CUTOFF); u.searchParams.set('limit','-20');
  const text = await fetchRetry(u.toString()) as string;
  if (!text.trim()) return null;
  let rows: unknown;
  try { rows = JSON.parse(text); } catch { return null; }
  if (!Array.isArray(rows) || rows.length < 2) return null;
  const table = rows as unknown[][]; const header = table[0].map(String);
  const ti=header.indexOf('timestamp'), oi=header.indexOf('original'), di=header.indexOf('digest');
  if (ti < 0 || oi < 0) return null;
  return table.slice(1).map(r=>({timestamp:String(r[ti]??''),original:String(r[oi]??rawUrl),digest:di>=0?String(r[di]??'')||null:null}))
    .filter(c=>/^\d{14}$/.test(c.timestamp)&&c.timestamp<=CUTOFF).sort((a,b)=>b.timestamp.localeCompare(a.timestamp))[0] ?? null;
}

const replayUrl = (c: Capture) => `https://web.archive.org/web/${c.timestamp}id_/${c.original}`;
async function archivedText(c: Capture): Promise<string> { return decodeSitemapPayload(await fetchRetry(replayUrl(c), true) as Uint8Array); }

async function replayRoot(root: string) {
  const raw = new Set<string>(); const visited = new Set<string>(); const nodes: Array<Record<string,unknown>> = []; const errors: string[] = [];
  const rootCapture = await latestCapture(root);
  if (!rootCapture) return { root, rootCapture: null, raw, visited, nodes, errors: ['no_root_capture_before_cutoff'] };
  const queue: Array<{url:string,capture?:Capture}> = [{url:root,capture:rootCapture}];
  try {
    while (queue.length) {
      if (visited.size >= 40) throw new Error('archived_sitemap_request_budget_exceeded');
      const item = queue.shift()!; if (visited.has(item.url)) continue; visited.add(item.url);
      if (!item.url.startsWith('https://') || !allowedHost(domain, new URL(item.url).hostname)) throw new Error(`disallowed_sitemap:${item.url}`);
      const capture = item.capture ?? await latestCapture(item.url);
      if (!capture) { nodes.push({url:item.url,capture:null,error:'no_capture_before_cutoff'}); throw new Error(`missing_capture:${item.url}`); }
      const xml = await archivedText(capture); const parsed = parseSitemapXml(domain, xml);
      nodes.push({url:item.url,capture,archiveUrl:replayUrl(capture),kind:parsed.kind,locCount:parsed.locs.length});
      if (parsed.kind === 'unknown') throw new Error(`unknown_sitemap:${item.url}`);
      if (parsed.kind === 'index') for (const child of parsed.locs) if (!visited.has(child)) queue.push({url:child});
      else for (const url of parsed.locs) { raw.add(url); if (raw.size >= 100_000) throw new Error('archived_url_budget_exceeded'); }
    }
  } catch (e) { errors.push(e instanceof Error ? e.message : String(e)); }
  return { root, rootCapture, raw, visited, nodes, errors };
}

function classify(raw: Set<string>) {
  const buckets = new Map<string,string[]>();
  for (const rawUrl of raw) { const id=conservativeUrlIdentity(domain,rawUrl); if(!id) continue; const rows=buckets.get(id)??[]; rows.push(rawUrl); buckets.set(id,rows); }
  const candidates=[...buckets.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([identity,urls])=>classifyStructuralIdentity(domain,identity,[...new Set(urls)].sort())).filter(r=>r.classification==='DETAIL_PATTERN_MATCH');
  return {buckets,candidates};
}

async function main() {
  await fs.mkdir(OUT,{recursive:true});
  const rootUrls=[...new Set(ROOT_PATHS.flatMap(p=>[`https://${domain}${p}`,`https://www.${domain}${p}`]))];
  const attempts: Array<Record<string,unknown>>=[]; const exactManifests: Array<{root:string,text:string,sha:string,rows:number}>=[];
  for (const root of rootUrls) {
    let replay;
    try { replay=await replayRoot(root); } catch(e) { attempts.push({root,complete:false,errors:[e instanceof Error?e.message:String(e)]}); continue; }
    const {buckets,candidates}=classify(replay.raw);
    const lines=candidates.map(r=>`${r.identity}\t${r.canonicalUrls[0]??''}`);
    const text=candidates.map(r=>JSON.stringify({source_domain:domain,identity:r.identity,canonical_url:r.canonicalUrls[0]??'',archive_root:root})).join('\n')+(candidates.length?'\n':'');
    const complete=replay.errors.length===0;
    const rawExact=buckets.size===EXPECTED_RAW[domain]; const candidateExact=candidates.length===EXPECTED_CANDIDATES[domain];
    if (complete&&rawExact&&candidateExact) exactManifests.push({root,text,sha:sha256(text),rows:candidates.length});
    attempts.push({root,rootCapture:replay.rootCapture,complete,errors:replay.errors,visitedSitemapCount:replay.visited.size,rawUrls:replay.raw.size,rawIdentityRows:buckets.size,expectedRawRows:EXPECTED_RAW[domain],rawExact,candidateRows:candidates.length,expectedCandidateRows:EXPECTED_CANDIDATES[domain],candidateExact,candidateDigestSha256:sha256(lines.join('\n')),nodes:replay.nodes});
  }
  const uniqueExactHashes=[...new Set(exactManifests.map(x=>x.sha))];
  const selected=uniqueExactHashes.length===1?exactManifests.find(x=>x.sha===uniqueExactHashes[0])??null:null;
  if(selected) await fs.writeFile(path.join(OUT,'manifest.jsonl'),selected.text,'utf8');
  const summary={schemaVersion:'Q1A_DATA49B_WAYBACK_DIRECT_SITEMAP_REPLAY_V1',domain,cutoff:CUTOFF,historicalRun:31370449455,historicalArtifact:9055869351,historicalArtifactSha256:'df4f38102877a5de29a7980dbb7e5b32a4110813d8af132fc48a46cf87126520',expectedRawRows:EXPECTED_RAW[domain],expectedCandidateRows:EXPECTED_CANDIDATES[domain],readOnly:true,databaseWrites:0,productionWrites:0,sourceSiteFetches:0,sourceContentFetches:0,detailPageFetches:0,archiveContentFetchesOnly:true,archiveSitemapsOnly:true,warcFetches:0,vercelDeployments:0,attempts,exactAttemptCount:exactManifests.length,uniqueExactManifestHashes:uniqueExactHashes,selectedExactManifest:selected?{root:selected.root,rows:selected.rows,sha256:selected.sha}:null,certificationState:selected?'ARCHIVE_RECONSTRUCTION_EXACT_COUNTS_UNIQUE_MANIFEST':'EVIDENCE_ONLY_NOT_CERTIFIED'};
  await fs.writeFile(path.join(OUT,'summary.json'),JSON.stringify(summary,null,2)+'\n','utf8');
  console.log(JSON.stringify({domain,exactAttemptCount:summary.exactAttemptCount,uniqueExactManifestHashes:summary.uniqueExactManifestHashes,selectedExactManifest:summary.selectedExactManifest,best:attempts.map(a=>({root:a.root,complete:a.complete,raw:a.rawIdentityRows,candidates:a.candidateRows,rawExact:a.rawExact,candidateExact:a.candidateExact,errors:a.errors}))},null,2));
}
main().catch(e=>{console.error(e);process.exit(1)});
