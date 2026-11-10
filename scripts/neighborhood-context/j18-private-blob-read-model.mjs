/**
 * J18-F: read verified, private, content-addressed OSM objects.
 * Pure transport injection; NO public endpoint, publication or dataset activation.
 * The server route must separately enforce its local-only review gate.
 */
import {createHash} from "node:crypto";
import {parseQaBbox} from "./private-national-qa-tiles.mjs";

const SCHEMA="AKARFINDER_J18_INDICATIVE_RELEASE_CANDIDATE_V1";
const STATE="REVIEW_CANDIDATE_ONLY_NOT_PUBLIC";
const CATEGORIES=Object.freeze(["education","green_sport","groceries","health","shopping","transport"]);
const MAX_CELLS=64,MAX_LIMIT=180,MAX_TILE_BYTES=650000,MAX_MANIFEST_BYTES=600000;
const sha=bytes=>createHash("sha256").update(bytes).digest("hex");
const hex=s=>typeof s==="string"&&/^[a-f0-9]{64}$/.test(s);
const fail=s=>{throw Error("j18_blob_"+s);};

function coordCell(lon,lat){
 if(!Number.isFinite(lon)||!Number.isFinite(lat)||Math.abs(lon)>180||Math.abs(lat)>90)throw new RangeError("invalid_coordinates");
 return [Math.min(7199,Math.floor((lon+180)*20)),Math.min(3599,Math.floor((lat+90)*20))];
}
function bounded(bytes,limit){
 if(!(bytes instanceof Uint8Array)||bytes.byteLength<1||bytes.byteLength>limit)fail("object_size");
 return Buffer.from(bytes);
}
function validateManifest(m,sourceSha,now){
 if(m?.schema!==SCHEMA||m.state!==STATE||
   m.publicationAuthorized!==false||m.publicEndpointEnabled!==false||
   m.source!=="OpenStreetMap via Geofabrik"||
   m.sourceSha256!==sourceSha||m.attribution!=="© OpenStreetMap contributors"||
   m.license!=="ODbL-1.0"||m.sourceFreshnessMeansBusinessIsOpen!==false||
   m.businessOperatingStatusCertified!==false||
   m.officialNeighborhoodMembershipCertified!==false||
   m.entrancePrecisionCertified!==false||m.cellSizeDegrees!==0.05||
   !Number.isSafeInteger(m.tileCount)||m.tileCount<1||m.tileCount>10000||
   !Number.isSafeInteger(m.featureCount)||m.featureCount<1||
   !m.tiles||typeof m.tiles!=="object"||Array.isArray(m.tiles)||
   Object.keys(m.tiles).length!==m.tileCount)fail("manifest_invalid");
 const replication=Date.parse(m.pbfReplicationAt),expires=Date.parse(m.expiresAt);
 if(!Number.isFinite(replication)||!Number.isFinite(expires)||
   !Number.isFinite(now)||replication>now||expires<=now||
   expires!==replication+30*86400000)fail("snapshot_expired");
}
function validateFeature(f,x,y){
 const c=f?.geometry?.coordinates,p=f?.properties;
 if(f?.type!=="Feature"||f.geometry?.type!=="Point"||
   !Array.isArray(c)||c.length!==2||!c.every(Number.isFinite)||
   !p||typeof p!=="object"||Array.isArray(p)||
   typeof p.osmId!=="string"||!/^(node|way|relation)\/[1-9]\d*$/.test(p.osmId)||
   typeof p.name!=="string"||!p.name.trim()||p.name.length>200||
   /[\u0000-\u001f]/.test(p.name)||!CATEGORIES.includes(p.category)||
   p.sourceUrl!=="https://www.openstreetmap.org/"+p.osmId||
   !["osm-node","indicative-area-point"].includes(p.positionType)||
   p.currentlyOpen!==null||p.officialQuarterMembership!==null||
   coordCell(c[0],c[1]).join(":")!==[x,y].join(":"))fail("feature_invalid");
 return f;
}
/**
 * Cache object bytes ONLY after content SHA verified, with LRU eviction and
 * hard size/TTL caps. Expiry of the OSM snapshot is ALWAYS checked per request,
 * even for cache hits. The cache never makes a candidate publishable.
 */
