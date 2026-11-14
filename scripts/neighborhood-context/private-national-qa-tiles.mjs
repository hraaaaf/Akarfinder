/** Private J11-C QA-only viewport reader; no production endpoint or DB write. */
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { isAbsolute, join } from "node:path";

export const SCHEMA = "AKARFINDER_OSM_LANDMARK_TILES_V1";
export const CATEGORIES = Object.freeze(["education","green_sport","groceries","health","shopping","transport"]);
const MAX_CELLS = 64;
function cell(lon,lat) {
  if(!Number.isFinite(lon)||!Number.isFinite(lat)||Math.abs(lon)>180||Math.abs(lat)>90)throw new RangeError("invalid_coordinates");
  return [Math.min(7199,Math.floor((lon+180)*20)),Math.min(3599,Math.floor((lat+90)*20))];
}
export function parseQaBbox(value) {
  if(typeof value!=="string"||value.length>120)throw new RangeError("invalid_bbox");
  const chunks=value.split(",");
  if(chunks.length!==4||chunks.some(v=>v.trim()===""))throw new RangeError("invalid_bbox");
  const bbox=chunks.map(Number);
  if(bbox.some(v=>!Number.isFinite(v))||bbox[0]>=bbox[2]||bbox[1]>=bbox[3])throw new RangeError("invalid_bbox");
  cell(bbox[0],bbox[1]);cell(bbox[2],bbox[3]);
  return bbox;
}
async function readLimited(file,max) {
  const details=await stat(file);
  if(!details.isFile()||details.size>max)throw new Error("private_qa_file_size");
  return readFile(file);
}
function sha(buffer){return createHash("sha256").update(buffer).digest("hex");}
function checkFeature(f,x,y) {
  const coords=f?.geometry?.coordinates, p=f?.properties;
  if(f?.type!=="Feature"||f?.geometry?.type!=="Point"||!Array.isArray(coords)||coords.length!==2||
      !p||Array.isArray(p)||typeof p!=="object")throw new Error("invalid_qa_feature");
  const [lon,lat]=coords;
  if(cell(lon,lat)[0]!==x||cell(lon,lat)[1]!==y||
    typeof p.osmId!=="string"||!/^(node|way|relation)\/[1-9]\d*$/.test(p.osmId)||
    typeof p.name!=="string"||!p.name.trim()||p.name.length>200||
    !CATEGORIES.includes(p.category)||p.sourceUrl!=="https://www.openstreetmap.org/"+p.osmId||
    !["osm-node","indicative-area-point"].includes(p.positionType)||
    p.currentlyOpen!==null||p.officialQuarterMembership!==null)throw new Error("invalid_qa_feature");
}
export async function queryPrivateNationalQaPack(directory,expectedSha,bbox,limit=180) {
  if(typeof directory!=="string"||!isAbsolute(directory)||!Number.isInteger(limit)||limit<1||limit>1000||
    !Array.isArray(bbox)||bbox.length!==4||bbox.some(v=>!Number.isFinite(v))||
    bbox[0]>=bbox[2]||bbox[1]>=bbox[3])throw new RangeError("invalid_qa_request");
  const [x0,y0]=cell(bbox[0],bbox[1]), [x1,y1]=cell(bbox[2],bbox[3]);
  if((x1-x0+1)*(y1-y0+1)>MAX_CELLS)throw new RangeError("viewport_too_large");
  const manifest=JSON.parse((await readLimited(join(directory,"manifest.json"),600000)).toString("utf8"));
  if(manifest.schema!==SCHEMA||manifest.state!=="PRIVATE_QA_ONLY"||
    manifest.source!=="Geofabrik Morocco OpenStreetMap PBF"||
    manifest.license!=="ODbL-1.0"||manifest.attribution!=="© OpenStreetMap contributors"||
    !/^[a-f0-9]{64}$/.test(expectedSha??"")||manifest.sourceSha256!==expectedSha||
    !/^[a-f0-9]{32}$/.test(manifest.sourceMd5??"")||manifest.cellSizeDegrees!==0.05||
    manifest.businessOperatingStatusCertified!==false||
    manifest.officialNeighborhoodMembershipCertified!==false||
    manifest.entrancePrecisionCertified!==false||!manifest.tiles||Array.isArray(manifest.tiles)||
    typeof manifest.tiles!=="object")throw new Error("invalid_qa_provenance");
  const groups=new Map(CATEGORIES.map(cat=>[cat,[]])),seen=new Set();
  for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){
    const key=x+":"+y, rel="tiles/"+String(x).padStart(4,"0")+"/"+String(y).padStart(4,"0")+".json";
    const entry=manifest.tiles[key];
    if(!entry)continue;
    if(entry.path!==rel||!/^[a-f0-9]{64}$/.test(entry.sha256??"")||
      !Number.isInteger(entry.count)||entry.count<1)throw new Error("invalid_qa_tile_manifest");
    const bytes=await readLimited(join(directory,rel),600000);
    if(sha(bytes)!==entry.sha256)throw new Error("qa_tile_checksum_mismatch");
    const tile=JSON.parse(bytes.toString("utf8"));
    if(tile.schema!==SCHEMA||tile.state!=="PRIVATE_QA_ONLY"||
      !Array.isArray(tile.features)||tile.features.length!==entry.count)throw new Error("invalid_qa_tile_schema");
    for(const f of tile.features){
      checkFeature(f,x,y);
      const [lon,lat]=f.geometry.coordinates;
      if(lon<bbox[0]||lon>bbox[2]||lat<bbox[1]||lat>bbox[3])continue;
      if(seen.has(f.properties.osmId))throw new Error("duplicate_osm_id");
      seen.add(f.properties.osmId);groups.get(f.properties.category).push(f);
    }
  }
  for(const rows of groups.values())rows.sort((a,b)=>a.properties.osmId.localeCompare(b.properties.osmId,"en"));
  const features=[];
  while(features.length<limit){
    let advanced=false;
    for(const cat of CATEGORIES){
      const f=groups.get(cat).shift();
      if(f){features.push(f);advanced=true;}
      if(features.length===limit)break;
    }
    if(!advanced)break;
  }
  return {schema:"AKARFINDER_OSM_INDICATIVE_LANDMARKS_V1",ok:true,
    state:"PRIVATE_CANDIDATE_NO_DB_OR_UI_WRITE",label:"Repères à proximité",
    source:"OpenStreetMap via Geofabrik",attribution:"© OpenStreetMap contributors",
    license:"ODbL-1.0",licenseUrl:"https://www.openstreetmap.org/copyright",
    officialNeighborhoodMembershipCertified:false,businessOperatingStatusCertified:false,
    entrancePrecisionCertified:false,sourceSha256:manifest.sourceSha256,features};
}
