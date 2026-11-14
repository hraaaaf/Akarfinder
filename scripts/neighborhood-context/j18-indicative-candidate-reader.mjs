/**
 * J18-B: offline read-only, bounded viewport query over a verified release CANDIDATE.
 * This module MUST NOT be connected to an unauthenticated public route without a
 * distinct publication gate, approved distribution and explicit source release.
 */
import {createHash} from "node:crypto";
import {readFile,stat} from "node:fs/promises";
import {isAbsolute,join} from "node:path";
import {parseQaBbox} from "./private-national-qa-tiles.mjs";
// Reader intentionally does not import the offline builder (no filesystem write code in the HTTP bundle).
const CANDIDATE_SCHEMA="AKARFINDER_J18_INDICATIVE_RELEASE_CANDIDATE_V1";
const CANDIDATE_STATE="REVIEW_CANDIDATE_ONLY_NOT_PUBLIC";

const MAX_READ_CELLS=64,MAX_FILE_BYTES=650000;
const CATEGORIES=Object.freeze(["education","green_sport","groceries","health","shopping","transport"]);
const sha=b=>createHash("sha256").update(b).digest("hex");
function cell(lon,lat){
 if(!Number.isFinite(lon)||!Number.isFinite(lat)||Math.abs(lon)>180||Math.abs(lat)>90)throw new RangeError("invalid_coordinates");
 return [Math.min(7199,Math.floor((lon+180)*20)),Math.min(3599,Math.floor((lat+90)*20))];
}
async function readSafeJson(path,max=MAX_FILE_BYTES){
 const s=await stat(path);
 if(!s.isFile()||s.size<1||s.size>max)throw Error("j18_read_file_size");
 const bytes=await readFile(path);
 return {bytes,doc:JSON.parse(bytes.toString("utf8"))};
}
function validateManifest(m,expectedSourceSha,now){
 if(m?.schema!==CANDIDATE_SCHEMA||m.state!==CANDIDATE_STATE||
    m.publicationAuthorized!==false||m.publicEndpointEnabled!==false||
    m.source!=="OpenStreetMap via Geofabrik"||
    m.attribution!=="© OpenStreetMap contributors"||m.license!=="ODbL-1.0"||
    m.businessOperatingStatusCertified!==false||m.officialNeighborhoodMembershipCertified!==false||
    m.entrancePrecisionCertified!==false||m.sourceFreshnessMeansBusinessIsOpen!==false||
    m.sourceSha256!==expectedSourceSha||!/^[a-f0-9]{64}$/.test(expectedSourceSha??"")||
    m.cellSizeDegrees!==0.05||
    !m.tiles||typeof m.tiles!=="object"||Array.isArray(m.tiles)||
    Object.keys(m.tiles).length!==m.tileCount||
    !Number.isSafeInteger(m.featureCount)||m.featureCount<1)throw Error("j18_unapproved_candidate");
 const replicated=Date.parse(m.pbfReplicationAt),expires=Date.parse(m.expiresAt),current=now.getTime();
 if(!Number.isFinite(replicated)||!Number.isFinite(expires)||!Number.isFinite(current)||
    replicated>current||expires<=current||expires!==replicated+30*86400000)throw Error("j18_candidate_stale");
}
function safeFeature(f,x,y){
 const p=f?.properties,c=f?.geometry?.coordinates;
 if(f?.type!=="Feature"||f?.geometry?.type!=="Point"||
    !Array.isArray(c)||c.length!==2||!c.every(Number.isFinite)||
    !p||typeof p!=="object"||typeof p.osmId!=="string"||
    !/^(node|way|relation)\/[1-9]\d*$/.test(p.osmId)||
    !CATEGORIES.includes(p.category)||typeof p.name!=="string"||!p.name.trim()||p.name.length>200||
    p.sourceUrl!=="https://www.openstreetmap.org/"+p.osmId||
    !["osm-node","indicative-area-point"].includes(p.positionType)||
    p.currentlyOpen!==null||p.officialQuarterMembership!==null||
    cell(c[0],c[1]).join(":")!==[x,y].join(":"))throw Error("j18_candidate_feature_invalid");
 return f;
}
export async function queryJ18IndicativeCandidate({directory,expectedSourceSha,bbox,limit=180,now=new Date()}){
 if(typeof directory!=="string"||!isAbsolute(directory)||!Number.isInteger(limit)||limit<1||limit>180)throw new RangeError("j18_invalid_request");
 const coords=parseQaBbox(bbox);
 const [x0,y0]=cell(coords[0],coords[1]),[x1,y1]=cell(coords[2],coords[3]);
 if((x1-x0+1)*(y1-y0+1)>MAX_READ_CELLS)throw new RangeError("j18_bbox_too_large");
 const {doc:m}=await readSafeJson(join(directory,"manifest.json"),1000000);
 validateManifest(m,expectedSourceSha,now);
 const seen=new Set(),byCategory=new Map(CATEGORIES.map(c=>[c,[]]));
 for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){
   const key=x+":"+y,entry=m.tiles[key];
   if(!entry)continue;
   const rel="tiles/"+String(x).padStart(4,"0")+"/"+String(y).padStart(4,"0")+".json";
   if(entry.path!==rel||!/^[a-f0-9]{64}$/.test(entry.sha256??"")||
      !Number.isSafeInteger(entry.count)||entry.count<1)throw Error("j18_invalid_tile_manifest");
   const {bytes,doc:tile}=await readSafeJson(join(directory,rel));
   if(sha(bytes)!==entry.sha256||tile.schema!==CANDIDATE_SCHEMA||
      tile.state!==CANDIDATE_STATE||!Array.isArray(tile.features)||tile.features.length!==entry.count)throw Error("j18_tile_integrity");
   for(const raw of tile.features){
     const f=safeFeature(raw,x,y),p=f.properties,[lon,lat]=f.geometry.coordinates;
     if(lon<coords[0]||lon>coords[2]||lat<coords[1]||lat>coords[3])continue;
     if(seen.has(p.osmId))throw Error("j18_duplicate_osm_id");
     seen.add(p.osmId);byCategory.get(p.category).push(f);
   }
 }
 for(const rows of byCategory.values())rows.sort((a,b)=>a.properties.osmId.localeCompare(b.properties.osmId,"en"));
 const features=[];
 while(features.length<limit){
  let advanced=false;
  for(const cat of CATEGORIES){
    const f=byCategory.get(cat).shift();
    if(f){features.push(f);advanced=true;}
    if(features.length>=limit)break;
  }
  if(!advanced)break;
 }
 return {schema:CANDIDATE_SCHEMA,state:CANDIDATE_STATE,
   source:m.source,sourceSha256:m.sourceSha256,pbfReplicationAt:m.pbfReplicationAt,expiresAt:m.expiresAt,
   attribution:m.attribution,license:m.license,businessOperatingStatusCertified:false,
   officialNeighborhoodMembershipCertified:false,entrancePrecisionCertified:false,
   publicationAuthorized:false,features};
}
