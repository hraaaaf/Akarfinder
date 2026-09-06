import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { conservativeUrlIdentity, decodeSitemapPayload, extractDeclaredSitemaps, parseSitemapXml } from '../data4/mass-source-onboarding-qualification';
import { classifyStructuralIdentity } from '../data4/high-capacity-structural-detail-qualification';

const OUT = '.tmp/candidate-lake-q1a-data49b-wayback-sitemap';
const CUTOFF = '20260810083248';
const EXPECTED: Record<string, {netNew:number; candidates:number}> = {
  'valfoncier.ma': {netNew:6194,candidates:709},
  'christiesrealestatemorocco.com': {netNew:1252,candidates:602},
  'immo-maroc.com': {netNew:1204,candidates:276},
  'agadirimmobilier.ma': {netNew:366,candidates:37},
  'proimmobilier.ma': {netNew:267,candidates:99},
  'capital-properties.ma': {netNew:844,candidates:603},
};
const ROBOTS: Record<string,string> = {
  'valfoncier.ma':'https://valfoncier.ma/robots.txt',
  'christiesrealestatemorocco.com':'https://www.christiesrealestatemorocco.com/robots.txt',
  'immo-maroc.com':'https://immo-maroc.com/robots.txt',
  'agadirimmobilier.ma':'https://agadirimmobilier.ma/robots.txt',
  'proimmobilier.ma':'https://proimmobilier.ma/robots.txt',
  'capital-properties.ma':'https://www.capital-properties.ma/robots.txt',
};

type Capture={timestamp:string;original:string;digest:string|null};
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));

async function get(url:string,binary=false):Promise<string|Uint8Array>{
  let last='';
  for(let n=1;n<=4;n++){
    try{
      const r=await fetch(url,{redirect:'follow',headers:{'user-agent':'AkarFinder-Q1A-archive-sitemap-replay/2.0'},signal:AbortSignal.timeout(45_000)});
      if(r.ok) return binary?new Uint8Array(await r.arrayBuffer()):await r.text();
      last=`HTTP ${r.status}: ${(await r.text()).slice(0,300)}`;
      if(r.status!==429&&r.status<500) throw new Error(last);
    }catch(e){last=e instanceof Error?e.message:String(e);}
    if(n<4) await sleep(1500*n);
  }
  throw new Error(last||'archive request failed');
}

async function latestBefore(raw:string):Promise<Capture|null>{
  const u=new URL('https://web.archive.org/cdx/search/cdx');
  u.searchParams.set('url',raw); u.searchParams.set('output','json');
  u.searchParams.set('fl','timestamp,original,digest'); u.searchParams.append('filter','statuscode:200');
  u.searchParams.set('to',CUTOFF); u.searchParams.set('limit','-10');
  const text=await get(u.toString()) as string;
  if(!text.trim()) return null;
  const rows=JSON.parse(text) as unknown[][];
  if(!Array.isArray(rows)||rows.length<2)return null;
  const h=rows[0].map(String), ti=h.indexOf('timestamp'), oi=h.indexOf('original'), di=h.indexOf('digest');
  const cs=rows.slice(1).map(r=>({timestamp:String(r[ti]??''),original:String(r[oi]??raw),digest:di>=0?String(r[di]??'')||null:null}))
    .filter(c=>/^\d{14}$/.test(c.timestamp)&&c.timestamp<=CUTOFF).sort((a,b)=>b.timestamp.localeCompare(a.timestamp));
  return cs[0]??null;
}
const replay=(c:Capture)=>`https://web.archive.org/web/${c.timestamp}id_/${c.original}`;
async function archivedText(c:Capture){return decodeSitemapPayload(await get(replay(c),true) as Uint8Array);}

