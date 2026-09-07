import fs from 'node:fs/promises';
import path from 'node:path';
import { DATA_4_9B_SOURCES } from '../data4/high-capacity-structural-detail-qualification';

type Domain = typeof DATA_4_9B_SOURCES[number];
const domain = process.env.Q1A_DATA49B_DOMAIN?.trim() as Domain | undefined;
if (!domain || !DATA_4_9B_SOURCES.includes(domain)) throw new Error(`Q1A_DATA49B_DOMAIN invalid: ${domain ?? ''}`);
const OUT = process.env.Q1A_DATA49B_ROOT_OUT ?? `.tmp/candidate-lake-q1a-data49b-root-${domain.replaceAll('.', '-')}`;
const INDEXES = ['CC-MAIN-2026-34','CC-MAIN-2026-30','CC-MAIN-2026-25','CC-MAIN-2026-21','CC-MAIN-2026-17','CC-MAIN-2026-12','CC-MAIN-2026-08','CC-MAIN-2026-04'] as const;
const CUTOFF = '20260810083248';
const sleep = (ms:number)=>new Promise(r=>setTimeout(r,ms));

async function requestText(url: URL): Promise<string> {
  let last='';
  for(let attempt=1;attempt<=4;attempt++){
    try{
      const r=await fetch(url,{headers:{'user-agent':'AkarFinder-Q1A-DATA49B-sitemap-root-discovery/1.0 metadata-only'},signal:AbortSignal.timeout(30_000)});
      const body=await r.text();
      if(r.ok) return body;
      if(r.status===404 && body.includes('No Captures found')) return '';
      last=`HTTP ${r.status}: ${body.slice(0,300)}`;
      if(r.status!==429 && r.status<500) throw new Error(last);
    }catch(e){ last=e instanceof Error?e.message:String(e); if(attempt===4) throw new Error(last); }
    await sleep(Math.min(6000,750*2**(attempt-1)));
  }
  throw new Error(last||'request failed');
}

async function query(index:string, pattern:string):Promise<string[]>{
  const base=`https://index.commoncrawl.org/${index}-index`;
  const params=new URLSearchParams({url:pattern,output:'json',fl:'url',filter:'status:200',collapse:'urlkey'});
  if(index==='CC-MAIN-2026-34') params.set('to',CUTOFF);
  const first=new URL(base); for(const [k,v] of params) first.searchParams.set(k,v); first.searchParams.set('showNumPages','true');
  const meta=await requestText(first); if(!meta.trim()) return [];
  let pages=1; try{const p=JSON.parse(meta);pages=Math.max(1,Number(p.pages??p.numPages??1));}catch{}
  const out=new Set<string>();
  for(let page=0;page<pages;page++){
    const u=new URL(base);for(const [k,v] of params)u.searchParams.set(k,v);if(pages>1)u.searchParams.set('page',String(page));
    const text=await requestText(u);
    for(const line of text.split('\n')){const t=line.trim();if(!t)continue;try{const row=JSON.parse(t) as {url?:string};if(row.url)out.add(row.url);}catch{}}
  }
  return [...out];
}

async function main(){
  await fs.mkdir(OUT,{recursive:true});
  const found=new Map<string,Set<string>>(); const errors:string[]=[];
  for(const index of INDEXES){
    const urls=new Set<string>();
    for(const pattern of [`${domain}/*sitemap*`,`www.${domain}/*sitemap*`]){
      try{for(const u of await query(index,pattern))urls.add(u);}catch(e){errors.push(`${index} ${pattern}: ${e instanceof Error?e.message:String(e)}`);}
    }
    found.set(index,urls);
  }
  const all=[...new Set([...found.values()].flatMap(s=>[...s]))].filter(u=>/sitemap/i.test(u)).sort();
  const roots=all.filter(u=>{try{const x=new URL(u);return x.hostname.replace(/^www\./,'')===domain && /sitemap/i.test(x.pathname) && !/[?&](?:page|offset)=/i.test(x.search);}catch{return false;}});
  const summary={schemaVersion:'Q1A_DATA49B_SITEMAP_ROOT_DISCOVERY_V1',domain,cutoff:CUTOFF,indexes:INDEXES,readOnly:true,databaseWrites:0,productionWrites:0,sourceSiteFetches:0,sourceContentFetches:0,warcFetches:0,commonCrawlUrlIndexRequestsOnly:true,vercelDeployments:0,errors,queryComplete:errors.length===0,perIndex:Object.fromEntries([...found].map(([k,v])=>[k,[...v].sort()])),distinctSitemapLikeUrls:all.length,roots};
  await fs.writeFile(path.join(OUT,'summary.json'),JSON.stringify(summary,null,2)+'\n','utf8');
  await fs.writeFile(path.join(OUT,'roots.txt'),roots.join('\n')+(roots.length?'\n':''),'utf8');
  console.log(JSON.stringify({domain,queryComplete:summary.queryComplete,distinctSitemapLikeUrls:all.length,roots},null,2));
}
main().catch(e=>{console.error(e);process.exit(1)});
