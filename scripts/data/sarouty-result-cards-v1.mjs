import {load} from "cheerio";
import {saroutyListingRoute} from "./sarouty-detail-identity-v1.mjs";

const clean=x=>String(x??"").replace(/[\u00a0\u202f]/g," ").replace(/\s+/g," ").trim();
const fold=x=>clean(x).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const safeDistrict=d=>{const s=clean(d);
 return s.length>=2&&s.length<=55&&!/https?:|@|\d{4,}|\b(?:appartement|villa|vente|louer|acheter|mad|dhs?|m²)\b/i.test(s)?s:null;};
const priceValues=t=>{
 const found=new Set();
 for(const m of clean(t).matchAll(/(?<![\d\/])(\d{1,3}(?:[ .\u00a0\u202f]\d{3})+|\d{4,10})\s*(?:DH|DHS|MAD)\b(?!\s*\/\s*m(?:²|2))/giu)){
  const n=Number(m[1].replace(/[ .\u00a0\u202f]/g,""));
  if(Number.isSafeInteger(n)&&n>=100&&n<1e10)found.add(n);
 }
 return [...found];
};
const surfaceValues=t=>{
 const found=new Set();
 for(const m of clean(t).matchAll(/(?<!\d)(\d{1,6}(?:[.,]\d+)?)\s*m(?:²|2)(?![\/\p{L}\p{N}])/giu)){
  const n=Number(m[1].replace(",","."));
  if(Number.isFinite(n)&&n>=5&&n<=100000)found.add(n);
 }
 return [...found];
};
function singleIdentity($,element,id){
 const inside=$(element).find("a[href]").toArray().map(a=>saroutyListingRoute($(a).attr("href"))?.identity).filter(Boolean);
 return inside.length>0&&new Set(inside).size===1&&inside[0]===id;
}
function locateDistrict($,card,city){
 const candidates=new Map(),normCity=fold(city);
 const scopes=card.find("[class*='location'],[class*='Location'],[class*='address'],[class*='Address'],[class*='district'],[class*='District']").toArray();
 const texts=scopes.map(n=>clean($(n).text())).filter(x=>x.length<=110);
 // Only trust a compact, explicitly labeled location in the same card.
 const labelRe=/^([^,]{2,55}),\s*([^,]{2,55})$/u;
 for(const text of texts){
  const m=labelRe.exec(text);
  if(!m)continue;
  let district=null;
  if(fold(m[2])===normCity)district=safeDistrict(m[1]);
  else if(fold(m[1])===normCity)district=safeDistrict(m[2]);
  if(district)candidates.set(fold(district),district);
 }
 return {district:candidates.size===1?[...candidates.values()][0]:null,location_conflict:candidates.size>1,
  city_evidence:candidates.size>0};
}
export function extractSaroutyResultCards(html,pageUrl,city,{limit=60}={}){
 const $=load(html),byId=new Map();
 let rejectedMixed=0,rejectedNoScope=0,linkCandidates=0;
 for(const link of $("a[href]").toArray()){
  const source=saroutyListingRoute($(link).attr("href"),pageUrl);
  if(!source)continue;
  linkCandidates++;
  let card=$(link).closest("article,[class*='property-card'],[class*='listing-card'],[class*='propertyCard']");
  if(!card.length){
   for(const anc of $(link).parents().slice(0,5).toArray()){
    const node=$(anc),t=clean(node.text());
    if(t.length>1800)continue;
    if(!singleIdentity($,anc,source.identity))continue;
    if(!priceValues(t).length||!surfaceValues(t).length)continue;
    card=node;break;
   }
  }
  if(!card.length){rejectedNoScope++;continue;}
  if(!singleIdentity($,card[0],source.identity)){rejectedMixed++;continue;}
  if(byId.has(source.identity))continue;
  const texts=card.find("*").toArray().map(n=>clean($(n).contents().filter((_,t)=>t.type==="text").toArray().map(t=>t.data).join(" "))).filter(s=>s.length&&s.length<110);
  const wrappers=card.find("[class*='price'],[class*='Price'],[class*='surface'],[class*='Surface']").toArray().map(n=>clean($(n).text())).filter(s=>s.length<120);
  const prices=new Set(),areas=new Set();
  for(const t of [...texts,...wrappers]){
   for(const p of priceValues(t))prices.add(p);
   for(const a of surfaceValues(t))areas.add(a);
  }
  const loc=locateDistrict($,card,city);
  const price=prices.size===1?[...prices][0]:null;
  const surface=areas.size===1?[...areas][0]:null;
  const row={
   source:"sarouty.ma",identity:source.identity,canonical_url:source.url,
   city:loc.city_evidence?city:null,district:loc.district,
   price_mad:price,surface_m2:surface,
   price_ambiguous:prices.size>1,surface_ambiguous:areas.size>1,district_ambiguous:loc.location_conflict,
   evidence:"one_isolated_listing_card",freshness_certified:false,active_detail_verified:false,cross_source_deduplicated:false,
   state:"observed_card_not_current_or_freshness_certified"
  };
  row.five_field_observed=!!(row.canonical_url&&row.city&&row.district&&row.price_mad&&row.surface_m2
    &&!row.price_ambiguous&&!row.surface_ambiguous&&!row.district_ambiguous);
  byId.set(source.identity,row);
  if(byId.size>=limit)break;
 }
 const rows=[...byId.values()];
 return {schema_version:"AKARFINDER_SAROUTY_CARD_EXTRACTION_V1",link_candidates:linkCandidates,
  isolated_ids:rows.length,five_field_observed:rows.filter(r=>r.five_field_observed).length,
  price_present:rows.filter(r=>r.price_mad!==null).length,
  surface_present:rows.filter(r=>r.surface_m2!==null).length,
  district_present:rows.filter(r=>r.district!==null).length,
  rejected_mixed:rejectedMixed,rejected_no_card_scope:rejectedNoScope,
  semantics:"five_fields_observed_same_card_only_no_active_or_fresh_certification",rows};
}
