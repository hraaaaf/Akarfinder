/**
 * A municipal cartography point is a source of a *possible cross-reference*,
 * not verified independent-source lineage, activity, entrance GPS or licence.
 * This module never approves an OSM candidate for publication.
 */
export const CASAMAPS_QA_SCHEMA="AKARFINDER_MAARIF_CASAMAPS_MATCH_QA_V1";
const GENERIC=new Set(["pharmacie","lycee","ecole","college","institut","institution",
 "club","sport","salle","fitness","centre","commercial","de","des","du","la","le","al","el","et","pour"]);

export function normalizedName(value){
 if(typeof value!=="string" || value.length>250)return "";
 return value.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase()
   .replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim();
}
export function distinctiveName(value){
 return normalizedName(value).split(" ").filter(t=>t.length>1&&!GENERIC.has(t)).map(t=>t.replace(/^oua/,"wa")).join(" ");
}
export function normalizedLevenshteinSimilarity(left,right){
 if(!left||!right||left.length>150||right.length>150)return 0;
 const a=Array.from({length:right.length+1},(_,i)=>i);
 for(let i=1;i<=left.length;i++){
   let prev=a[0];a[0]=i;
   for(let j=1;j<=right.length;j++){
     const old=a[j];
     a[j]=Math.min(a[j]+1,a[j-1]+1,prev+(left[i-1]===right[j-1]?0:1));
     prev=old;
   }
 }
 return 1-a[right.length]/Math.max(left.length,right.length);
}
export function metersHaversine(a,b){
 const toRad=Math.PI/180;
 const lat1=a.lat*toRad,lat2=b.lat*toRad;
 const dlat=(b.lat-a.lat)*toRad,dlon=(b.lon-a.lon)*toRad;
 const p=Math.sin(dlat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dlon/2)**2;
 return 12742017.6*Math.asin(Math.min(1,Math.sqrt(p)));
}
export function compareMunicipalToOsm({osmId,osmName,osmPoint,municipalName,municipalPoint,municipalSourceUrl}){
 const out={
  schema:CASAMAPS_QA_SCHEMA,osmId,
  outcome:"NO_RELIABLE_MATCH",
  distanceMeters:null,distinctiveSimilarity:0,
  lineageIndependentFromOsmVerified:false,
  municipalSourceLastEditedVerified:false,
  currentOperationVerified:false,
  exactEntranceGpsCertified:false,
  centralMaarifTerritoryCertified:false,
  publicationAllowed:false,
  noDatabaseWrite:true,
 };
 const url=typeof municipalSourceUrl==="string" ? municipalSourceUrl : "";
 if(!/^(node|way|relation)\/[1-9]\d*$/u.test(osmId||"") ||
   !url.startsWith("https://maarif.casablancacity.ma/") ||
   typeof osmName!=="string"||typeof municipalName!=="string")return out;
 const points=[osmPoint,municipalPoint];
 if(points.some(p=>!p||!Number.isFinite(p.lat)||!Number.isFinite(p.lon)||
    Math.abs(p.lat)>90||Math.abs(p.lon)>180))return out;
 const distance=metersHaversine(osmPoint,municipalPoint);
 const names=[distinctiveName(osmName),distinctiveName(municipalName)];
 const similarity=normalizedLevenshteinSimilarity(...names);
 out.distanceMeters=Math.round(distance*10)/10;
 out.distinctiveSimilarity=Math.round(similarity*1000)/1000;
 if(names.every(Boolean) && distance<=150 && similarity>=0.70){
   out.outcome="POTENTIAL_CORRESPONDENCE_REVIEW_REQUIRED";
 }
 return out;
}