async function source(domain:string){
  const errors:string[]=[]; const sitemapEvidence:any[]=[]; const urls=new Set<string>();
  let robotsCapture:Capture|null=null; let roots:string[]=[];
  try{
    robotsCapture=await latestBefore(ROBOTS[domain]);
    if(!robotsCapture) throw new Error('robots_capture_missing');
    roots=extractDeclaredSitemaps(domain,await archivedText(robotsCapture));
    if(!roots.length) throw new Error('robots_has_no_same_origin_https_sitemap');
    const q=[...roots], visited=new Set<string>();
    while(q.length){
      if(visited.size>=40) throw new Error('historical_source_request_budget_exceeded');
      const s=q.shift()!; if(visited.has(s))continue; visited.add(s);
      const c=await latestBefore(s);
      if(!c){sitemapEvidence.push({url:s,capture:null,error:'capture_missing'}); throw new Error(`sitemap_capture_missing:${s}`);}
      const p=parseSitemapXml(domain,await archivedText(c));
      sitemapEvidence.push({url:s,capture:c,archiveUrl:replay(c),kind:p.kind,locs:p.locs.length});
      if(p.kind==='unknown') throw new Error(`unknown_sitemap:${s}`);
      if(p.kind==='index'){for(const x of p.locs) if(!visited.has(x)&&!q.includes(x))q.push(x);}
      else for(const x of p.locs) urls.add(x);
    }
  }catch(e){errors.push(e instanceof Error?e.message:String(e));}

  const buckets=new Map<string,string[]>();
  for(const u of [...urls].sort()){
    const id=conservativeUrlIdentity(domain,u); if(!id)continue;
    const rows=buckets.get(id)??[]; rows.push(u); buckets.set(id,rows);
  }
  const unique=[...buckets.entries()].filter(([,rows])=>rows.length===1).sort(([a],[b])=>a.localeCompare(b));
  const collisionRows=[...buckets.values()].filter(r=>r.length>1).reduce((n,r)=>n+r.length,0);
  const classified=unique.map(([identity,rows])=>classifyStructuralIdentity(domain,identity,[...new Set(rows)].sort()));
  const candidates=classified.filter(r=>r.classification==='DETAIL_PATTERN_MATCH');
  const manifest=candidates.map(r=>({source_domain:domain,identity:r.identity,canonical_url:r.canonicalUrls[0]??''}));
  const digestLines=candidates.map(r=>`${r.identity}\t${r.canonicalUrls[0]??''}`);
  return {
    domain,robotsUrl:ROBOTS[domain],robotsCapture,robotsArchiveUrl:robotsCapture?replay(robotsCapture):null,roots,sitemapEvidence,
    archiveSitemapUrls:urls.size,uniqueSitemapIdentities:unique.length,collisionRows,
    candidateRows:candidates.length,candidateDigestSha256:sha(digestLines.join('\n')),
    expectedNetNewRows:EXPECTED[domain].netNew,expectedCandidateRows:EXPECTED[domain].candidates,
    exactCandidateCount:candidates.length===EXPECTED[domain].candidates,complete:errors.length===0,errors,manifest,
  };
}

async function main(){
  await fs.mkdir(OUT,{recursive:true});
  const results=[] as Awaited<ReturnType<typeof source>>[];
  for(const domain of Object.keys(ROBOTS)) results.push(await source(domain));
  const manifest=results.flatMap(r=>r.manifest).sort((a,b)=>a.source_domain.localeCompare(b.source_domain)||a.identity.localeCompare(b.identity));
  const manifestText=manifest.map(x=>JSON.stringify(x)).join('\n')+(manifest.length?'\n':'');
  const summary={
    schemaVersion:'Q1A_DATA49B_WAYBACK_ARCHIVED_SITEMAP_REPLAY_V2',historicalRun:31370449455,historicalObservedAt:'2026-08-10T08:32:48.268Z',
    historicalArtifact:9055869351,historicalArtifactSha256:'df4f38102877a5de29a7980dbb7e5b32a4110813d8af132fc48a46cf87126520',
    cutoff:CUTOFF,readOnly:true,databaseWrites:0,productionWrites:0,sourceSiteFetches:0,sourceContentFetches:0,detailPageFetches:0,
    archiveContentFetchesOnly:true,archiveRobotsAndSitemapsOnly:true,warcFetches:0,vercelDeployments:0,
    exactRegistryRobotsUrls:ROBOTS,results:results.map(({manifest,...r})=>r),candidateRows:manifest.length,manifestSha256:sha(manifestText),
    allArchiveReadsComplete:results.every(r=>r.complete),allCandidateCountsMatch:results.every(r=>r.exactCandidateCount),
    candidateCountVector:Object.fromEntries(results.map(r=>[r.domain,r.candidateRows])),
    certificationState:results.every(r=>r.complete&&r.exactCandidateCount)&&manifest.length===2326?'CANDIDATE_COUNT_VECTOR_MATCH_ARCHIVED_SITEMAP_REPLAY_NEEDS_IDENTITY_STABILITY_CROSSCHECK':'EVIDENCE_ONLY_NOT_CERTIFIED',
  };
  await fs.writeFile(path.join(OUT,'manifest.jsonl'),manifestText);
  await fs.writeFile(path.join(OUT,'summary.json'),JSON.stringify(summary,null,2)+'\n');
  console.log(JSON.stringify({certificationState:summary.certificationState,candidateRows:summary.candidateRows,manifestSha256:summary.manifestSha256,results:summary.results.map(r=>({domain:r.domain,robotsCapture:r.robotsCapture?.timestamp??null,archiveSitemapUrls:r.archiveSitemapUrls,unique:r.uniqueSitemapIdentities,candidates:r.candidateRows,expected:r.expectedCandidateRows,digest:r.candidateDigestSha256,complete:r.complete,errors:r.errors}))},null,2));
}
main().catch(e=>{console.error(e);process.exit(1)});
