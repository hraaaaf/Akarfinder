import { load } from "cheerio";

const clean=s=>String(s??"").replace(/[\u00a0\u202f]/g," ").replace(/\s+/g," ").trim();
const norm=s=>clean(s).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const HOSTS=new Set(["mubawab.ma","www.mubawab.ma"]);
function detail(raw,base){
 try {
  const url=new URL(raw,base),m=decodeURIComponent(url.pathname).match(/^\/(?:fr|en|ar|es|it|nl)\/(a|pa)\/(\d+)(?:\/|$)/i);
  if(!HOSTS.has(url.hostname)||!m)return null;
  url.search="";url.hash="";
  return {identity:m[1].toLowerCase()+":"+m[2],kind:m[1].toLowerCase(),url:url.href};
 }catch{return null;}
}
const exactPrice=t=>{
 const m=t.match(/^(?:prix\s*:?\s*)?([\d\s.,]{2,})\s*(?:dh|dhs|mad)$/i);
 if(!m)return null;
 const n=Number(m[1].replace(/[\s.,]/g,""));
 return Number.isSafeInteger(n)&&n>0&&n<1e10?n:null;
};
const exactSurface=t=>{
 const m=t.match(/^(\d{1,6}(?:[.,]\d+)?)\s*m(?:²|2)$/iu);
 const n=m?Number(m[1].replace(",",".")):null;
 return n!==null&&Number.isFinite(n)&&n>=5&&n<=100000?n:null;
};
function leafText($,card){
 const texts=[];
 card.find("*").each((_,n)=>{
  const direct=clean($(n).contents().filter((_,c)=>c.type==="text").toArray().map(x=>x.data||"").join(" "));
  if(direct&&direct.length<115)texts.push(direct);
 });
 return [...new Set(texts)];
}
function districtFromText(t,city){
 const m=t.match(/^(.{2,65}?),\s*(.{2,50})$/u);
 if(!m||norm(m[2])!==norm(city))return null;
 const d=clean(m[1]);
 return /\d{3}|@|http/i.test(d)?null:d;
}

export function extractMubawabResultCards(html,pageUrl,city,{max=50}={}){
 const $=load(html),anchors=$("a[href]").toArray()
  .map(a=>({node:a,ref:detail($(a).attr("href"),pageUrl)}))
  .filter(x=>x.ref?.kind==="a");
 const cards=new Map();let rejectedMixed=0;
 for(const {node,ref} of anchors){
  let card=$(node).closest("li.listingBox,article.listingBox,.listingBox,.adListing");
  if(!card.length){
   for(const ancestor of $(node).parents().slice(0,8).toArray()){
    const p=$(ancestor);
    const ids=new Set(p.find("a[href]").toArray().map(n=>detail($(n).attr("href"),pageUrl)?.identity).filter(Boolean));
    const txt=clean(p.text());
    if(ids.size===1&&ids.has(ref.identity)&&txt.length<3000&&/\b(?:dh|dhs|mad)\b/i.test(txt)&&/m(?:²|2)/iu.test(txt)){card=p;break;}
  }
  }
  if(!card.length)continue;
  const ids=new Set(card.find("a[href]").toArray().map(n=>detail($(n).attr("href"),pageUrl)?.identity).filter(Boolean));
  if(ids.size!==1){rejectedMixed++;continue;}
  if(!cards.has(ref.identity))cards.set(ref.identity,{ref,card});
  if(cards.size>=max)break;
 }
 const rows=[];
 for(const {ref,card} of cards.values()){
  const title=clean(card.find("h2,h3,.listingTit,.listingTitle").first().text()||card.find('a[href*="/a/"]').first().text()).slice(0,160);
  const leaves=leafText($,card);
  const priceWrappers=card.find('[class*="price"],[class*="Price"],[data-testid*="price"]').toArray().map(n=>clean($(n).text())).filter(t=>t.length<130);
  const prices=[...new Set([...leaves,...priceWrappers].map(exactPrice).filter(x=>x!==null))];
  const surfaces=[...new Set(leaves.map(exactSurface).filter(x=>x!==null))];
  if(surfaces.length===0){
   const m=title.match(/(\d{1,6})\s*m(?:²|2)/iu);
   if(m){const n=Number(m[1]);if(n>=5&&n<=100000)surfaces.push(n);}
  }
  const districts=[...new Set(leaves.map(t=>districtFromText(t,city)).filter(Boolean))];
  const conflicts={price:prices.length>1,surface:surfaces.length>1,district:districts.length>1};
  const row={
   identity:ref.identity,canonical_url:ref.url,title,city,
   district:districts.length===1?districts[0]:null,
   price_mad:prices.length===1?prices[0]:null,
   surface_m2:surfaces.length===1?surfaces[0]:null,
   conflicts,
   evidence:"one_result_card",
   state:"observed_review_not_current_or_fresh_certified"
  };
  row.five_field_present=!!(row.canonical_url&&row.city&&row.district&&row.price_mad&&row.surface_m2&&!Object.values(conflicts).some(Boolean));
  rows.push(row);
 }
 return {schema_version:"AKARFINDER_RESULT_CARD_FIRST_V1",page_url:pageUrl,city,raw_detail_anchors:anchors.length,cards:rows.length,rejected_mixed:rejectedMixed,five_field_present:rows.filter(r=>r.five_field_present).length,rows};
}

// Minimal RFC 9309 path rules for the controlled pilot; refuse access if robots fetch fails.
export function robotsAllowed(robots,url,ua="AkarFinderResultCardPilot"){
 let target;try{target=new URL(url);}catch{return false;}
 const groups=[];let agents=[],rules=[];
 function flush(){if(agents.length)groups.push({agents,rules});agents=[];rules=[];}
 for(const raw of String(robots).split(/\r?\n/)){
  const line=raw.split("#")[0].trim();const i=line.indexOf(":");
  if(i<0)continue;
  const k=line.slice(0,i).trim().toLowerCase(),v=line.slice(i+1).trim();
  if(k==="user-agent"){if(rules.length)flush();agents.push(v.toLowerCase());}
  else if(k==="allow"||k==="disallow")rules.push({kind:k,pattern:v});
 }
 flush();
 const matches=groups.flatMap(g=>g.agents.filter(a=>a==="*"||a&&ua.toLowerCase().includes(a)).map(a=>({specificity:a==="*"?0:a.length,rules:g.rules})));
 const rank=Math.max(0,...matches.map(m=>m.specificity));
 const path=target.pathname+target.search;
 let best=-1,allowed=true;
 for(const group of matches.filter(m=>m.specificity===rank))for(const rule of group.rules){
  if(!rule.pattern)continue;
  const rx="^"+rule.pattern.split("*").map(s=>s.replace(/([.+?^|()[\]{}\\])/g,"\\$1").replace(/\$/g,"$")).join(".*");
  let ok=false;try{ok=new RegExp(rx).test(path);}catch{continue;}
  if(!ok)continue;
  const n=rule.pattern.replace(/[*$]/g,"").length;
  if(n>best||(n===best&&rule.kind==="allow")){best=n;allowed=rule.kind==="allow";}
 }
 return allowed;
}
