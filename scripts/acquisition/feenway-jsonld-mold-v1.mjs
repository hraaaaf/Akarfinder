// FeenWay RAW HTML -> conservative JSON-LD discovery mold. Never certifies availability or rights.
import {createHash} from 'node:crypto';
const hash = s => createHash('sha256').update(s).digest('hex');
const clean = s => typeof s==='string'&&s.trim()?s.trim().replace(/\s+/g,' ').slice(0,100):null;
function listingNodes(doc) {
 const output=[];
 if(Array.isArray(doc)){for(const part of doc)output.push(...listingNodes(part));return output;}
 if(!doc||typeof doc!=='object')return output;
 if(doc['@type']==='RealEstateListing')output.push(doc);
 if(Array.isArray(doc['@graph']))for(const part of doc['@graph'])output.push(...listingNodes(part));
 return output;
}
export function extractFeenwayRaw({url,html,observed_at}={}) {
 const base={schema:'AKARFINDER_FEENWAY_JSONLD_MOLD_V1',aggregator:'feenway.com',id:null,url:null,raw_sha256:typeof html==='string'?hash(html):null,price_mad:null,city:null,region:null,property_type_candidate:null,surface_candidate_m2:null,surface_evidence:'unverified',date_posted_claim:null,availability_claimed:null,availability_verified:false,real_freshness_verified:false,physical_uniqueness_verified:false,reuse_rights_verified:false,eligible:false,gate:'quarantine',issues:[]};
 let uri;try{uri=new URL(url||'');}catch{base.issues.push('invalid_url');return base;}
 const m=uri.pathname.match(/^\/listings\/([1-9]\d{0,11})\/?$/);
 if(uri.protocol!=='https:'||uri.hostname!=='www.feenway.com'||!m||uri.search||uri.hash||typeof html!=='string'||html.length>3000000){base.issues.push('invalid_raw');return base;}
 base.id=Number(m[1]);base.url='https://www.feenway.com/listings/'+m[1];
 const scripts=[...html.matchAll(/<script\b(?=[^>]*type=["']application\/ld\+json["'])[^>]*>([\s\S]*?)<\/script>/gi)];
 const nodes=[];
 for(const script of scripts){
  try{nodes.push(...listingNodes(JSON.parse(script[1])));}
  catch{base.issues.push('jsonld_parse_error');}
 }
 if(nodes.length!==1){base.issues.push('missing_or_duplicate_real_estate_listing');return base;}
 const record=nodes[0];
 let listingURL;try{listingURL=new URL(record.url||record['@id']||'');}catch{base.issues.push('missing_listing_url');return base;}
 if(listingURL.hostname!=='www.feenway.com'||listingURL.pathname.replace(/\/$/,'')!==uri.pathname.replace(/\/$/,'')){base.issues.push('listing_id_mismatch');return base;}
 const offers=record.offers&&typeof record.offers==='object'&&!Array.isArray(record.offers)?record.offers:{};
 const coverage=record.spatialCoverage&&typeof record.spatialCoverage==='object'?record.spatialCoverage:{};
 const address=coverage.address&&typeof coverage.address==='object'?coverage.address:{};
 const price=offers.price;
 if(offers.priceCurrency==='MAD'&&/^\d+(?:\.\d{1,2})?$/.test(String(price))&&Number(price)>=200&&Number(price)<=1000000000)base.price_mad=Number(price);
 else base.issues.push('price_mad_unconfirmed');
 base.city=clean(address.addressLocality);base.region=clean(address.addressRegion);
 if(!base.city)base.issues.push('city_unconfirmed');
 const t=typeof record.name==='string'?record.name.toLowerCase():'';
 base.property_type_candidate=/appartement/.test(t)?'apartment':/villa/.test(t)?'villa':/terrain/.test(t)?'land':/studio/.test(t)?'studio':/bureau/.test(t)?'office':/maison/.test(t)?'house':null;
 const areas=[...String(record.description||'').matchAll(/(^|[^\d])(\d[\d\s.,]{0,12})\s*m(?:²|2)(?![\d\p{L}])/giu)].map(x=>Number(x[2].replace(/[^\d]/g,''))).filter(x=>Number.isInteger(x)&&x>=5&&x<=100000);
 const distinct=[...new Set(areas)];
 if(distinct.length===1){base.surface_candidate_m2=distinct[0];base.surface_evidence='unstructured_description_candidate';}
 else base.issues.push('area_ambiguous_or_missing');
 const day=typeof record.datePosted==='string'?new Date(record.datePosted):null;
 if(day&&Number.isFinite(day.getTime()))base.date_posted_claim=day.toISOString();
 else base.issues.push('date_posted_unconfirmed');
 base.availability_claimed=typeof offers.availability==='string'?clean(offers.availability):null;
 if(base.availability_claimed)base.issues.push('availability_source_claim_unverified');
 if(!base.region)base.issues.push('region_unconfirmed');
 base.gate=base.price_mad&&base.city&&base.date_posted_claim?'review_structured_metadata':'review_incomplete';
 return base;
}
