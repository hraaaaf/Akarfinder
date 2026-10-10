import { load, type CheerioAPI } from "cheerio";

const clean=(v:any)=>String(v??"").replace(/\s+/g," ").trim();
const normalize=(v:any)=>clean(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();

export function plausibleMubawabDistrict(v:any){
  const n=normalize(v); if(!n||n.length<2||n.length>55)return false;
  if(/\b(?:appartement|apartment|villa|maison|house|terrain|bureau|office|commerce|commercial|studio|duplex|projet|project|standing|premium|vendre|vente|louer|location|rent|sale|prix|price|surface|area|saisir|consulter|financing|morocco|tf)\b/.test(n))return false;
  if(/\b(?:en un seul|un seul)\b/.test(n)||/(?:m²|m2|\d{3,})/i.test(String(v)))return false;
  return true;
}
function plausibleCity(v:any){
  const n=normalize(v); return !!n&&n.length>=2&&n.length<=45&&!/\d/.test(n)&&!/\b(?:vendre|vente|louer|location|appartement|villa|maison|terrain|bureau|surface|area|prix|price|saisir|consulter|morocco)\b/.test(n);
}
function stripCity(candidate:any,city:any){
  let c=clean(candidate).replace(/^[,.;:–—-]+|[,.;:–—-]+$/g,"").replace(/^(?:à|a|in)\s+/i,"");
  if(!city)return c||null;
  const nc=normalize(c), ncity=normalize(city), cityWords=clean(city).split(/\s+/), words=c.split(/\s+/);
  if(nc===ncity)return null;
  if(nc.endsWith(" "+ncity)&&words.length>cityWords.length)c=words.slice(0,-cityWords.length).join(" ");
  else if(nc.startsWith(ncity+" ")&&words.length>cityWords.length)c=words.slice(cityWords.length).join(" ");
  return clean(c).replace(/^[,.;:–—-]+|[,.;:–—-]+$/g,"")||null;
}
const PREFIX=/(?:à\s+vendre(?:\s+à)?|a\s+vendre(?:\s+a)?|à\s+louer(?:\s+à)?|a\s+louer(?:\s+a)?|for\s+sale\s+in|for\s+rent\s+in|location\s+(?:appartements?|bureaux?|villas?|maisons?|commerces?)|vente\s+(?:appartements?|bureaux?|villas?|maisons?|commerces?))\s+/i;
export function mubawabTitleLocation(title:any,fallbackCity:any){
  const t=clean(title); const m=PREFIX.exec(t); if(!m)return {city:fallbackCity||null,district:null,evidence:[] as string[]};
  let tail=t.slice(m.index+m[0].length).split(/\s+-\s+/)[0].trim();
  const parts=tail.split(",").map(clean).filter(Boolean); let city:any=null,district:any=null;
  const nf=fallbackCity?normalize(fallbackCity):null;
  if(parts.length>=2&&fallbackCity){city=fallbackCity; district=normalize(parts[1])===nf?parts[0]:parts[0];}
  else if(parts.length>=2){district=parts[0];city=parts[1];}
  else {district=tail.split(/[.…]/)[0].trim();city=fallbackCity||null;}
  if(fallbackCity&&plausibleCity(fallbackCity))city=fallbackCity; else if(city&&!plausibleCity(city))city=null;
  district=stripCity(district,city); if(!plausibleMubawabDistrict(district))district=null;
  return {city,district,evidence:district?["mubawab_meta_title"]:city?["mubawab_meta_title_city"]:[]};
}
export function resolveMubawabLocation(html:string,detail:any,title:any){
  const $=load(html); const structuredCity=plausibleCity(detail?.city)?clean(detail.city):null;
  const fromTitle=mubawabTitleLocation(title,structuredCity); const city=fromTitle.city||structuredCity;
  const direct=plausibleMubawabDistrict(detail?.district)?clean(detail.district):null;
  if(fromTitle.district)return {city,district:fromTitle.district,confidence:"high",evidence:fromTitle.evidence};
  if(direct)return {city,district:direct,confidence:detail?._confidence?.district||"high",evidence:["extractDetail:district"]};
  const pairs:any[]=[]; const push=(district:any,pairCity:any,evidence:string)=>{
    district=clean(district);pairCity=clean(pairCity);
    if(!plausibleMubawabDistrict(district)||!plausibleCity(pairCity)||(city&&normalize(pairCity)!==normalize(city)))return;
    const key=normalize(district)+"\0"+normalize(pairCity); if(!pairs.some(x=>x.key===key))pairs.push({key,district,city:pairCity,evidence});
  };
  $("[class*=location], [class*=Location], [class*=address], [class*=Address], [itemprop*=address]").each((_:any,el:any)=>{const t=clean($(el).text());const m=t.match(/^(.{2,55}?)\s+(?:à|a|in)\s+(.{2,45})$/iu);if(m)push(m[1],m[2],"structured_location_dom");});
  const candidates=(detail?.location_candidates||[]).map(clean).filter(Boolean); for(let i=0;i<candidates.length-1;i++)push(candidates[i],candidates[i+1],"breadcrumb_adjacent");
  const districts=[...new Set(pairs.map(x=>normalize(x.district)))];
  if(city&&districts.length===1)return {city,district:pairs[0].district,confidence:"high",evidence:[...new Set(pairs.map(x=>x.evidence))]};
  return {city:city||null,district:null,confidence:city?"review":"missing",evidence:fromTitle.evidence};
}
