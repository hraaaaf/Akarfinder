import { plausibleMubawabDistrict } from "./mubawab-location-v2.js";

export type MubawabDistrictEvidence={value:string,evidence:"mubawab_primary_description_quartier_and_slug",confidence:"high"};

const normalize=(v:string)=>v.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[’']/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");

export function extractMubawabCorroboratedDistrict(description:string|null|undefined,canonicalUrl:string,city:string|null|undefined):MubawabDistrictEvidence|null {
 if(!description||!city||description.length>40000)return null;
 let slug="";
 try{
  const path=decodeURIComponent(new URL(canonicalUrl).pathname);
  const m=path.match(/^\/(?:fr|en|ar|es|it|nl)\/(?:a|pa)\/\d+\/(.+)$/i);
  if(!m)return null;
  slug=normalize(m[1]);
 }catch{return null;}
 if(!slug)return null;

 // Capitalized explicit toponyms, not generic adjectives such as "quartier calme".
 // Narrow, two-source evidence: listing description AND same named toponym in canonical URL slug.
 const re=/[Qq]uartier\s+(?:(?:(?:très\s+)?(?:prisé|recherché|prestigieux|résidentiel|calme|dynamique|renommé))\s+(?:et\s+(?:très\s+)?recherché\s+)?(?:de|du|des)\s+|(?:de|du|des)\s+)?([A-ZÀ-Þ][\p{L}\p{M}’'-]*(?:\s+[A-ZÀ-Þ][\p{L}\p{M}’'-]*){0,2})(?=\s|[,.;:!?–—-]|$)/gu;
 const values=new Map<string,string>();
 for(const m of description.matchAll(re)){
  const value=m[1].trim();
  const key=normalize(value);
  if(!key||key===normalize(city)||!plausibleMubawabDistrict(value))continue;
  if(!("-"+slug+"-").includes("-"+key+"-"))continue;
  values.set(key,value);
  if(values.size>1)return null;
 }
 if(values.size!==1)return null;
 return {value:[...values.values()][0],evidence:"mubawab_primary_description_quartier_and_slug",confidence:"high"};
}
