import fs from 'node:fs/promises';
import {load} from 'cheerio';
import {pathToFileURL} from 'node:url';
import {robotsAllowed} from './mubawab-result-cards-v1.mjs';

const UA='AkarFinder-Yakeey-PublicCard-V1/1.0 (+https://akarfinder.ma)';
const HOST='yakeey.com';
const ROOTS=[
 'https://yakeey.com/fr-ma/achat/biens/maroc',
 'https://yakeey.com/fr-ma/location/biens/maroc'
];
const CITY_ALIASES=new Map(Object.entries({
 'casablanca':'Casablanca','rabat':'Rabat','marrakech':'Marrakech','tanger':'Tanger',
 'agadir':'Agadir','fes':'Fès','meknes':'Meknès','kenitra':'Kénitra',
 'tetouan':'Tétouan','oujda':'Oujda','mohammedia':'Mohammédia',
 'dar bouazza':'Dar Bouazza','sale':'Salé','temara':'Témara',
 'nador':'Nador','bouskoura':'Bouskoura','el jadida':'El Jadida',
 'beni mellal':'Béni Mellal','essaouira':'Essaouira','safi':'Safi'
}));
const tidy=x=>String(x??'').replace(/[\u00a0\u202f]/g,' ').replace(/\s+/g,' ').trim();
const normalize=x=>tidy(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function listingIdentity(url,base=ROOTS[0]){
 try{
  const u=new URL(url,base);
  if(u.protocol!=='https:'||u.hostname!==HOST||u.username||u.password)return null;
  const m=decodeURIComponent(u.pathname).match(/^\/fr-ma\/(acheter|louer)-[a-z0-9-]+-([a-z]{1,3}\d{4,})\/?$/i);
  if(!m)return null;
  return {identity:'yakeey:'+m[2].toUpperCase(),canonical_url:u.origin+u.pathname,transaction:m[1]==='louer'?'rental':'sale'};
 }catch{return null;}
}
export function linkedPageTwo(html,url,robotsText){
 const $=load(html),root=new URL(url),allowed=[];
 for(const node of $('a[href]').toArray()){
  try{
   const u=new URL($(node).attr('href'),url);
   if(u.protocol!=='https:'||u.hostname!==HOST||u.pathname!==root.pathname||u.hash||u.searchParams.size!==1||u.searchParams.get('page')!=='2')continue;
   if(robotsAllowed(robotsText,u.href,UA))allowed.push(u.href);
  }catch{}
 }
 return [...new Set(allowed)][0]||null;
}
const individualLeafTexts=($,element)=>{
 const out=[];
 element.find('*').addBack().each((_,node)=>{
  const text=tidy($(node).contents().filter((__,n)=>n.type==='text').toArray().map(n=>n.data||'').join(' '));
  if(text&&text.length<180)out.push(text);
 });
 return [...new Set(out)];
};
function cardBlock($,node,identity){
 for(const current of [$(node),...$(node).parents().slice(0,7).toArray().map(n=>$(n))]){
  const text=individualLeafTexts($,current).join(' ');
  if(text.length<25||text.length>1800||!/\bDH\b/i.test(text)||!/m(?:²|2)/iu.test(text))continue;
  const ids=new Set(current.find('a[href]').addBack('a[href]').toArray().map(a=>listingIdentity($(a).attr('href'))?.identity).filter(Boolean));
  if(ids.size===1&&ids.has(identity))return current;
 }
 return null;
}
function priceFrom(leaves){
 const values=new Set();
 for(const raw of leaves){
  const t=tidy(raw);
  if(/(?:mois|mensualit|financement|crédit)/i.test(t)||/^\s*à partir de\b/i.test(t))continue;
  for(const m of t.matchAll(/(?:^|\s)(\d[\d\s\u00a0\u202f.,]{1,14})\s*(?:DH|MAD)\b/gi)){
   const n=Number(m[1].replace(/[^\d]/g,''));
   if(Number.isSafeInteger(n)&&n>=1000&&n<1e10)values.add(n);
  }
 }
 return values.size===1?[...values][0]:null;
}
function surfaceFrom(leaves){
 const found=new Set();
 for(const leaf of leaves){
  const t=tidy(leaf);
  if(/\d+\s*[-–]\s*\d+\s*m(?:²|2)/iu.test(t))continue;
  for(const m of t.matchAll(/(?:^|\s)(\d{1,5}(?:[.,]\d+)?)\s*m(?:²|2)(?=$|[^\p{L}\p{N}])/giu)){
   const n=Number(m[1].replace(',','.'));
   if(n>=5&&n<=100000)found.add(n);
  }
 }
 return found.size===1?[...found][0]:null;
}
function locationFrom(leaves){
 const found=new Map();
 for(const t of leaves){
  const text=tidy(t);
  const m=text.match(/(?:^|\s)([\p{L}\p{M}'’\- ]{2,55}),\s*([\p{L}\p{M}'’\- ]{2,35})(?:\s|$)/u);
  if(!m)continue;
  const city=CITY_ALIASES.get(normalize(m[2]));
  const district=tidy(m[1]);
  if(!city||district.length<2||normalize(district)===normalize(city))continue;
  found.set(normalize(district)+'|'+city,{city,district});
 }
 return found.size===1?[...found.values()][0]:null;
}
export function extractYakeeyCards(html,pageUrl){
 const $=load(html),cards=new Map(),rejected=new Map();
 const anchors=$('a[href]').toArray();
 for(const node of anchors){
  const id=listingIdentity($(node).attr('href'),pageUrl);
  if(!id||cards.has(id.identity))continue;
  const block=cardBlock($,node,id.identity);
  if(!block){rejected.set(id.identity,'mixed_or_missing_card');continue;}
  const text=tidy(block.text()),leaves=individualLeafTexts($,block);
  const closed=/\b(vendu|vendue|loué|louée)\b/iu.test(text);
  const isProject=/\bneuf\b/iu.test(text)&&(/\bà partir de\b/iu.test(text)||/\d+\s*[-–]\s*\d+\s*m(?:²|2)/iu.test(text));
  const place=locationFrom(leaves),price=priceFrom(leaves),surface=surfaceFrom(leaves);
  const row={source:'yakeey.com',identity:id.identity,canonical_url:id.canonical_url,
    transaction:id.transaction,city:place?.city??null,district:place?.district??null,
    price_mad:price,surface_m2:surface,card_closed_marker:closed,project_range_marker:isProject,
    first_category:pageUrl,five_field_observed:!!(place&&price&&surface&&!closed&&!isProject),
    freshness_certified:false,active_detail_verified:false,cross_source_deduplicated:false,
    state:closed?'explicitly_closed':isProject?'project_not_individual_property':'observed_review_not_freshness_certified'};
  cards.set(id.identity,row);
 }
 return {rows:[...cards.values()],rejected_card_count:rejected.size};
}
const sameResultPage=(requested,final)=>{
 try{const a=new URL(requested),b=new URL(final);
  return a.protocol==='https:'&&b.protocol==='https:'&&a.hostname===HOST&&b.hostname===HOST&&a.pathname===b.pathname&&a.search===b.search;
 }catch{return false;}
};
export async function runYakeeyPilot({fetchImpl=globalThis.fetch,robotsText=null,sleep=ms=>new Promise(r=>setTimeout(r,ms)),paceMs=2200,maxPages=4}={}){
 let robots=robotsText,halted=null,attempts=0,observed=0,closed=0;
 if(robots===null){
  try{
   const r=await fetchImpl('https://yakeey.com/robots.txt',{headers:{'user-agent':UA},signal:AbortSignal.timeout(12000)});
   if(r.status!==200)throw Error('robots not accessible');
   robots=await r.text();if(!robots||robots.length>120000)throw Error('invalid robots');
  }catch{halted='robots_unavailable_fail_closed';}
 }
 const queue=ROOTS.map(url=>({url,source_root:url})),requested=new Set(),rowsById=new Map(),pages=[];
 while(!halted&&queue.length&&attempts<Math.max(1,Math.min(4,maxPages))){
  const item=queue.shift();if(requested.has(item.url))continue;requested.add(item.url);
  if(!robotsAllowed(robots,item.url,UA)){pages.push({root:item.source_root,state:'robots_disallowed'});continue;}
  if(attempts&&paceMs)await sleep(paceMs);
  attempts++;
  let response;try{response=await fetchImpl(item.url,{redirect:'follow',headers:{'user-agent':UA,accept:'text/html,application/xhtml+xml'},signal:AbortSignal.timeout(20000)});}
  catch{pages.push({root:item.source_root,state:'network_error'});continue;}
  if(response.status===403||response.status===429){halted='http_'+response.status;pages.push({root:item.source_root,state:halted});break;}
  if(response.status!==200||!sameResultPage(item.url,response.url)){pages.push({root:item.source_root,state:'http_or_redirect_'+response.status});continue;}
  if(!/html/i.test(response.headers?.get?.('content-type')||'')){pages.push({root:item.source_root,state:'non_html'});continue;}
  let html;try{html=await response.text();}catch{pages.push({root:item.source_root,state:'read_error'});continue;}
  if(Buffer.byteLength(html,'utf8')>3000000){pages.push({root:item.source_root,state:'oversized'});continue;}
  observed++;
  const extraction=extractYakeeyCards(html,item.url);
  for(const row of extraction.rows){
   closed+=Number(row.card_closed_marker);
   const prior=rowsById.get(row.identity);
   if(!prior)rowsById.set(row.identity,row);
   else if(JSON.stringify([prior.city,prior.district,prior.price_mad,prior.surface_m2])!==JSON.stringify([row.city,row.district,row.price_mad,row.surface_m2])){
    prior.five_field_observed=false;prior.state='review_cross_page_conflict';
   }
  }
  const next=linkedPageTwo(html,item.url,robots);
  if(next&&!requested.has(next)&&!queue.some(q=>q.url===next))queue.push({url:next,source_root:item.source_root});
  pages.push({url:item.url,state:'observed',cards:extraction.rows.length,five_fields:extraction.rows.filter(x=>x.five_field_observed).length,
    marked_closed:extraction.rows.filter(x=>x.card_closed_marker).length,linked_page_two:!!next,rejected_card_count:extraction.rejected_card_count});
 }
 const rows=[...rowsById.values()].sort((a,b)=>a.identity.localeCompare(b.identity));
 return {report:{schema_version:'AKARFINDER_YAKEEY_CARD_CANARY_V1',semantics:'observed_cards_not_fresh_active_unique_certified',
   category_requests:attempts,observed_pages:observed,unique_source_ids:rows.length,
   five_field_observed:rows.filter(x=>x.five_field_observed).length,explicit_closed_marker_count:rows.filter(x=>x.card_closed_marker).length,
   halted_reason:halted,robots_checked:!!robots,pages,detail_requests:0,database_access:0,database_writes:0,production_published:0,
   note:'No login, no bypass, no detail requests. Never count sold/rented/project cards as servable; no freshness or physical dedup claim.'},rows};
}
async function main(){
 const {report,rows}=await runYakeeyPilot();
 await fs.writeFile('yakeey-card-canary-v1.json',JSON.stringify(report,null,2)+'\n');
 await fs.writeFile('yakeey-card-canary-v1.jsonl',rows.map(JSON.stringify).join('\n')+(rows.length?'\n':''));
 console.log(JSON.stringify({...report,pages:report.pages},null,2));
 if(report.halted_reason||report.observed_pages===0)process.exitCode=2;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(e=>{console.error(e);process.exitCode=1;});
