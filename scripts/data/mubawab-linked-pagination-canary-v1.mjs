import fs from 'node:fs/promises';
import {load} from 'cheerio';
import {pathToFileURL} from 'node:url';
import {robotsAllowed} from './mubawab-result-cards-v1.mjs';
import {extractFrontierCategories} from './mubawab-national-frontier-v1.mjs';

const UA='AkarFinderPaginationDiscoveryV1/1.0 (+https://akarfinder.ma)';
const HOST='www.mubawab.ma';
export const SEEDS=[
 {kind:'villas',url:'https://www.mubawab.ma/fr/st/f%C3%A8s/villas-et-maisons-de-luxe-a-vendre'},
 {kind:'commerce',url:'https://www.mubawab.ma/fr/st/k%C3%A9nitra/bureaux-et-commerces-a-vendre'},
 {kind:'maisons',url:'https://www.mubawab.ma/fr/st/t%C3%A9touan/maisons-a-vendre'},
 {kind:'terrains',url:'https://www.mubawab.ma/fr/st/nador/terrains-a-vendre'}
];
const canonicalPath=u=>decodeURIComponent(u.pathname).replace(/\/+$/,'');
export function discoverPaginationLinks(html,seedUrl,robotsText){
 const $=load(html),seed=new URL(seedUrl),base=canonicalPath(seed),found=new Map();
 let unclassified=0,forbidden=0;
 for(const node of $('a[href]').toArray()){
  let u;try{u=new URL($(node).attr('href'),seedUrl);}catch{unclassified++;continue;}
  if(u.protocol!=='https:'||u.hostname!==HOST||u.username||u.password||u.hash){unclassified++;continue;}
  let path;try{path=canonicalPath(u);}catch{unclassified++;continue;}
  let value=null,kind=null;
  if(path===base&&u.searchParams.size===1&&(u.searchParams.has('page')||u.searchParams.has('p'))){
   value=u.searchParams.get('page')??u.searchParams.get('p');kind='query';
  }else if(!u.search&&path.startsWith(base+':p:')){value=path.slice((base+':p:').length);kind='colon';}
  else if(!u.search&&path.startsWith(base+'/page/')){value=path.slice((base+'/page/').length);kind='path';}
  if(!kind||!/^[0-9]{1,3}$/.test(value||'')||Number(value)<2||Number(value)>200){unclassified++;continue;}
  if(!robotsAllowed(robotsText,u.href,UA)){forbidden++;continue;}
  if(!found.has(u.href))found.set(u.href,{source_category:seedUrl,url:u.href,page:Number(value),kind,observed_in_html_anchor:true,visited:false});
 }
 return {candidates:[...found.values()].sort((a,b)=>a.page-b.page||a.url.localeCompare(b.url)),unclassified,forbidden};
}
export async function runPaginationCanary({seeds=SEEDS,fetchImpl=globalThis.fetch,robotsText=null,paceMs=1800,sleep=ms=>new Promise(r=>setTimeout(r,ms))}={}){
 let robots=robotsText,stop=null,requested=0,observed=0;
 const pages=[],links=new Map(),categoryLinks=new Map();
 if(robots===null)try{
  const r=await fetchImpl('https://www.mubawab.ma/robots.txt',{headers:{'user-agent':UA},signal:AbortSignal.timeout(12000)});
  if(r.status!==200)throw Error('robots unavailable');
  robots=await r.text();if(!robots||robots.length>120000)throw Error('robots invalid');
 }catch{stop='robots_unavailable_fail_closed';}
 for(const seed of seeds.slice(0,4)){
  if(stop)break;
  let req;try{req=new URL(seed.url);}catch{pages.push({kind:seed.kind,state:'invalid_seed'});continue;}
  if(req.protocol!=='https:'||req.hostname!==HOST||req.search||req.hash||!req.pathname.startsWith('/fr/st/')||!robotsAllowed(robots,req.href,UA)){
   pages.push({kind:seed.kind,state:'disallowed_category'});continue;
  }
  if(requested>0&&paceMs>0)await sleep(paceMs);
  requested++;
  let r;try{r=await fetchImpl(req.href,{redirect:'follow',headers:{'user-agent':UA,accept:'text/html,application/xhtml+xml'},signal:AbortSignal.timeout(20000)});}
  catch{pages.push({kind:seed.kind,state:'fetch_error'});continue;}
  if([403,429].includes(r.status)){stop='http_'+r.status;pages.push({kind:seed.kind,state:stop});break;}
  if(r.status!==200){pages.push({kind:seed.kind,state:'http_'+r.status});continue;}
  let final;try{final=new URL(r.url);}catch{pages.push({kind:seed.kind,state:'invalid_response_url'});continue;}
  if(final.protocol!=='https:'||final.hostname!==HOST||final.pathname!==req.pathname||final.search){
   pages.push({kind:seed.kind,state:'redirect_out_of_scope'});continue;
  }
  if(!/html/i.test(r.headers?.get?.('content-type')||'')){pages.push({kind:seed.kind,state:'non_html'});continue;}
  let html;try{html=await r.text();}catch{pages.push({kind:seed.kind,state:'body_error'});continue;}
  if(Buffer.byteLength(html,'utf8')>3000000){pages.push({kind:seed.kind,state:'oversized'});continue;}
  observed++;const out=discoverPaginationLinks(html,req.href,robots);
  for(const link of out.candidates)links.set(link.url,link);
  for(const c of extractFrontierCategories(html,req.href).filter(c=>c.kind==='st'&&c.url!==req.href)){
   if(robotsAllowed(robots,c.url,UA))categoryLinks.set(c.url,{url:c.url,city:c.city,category:c.category,source_seed:req.href,observed_in_public_anchor:true,followed:false});
  }
  pages.push({kind:seed.kind,state:'observed',pagination_anchors:out.candidates.length,linked_type_categories:extractFrontierCategories(html,req.href).filter(c=>c.kind==='st'&&c.url!==req.href).length,forbidden:out.forbidden,unclassified:out.unclassified});
 }
 return {report:{schema_version:'AKARFINDER_PUBLIC_LINKED_PAGINATION_DISCOVERY_V1',seed_count:seeds.slice(0,4).length,category_requests:requested,observed_categories:observed,candidate_pagination_urls:links.size,candidate_type_category_urls:categoryLinks.size,
  halted_reason:stop,pagination_requests:0,detail_requests:0,database_access:0,database_writes:0,published_count:0,
  note:'Only category-page anchor links; candidate pagination never visited, no invented routes or freshness claims',pages},candidates:[...links.values()],typeCategories:[...categoryLinks.values()]};
}
async function main(){
 const {report,candidates,typeCategories}=await runPaginationCanary();
 await fs.writeFile('linked-pagination-canary-v1.json',JSON.stringify(report,null,2)+'\n');
 await fs.writeFile('linked-pagination-canary-v1.jsonl',candidates.map(JSON.stringify).join('\n')+(candidates.length?'\n':''));
 await fs.writeFile('linked-type-categories-v1.jsonl',typeCategories.map(JSON.stringify).join('\n')+(typeCategories.length?'\n':''));
 console.log(JSON.stringify(report,null,2));
 if(report.halted_reason||!report.observed_categories)process.exitCode=2;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(e=>{console.error(e);process.exitCode=1;});
