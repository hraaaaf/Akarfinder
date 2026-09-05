import fs from 'node:fs/promises';

const BASE = 'https://www.properstar.ma';
const OUT = 'data/audits/raw-results/properstar-public-probe.json';
const UA = 'AkarFinder-PublicDiscovery/1.0 (+https://github.com/hraaaaf/Akarfinder)';
const TARGETS = [
  '/المغرب/عقارات-للبيع',
  '/المغرب/عقارات-للايجار',
];

function parseRobots(text) {
  const groups = []; let agents=[]; let rules=[];
  const flush=()=>{ if (agents.length) groups.push({agents:[...agents],rules:[...rules]}); agents=[]; rules=[]; };
  for (const raw of text.split(/\r?\n/)) {
    const line=raw.replace(/#.*/, '').trim(); if(!line) continue;
    const i=line.indexOf(':'); if(i<0) continue;
    const k=line.slice(0,i).trim().toLowerCase(), v=line.slice(i+1).trim();
    if(k==='user-agent'){ if(rules.length) flush(); agents.push(v.toLowerCase()); }
    else if((k==='allow'||k==='disallow')&&agents.length) rules.push({kind:k,path:v});
  }
  flush(); return groups;
}
function allowedByRobots(groups,path){
  const rules=groups.filter(g=>g.agents.includes('*')).flatMap(g=>g.rules).filter(r=>r.path&&path.startsWith(r.path));
  if(!rules.length) return true;
  rules.sort((a,b)=>b.path.length-a.path.length||(a.kind==='allow'?-1:1));
  return rules[0].kind==='allow';
}
async function get(url){
  const r=await fetch(url,{headers:{'user-agent':UA,accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'}});
  return {status:r.status,finalUrl:r.url,text:await r.text()};
}
function extractLinks(html){
  const out=new Set(); let m;
  const re=/href=["']([^"'#]+)["']/gi;
  while((m=re.exec(html))) {
    try { const u=new URL(m[1],BASE); if(u.hostname.endsWith('properstar.ma')) out.add(u.href); } catch {}
  }
  return [...out];
}
function looksLikeListing(u){
  const s=decodeURIComponent(u).toLowerCase();
  return /\/(?:property|listing|عقار|منزل|شقة|فيلا|ارض|أرض)\b/.test(s) || /\/\d{5,}(?:[/?#]|$)/.test(s);
}
function maxPage(html){
  let max=1,m; const re=/(?:[?&]p=|[?&]page=)(\d{1,4})/gi;
  while((m=re.exec(html))) max=Math.max(max,Number(m[1]));
  return max;
}

const proof={generated_at:new Date().toISOString(),source:'properstar.ma',mode:'read_only_public_surface_probe',zero_db_writes:true,direct_detail_fetches:0,robots_status:null,robots_sitemaps:[],targets:[],errors:[]};
try{
  const robots=await get(`${BASE}/robots.txt`); proof.robots_status=robots.status;
  if(robots.status!==200) throw new Error(`robots HTTP ${robots.status}`);
  const groups=parseRobots(robots.text);
  proof.robots_sitemaps=[...robots.text.matchAll(/^sitemap:\s*(\S+)/gmi)].map(m=>m[1]);
  for(const path of TARGETS){
    const t={path,allowed:allowedByRobots(groups,path),status:null,final_url:null,same_host_links:0,listing_like_links:0,max_page_observed:1,sample_listing_like_links:[],errors:[]};
    if(!t.allowed){ proof.targets.push(t); continue; }
    try{
      const r=await get(`${BASE}${path}`); t.status=r.status; t.final_url=r.finalUrl;
      if(r.status===200){ const links=extractLinks(r.text); const listing=links.filter(looksLikeListing); t.same_host_links=links.length; t.listing_like_links=listing.length; t.max_page_observed=maxPage(r.text); t.sample_listing_like_links=listing.slice(0,10); }
    }catch(e){t.errors.push(String(e));}
    proof.targets.push(t);
  }
}catch(e){ proof.errors.push(String(e)); }
await fs.mkdir('data/audits/raw-results',{recursive:true});
await fs.writeFile(OUT,JSON.stringify(proof,null,2)+'\n');
console.log(JSON.stringify(proof,null,2));
if(proof.robots_status!==200) process.exit(2);
if(proof.zero_db_writes!==true||proof.direct_detail_fetches!==0) process.exit(3);
