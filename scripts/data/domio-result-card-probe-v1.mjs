import {load} from "cheerio";
const HOSTS=new Set(["domio.ma","www.domio.ma"]);
const clean=s=>String(s||"").replace(/[\u00a0\u202f]/g," ").replace(/\s+/g," ").trim();
export function domioDetail(raw,base){
 try{
  const url=new URL(raw,base);
  if(url.protocol!=="https:"||!HOSTS.has(url.hostname))return null;
  const m=url.pathname.match(/^\/fr\/([a-z-]+)\/(vendre|louer)\/([a-z-]+)\/(\d+)\/[^/?#]+\/?$/i);
  if(!m)return null;
  url.search="";url.hash="";
  return {identity:"domio:"+m[4],url:url.href,city_slug:m[3],transaction:m[2],property_type:m[1]};
 }catch{return null;}
}
export function probeDomioCardHtml(html,pageUrl){
 const $=load(html),seen=new Set(),rows=[];
 for(const a of $("a[href]").toArray()){
  const detail=domioDetail($(a).attr("href"),pageUrl);
  if(!detail||seen.has(detail.identity))continue;
  const t=clean($(a).text());
  const amounts=[...t.matchAll(/(?<!\/)(\d{1,3}(?:[ .]\d{3})+|\d{3,10})\s*DH(?!\/m)/giu)]
    .map(m=>Number(m[1].replace(/[ .]/g,""))).filter(x=>x>=100&&x<=1e10);
  const surfaces=[...t.matchAll(/(\d{1,6}(?:[.,]\d+)?)\s*m(?:²|2)(?!\s*\/)/giu)]
    .map(m=>Number(m[1].replace(",","."))).filter(x=>x>=5&&x<=100000);
  const price=[...new Set(amounts)],area=[...new Set(surfaces)];
  seen.add(detail.identity);
  rows.push({...detail,price_mad:price.length===1?price[0]:null,surface_m2:area.length===1?area[0]:null,
   price_ambiguous:price.length>1,surface_ambiguous:area.length>1,
   district:null,field_state:"unverified_dom_card_only",freshness_certified:false});
 }
 return {unique_identity_count:rows.length,price_present:rows.filter(r=>r.price_mad!==null).length,
  surface_present:rows.filter(r=>r.surface_m2!==null).length,rows};
}
