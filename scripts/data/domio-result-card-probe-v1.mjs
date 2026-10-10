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

const cityName=slug=>({"casablanca":"Casablanca","marrakech":"Marrakech","rabat":"Rabat","tanger":"Tanger","agadir":"Agadir"}[slug]||null);
function districtEvidence(t,city){
 if(!city)return {district:null,conflict:false,explicitCity:false};
 const norm=x=>x.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
 const normalized=t.replace(/\s+/g," ");
 const found=new Map();
 // Require explicit "City, District 57.0 m²" inside the same card;
 // never infer a district from the card title or the category route alone.
 const re=/\b(Casablanca|Marrakech|Rabat|Tanger|Agadir)\s*,\s*([\p{L}][\p{L}\p{M}'’\- ]{1,50}?)\s+(\d{1,6}(?:[.,]\d+)?)\s*m(?:²|2)(?=\s|$)/giu;
 let explicitCity=false;
 for(const m of normalized.matchAll(re)){
  if(norm(m[1])!==norm(city))continue;
  explicitCity=true;
  const d=clean(m[2]);
  if(d.length<2||d.length>45||/\b(?:appartement|villa|maison|acheter|louer|prix)\b/i.test(d))continue;
  if(norm(d).includes(norm(city))||/^(?:quartier\s+)?(?:bouskoura|dar bouazza|mohammedia|nouaceur|temara|sale)$/i.test(norm(d)))continue;
  found.set(norm(d),d);
 }
 return {district:found.size===1?[...found.values()][0]:null,conflict:found.size>1,explicitCity};
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
  const validPrice=amounts.filter(value=>detail.transaction==="louer"?(value>=500&&value<=250000):(value>=50000&&value<=100000000));
  const validArea=surfaces.filter(value=>detail.property_type==="appartement"?value<=3000:value<=100000);
  const price=[...new Set(validPrice)],area=[...new Set(validArea)];
  const candidateCity=cityName(detail.city_slug);
  const location=districtEvidence(t,candidateCity);
  seen.add(detail.identity);
  rows.push({...detail,city:location.explicitCity?candidateCity:null,district:location.district,
   price_mad:price.length===1?price[0]:null,surface_m2:area.length===1?area[0]:null,
   price_ambiguous:price.length>1,surface_ambiguous:area.length>1,
   district_ambiguous:location.conflict,
   field_state:"unverified_dom_card_only",freshness_certified:false,
   five_field_present:!!(location.district&&location.explicitCity&&price.length===1&&area.length===1&&!location.conflict)});

 }
 return {unique_identity_count:rows.length,price_present:rows.filter(r=>r.price_mad!==null).length,
  surface_present:rows.filter(r=>r.surface_m2!==null).length,
  district_present:rows.filter(r=>r.district!==null).length,
  five_field_present:rows.filter(r=>r.five_field_present).length,rows};
}
