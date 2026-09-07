import fs from 'node:fs/promises';
import path from 'node:path';
import { DATA_4_9B_SOURCES } from '../data4/high-capacity-structural-detail-qualification';
import { extractDeclaredSitemaps } from '../data4/mass-source-onboarding-qualification';

type Domain = typeof DATA_4_9B_SOURCES[number];
const domain = process.env.Q1A_DATA49B_DOMAIN?.trim() as Domain | undefined;
if (!domain || !DATA_4_9B_SOURCES.includes(domain)) throw new Error(`invalid domain ${domain ?? ''}`);
const OUT = process.env.Q1A_DATA49B_ROBOTS_OUT ?? `.tmp/candidate-lake-q1a-data49b-robots-${domain.replaceAll('.', '-')}`;
const CUTOFF='20260810083248';
const ROBOTS_HOST: Record<Domain,string>={
  'valfoncier.ma':'https://valfoncier.ma/robots.txt',
  'christiesrealestatemorocco.com':'https://www.christiesrealestatemorocco.com/robots.txt',
  'immo-maroc.com':'https://immo-maroc.com/robots.txt',
  'agadirimmobilier.ma':'https://agadirimmobilier.ma/robots.txt',
  'proimmobilier.ma':'https://proimmobilier.ma/robots.txt',
  'capital-properties.ma':'https://capital-properties.ma/robots.txt',
};
const TARGETS=['20260810080000','20260809000000','20260801000000','20260715000000','20260701000000','20260601000000','20260501000000'] as const;
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
async function getText(url:string):Promise<string>{
  let last='';
  for(let i=1;i<=4;i++){
    try{
      const r=await fetch(url,{headers:{'user-agent':'AkarFinder-Q1A-DATA49B-wayback-robots/1.0 archive-only'},redirect:'follow',signal:AbortSignal.timeout(30_000)});
      const body=await r.text(); if(r.ok)return body; last=`HTTP ${r.status}: ${body.slice(0,300)}`; if(r.status!==429&&r.status<500)throw new Error(last);
    }catch(e){last=e instanceof Error?e.message:String(e);if(i===4)throw new Error(last);} await sleep(Math.min(6000,750*2**(i-1)));
  } throw new Error(last||'request failed');
}
type Snapshot={available?:boolean,url?:string,timestamp?:string,status?:string};
async function availability(target:string):Promise<Snapshot|null>{
  const u=new URL('https://archive.org/wayback/available');u.searchParams.set('url',ROBOTS_HOST[domain]);u.searchParams.set('timestamp',target);
  try{const j=JSON.parse(await getText(u.toString())) as {archived_snapshots?:{closest?:Snapshot}};return j.archived_snapshots?.closest??null;}catch{return null;}
}
async function main(){
  await fs.mkdir(OUT,{recursive:true}); const observations:Array<Record<string,unknown>>=[]; const roots=new Set<string>();
  for(const target of TARGETS){
    const s=await availability(target); if(!s?.available||!s.timestamp||!s.url){observations.push({target,snapshot:null});continue;}
    const before=s.timestamp<=CUTOFF; let robotsText:string|null=null; let error:string|null=null; let declared:string[]=[];
    if(before){
      try{const replay=`https://web.archive.org/web/${s.timestamp}id_/${ROBOTS_HOST[domain]}`;robotsText=await getText(replay);declared=extractDeclaredSitemaps(domain,robotsText);for(const r of declared)roots.add(r);}catch(e){error=e instanceof Error?e.message:String(e);}
    }
    observations.push({target,snapshot:{timestamp:s.timestamp,url:s.url,status:s.status,beforeCutoff:before},declaredSitemaps:declared,error,robotsSha256:robotsText?await crypto.subtle.digest('SHA-256',new TextEncoder().encode(robotsText)).then(b=>Buffer.from(b).toString('hex')):null});
  }
  const summary={schemaVersion:'Q1A_DATA49B_WAYBACK_ROBOTS_AVAILABILITY_V1',domain,robotsUrl:ROBOTS_HOST[domain],cutoff:CUTOFF,readOnly:true,databaseWrites:0,productionWrites:0,sourceSiteFetches:0,sourceContentFetches:0,detailPageFetches:0,archiveContentFetchesOnly:true,warcFetches:0,vercelDeployments:0,observations,distinctDeclaredSitemapRoots:[...roots].sort()};
  await fs.writeFile(path.join(OUT,'summary.json'),JSON.stringify(summary,null,2)+'\n','utf8');await fs.writeFile(path.join(OUT,'roots.txt'),[...roots].sort().join('\n')+(roots.size?'\n':''),'utf8');
  console.log(JSON.stringify({domain,robotsUrl:summary.robotsUrl,distinctDeclaredSitemapRoots:summary.distinctDeclaredSitemapRoots,observations:observations.map(o=>({target:o.target,snapshot:o.snapshot,declaredSitemaps:o.declaredSitemaps,error:o.error}))},null,2));
}
main().catch(e=>{console.error(e);process.exit(1)});