export function createJ18PrivateBlobReadModel({
 readObject,sourceSha,manifestSha,clock=()=>Date.now(),
 maxCacheBytes=4000000,cacheTtlMs=30000
}){
 if(typeof readObject!=="function"||!hex(sourceSha)||!hex(manifestSha)||
    !Number.isSafeInteger(maxCacheBytes)||maxCacheBytes<650000||maxCacheBytes>16000000||
    !Number.isSafeInteger(cacheTtlMs)||cacheTtlMs<1000||cacheTtlMs>60000)throw new RangeError("j18_blob_config_invalid");
 const prefix="osm-indicative/v1/"+sourceSha+"/";
 const manifestPath=prefix+"manifest-"+manifestSha+".json";
 const cache=new Map();
 const pending=new Map();
 let total=0;
 async function fetchVerified(path,expected,maxBytes){
  const now=clock();
  const found=cache.get(path);
  if(found && found.validUntil>now){
   cache.delete(path);cache.set(path,found);
   return found.bytes;
  }
  if(found){cache.delete(path);total-=found.bytes.length;}
  if(pending.has(path))return pending.get(path);
  const task=(async()=>{
   const bytes=bounded(await readObject(path,maxBytes),maxBytes);
   if(sha(bytes)!==expected)fail("checksum");
   const lifetime=Math.min(cacheTtlMs,60000);
   if(bytes.length<=maxCacheBytes){
    while(total+bytes.length>maxCacheBytes&&cache.size){
     const oldest=cache.keys().next().value;
     const previous=cache.get(oldest);
     cache.delete(oldest);total-=previous.bytes.length;
    }
    cache.set(path,{bytes,validUntil:clock()+lifetime});total+=bytes.length;
   }
   return bytes;
  })();
  pending.set(path,task);
  try{return await task;}finally{pending.delete(path);}
 }
 async function query({bbox,limit=180}){
  if(!Number.isInteger(limit)||limit<1||limit>MAX_LIMIT)throw new RangeError("j18_blob_invalid_limit");
  const coords=parseQaBbox(bbox);
  const [x0,y0]=coordCell(coords[0],coords[1]);
  const [x1,y1]=coordCell(coords[2],coords[3]);
  if((x1-x0+1)*(y1-y0+1)>MAX_CELLS)throw new RangeError("j18_blob_bbox_too_large");
  const manifestBytes=await fetchVerified(manifestPath,manifestSha,MAX_MANIFEST_BYTES);
  const m=JSON.parse(manifestBytes.toString("utf8"));
  validateManifest(m,sourceSha,clock());
  const seen=new Set(),groups=new Map(CATEGORIES.map(c=>[c,[]]));
  for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){
   const key=x+":"+y,entry=m.tiles[key];
   if(!entry)continue;
   const base="tiles/"+String(x).padStart(4,"0")+"/"+String(y).padStart(4,"0");
   if(entry.path!==base+".json"||!hex(entry.sha256)||
      !Number.isSafeInteger(entry.count)||entry.count<1||entry.count>10000)fail("tile_manifest_invalid");
   // A signed next-snapshot manifest may reuse an unchanged tile from an older source.
   // The tile SHA remains verified; the origin source SHA is never a free-form URL.
   const blobSourceSha=entry.blobSourceSha256??sourceSha;
   if(!hex(blobSourceSha))fail("tile_manifest_invalid");
   const path="osm-indicative/v1/"+blobSourceSha+"/"+base+"-"+entry.sha256+".json";
   const tileBytes=await fetchVerified(path,entry.sha256,MAX_TILE_BYTES);
   const tile=JSON.parse(tileBytes.toString("utf8"));
   if(tile?.schema!==SCHEMA||tile.state!==STATE||
      !Array.isArray(tile.features)||tile.features.length!==entry.count)fail("tile_integrity");
   for(const raw of tile.features){
    const f=validateFeature(raw,x,y),p=f.properties,[lon,lat]=f.geometry.coordinates;
    if(lon<coords[0]||lon>coords[2]||lat<coords[1]||lat>coords[3])continue;
    if(seen.has(p.osmId))fail("duplicate_feature");
    seen.add(p.osmId);groups.get(p.category).push(f);
   }
  }
  for(const rows of groups.values())rows.sort((a,b)=>a.properties.osmId.localeCompare(b.properties.osmId,"en"));
  const features=[];
  while(features.length<limit){
   let progressed=false;
   for(const cat of CATEGORIES){
    const candidate=groups.get(cat).shift();
    if(candidate){features.push(candidate);progressed=true;}
    if(features.length>=limit)break;
   }
   if(!progressed)break;
  }
  return {schema:SCHEMA,state:"J18_PRIVATE_BLOB_LOCAL_REVIEW",
   publicationAuthorized:false,source:m.source,sourceSha256:sourceSha,
   manifestSha256:manifestSha,pbfReplicationAt:m.pbfReplicationAt,expiresAt:m.expiresAt,
   attribution:m.attribution,license:m.license,
   businessOperatingStatusCertified:false,officialNeighborhoodMembershipCertified:false,
   entrancePrecisionCertified:false,features};
 }
 return {query,manifestPath,cacheStats:()=>({entries:cache.size,bytes:total})};
}
