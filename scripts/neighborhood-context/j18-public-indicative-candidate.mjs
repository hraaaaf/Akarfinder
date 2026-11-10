/**
 * J18: offline integrity-checked indicative OSM RELEASE CANDIDATE.
 * Not a public endpoint, not a publish action, not a product database write.
 */
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { access, mkdir, readFile, realpath, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const QA_SCHEMA="AKARFINDER_OSM_LANDMARK_TILES_V1";
export const EVIDENCE_SCHEMA="AKARFINDER_J18_PBF_SOURCE_EVIDENCE_V1";
export const CANDIDATE_SCHEMA="AKARFINDER_J18_INDICATIVE_RELEASE_CANDIDATE_V1";
export const CANDIDATE_STATE="REVIEW_CANDIDATE_ONLY_NOT_PUBLIC";
const CATEGORIES=new Set(["education","green_sport","groceries","health","shopping","transport"]);
const SOURCE="Geofabrik Morocco OpenStreetMap PBF";
const ATTRIBUTION="© OpenStreetMap contributors";
const DAY_MS=86400000,MAX_AGE_DAYS=30,MAX_TILE_BYTES=600000;
const ROOT=resolve(fileURLToPath(new URL("../../",import.meta.url)));
const fail=message=>{throw new Error("j18_"+message);};
const sha=bytes=>createHash("sha256").update(bytes).digest("hex");
const hex=(v,n)=>typeof v==="string"&&new RegExp("^[0-9a-f]{"+n+"}$").test(v);
const iso=v=>typeof v==="string"&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
async function exists(path){try{await access(path);return true;}catch{return false;}}
async function limitedJson(path,maxBytes=MAX_TILE_BYTES){
  const s=await stat(path);
  if(!s.isFile()||s.size<1||s.size>maxBytes)fail("file_size_limit");
  const bytes=await readFile(path);
  return {bytes,json:JSON.parse(bytes.toString("utf8"))};
}
async function fileHashes(path){
  const md5=createHash("md5"),sha256=createHash("sha256");
  const s=await stat(path);if(!s.isFile()||s.size<1)fail("pbf_missing");
  for await(const chunk of createReadStream(path)){md5.update(chunk);sha256.update(chunk);}
  return {md5:md5.digest("hex"),sha256:sha256.digest("hex")};
}
function validateSource(m,e,h,now){
  if(m?.schema!==QA_SCHEMA||m.state!=="PRIVATE_QA_ONLY"||
     m.source!==SOURCE||m.license!=="ODbL-1.0"||m.attribution!==ATTRIBUTION||
     m.cellSizeDegrees!==0.05||m.businessOperatingStatusCertified!==false||
     m.officialNeighborhoodMembershipCertified!==false||
     m.entrancePrecisionCertified!==false||
     !hex(m.sourceMd5,32)||!hex(m.sourceSha256,64)||
     !Number.isSafeInteger(m.tileCount)||m.tileCount<1||m.tileCount>10000||
     !Number.isSafeInteger(m.featureCount)||m.featureCount<1||
     !m.tiles||Array.isArray(m.tiles)||typeof m.tiles!=="object"||
     Object.keys(m.tiles).length!==m.tileCount)fail("private_manifest_invalid");
  if(e?.schema!==EVIDENCE_SCHEMA||e?.source!==SOURCE||
     e.sourceMd5!==m.sourceMd5||e.sourceSha256!==m.sourceSha256||
     !iso(e.pbfReplicationAt)||
     h.md5!==m.sourceMd5||h.sha256!==m.sourceSha256)fail("source_pbf_integrity");
  const age=now.getTime()-Date.parse(e.pbfReplicationAt);
  if(!Number.isFinite(age)||age<0||age>MAX_AGE_DAYS*DAY_MS)fail("source_stale_or_future");
}
function validateFeature(f,key,seen){
  const coords=f?.geometry?.coordinates,p=f?.properties;
  if(f?.type!=="Feature"||f?.geometry?.type!=="Point"||
     !Array.isArray(coords)||coords.length!==2||!coords.every(Number.isFinite)||
     !p||typeof p!=="object"||Array.isArray(p)||
     typeof p.osmId!=="string"||!/^(node|way|relation)\/[1-9]\d*$/.test(p.osmId)||
     seen.has(p.osmId)||typeof p.name!=="string"||!p.name.trim()||
     p.name.length>200||/[\u0000-\u001f]/.test(p.name)||
     !CATEGORIES.has(p.category)||
     p.sourceUrl!=="https://www.openstreetmap.org/"+p.osmId||
     !["osm-node","indicative-area-point"].includes(p.positionType)||
     p.currentlyOpen!==null||p.officialQuarterMembership!==null)fail("feature_invalid");
  const [lon,lat]=coords;
  if(lon< -180||lon>180||lat< -90||lat>90)fail("coordinate_invalid");
  const x=Math.min(7199,Math.floor((lon+180)*20)),y=Math.min(3599,Math.floor((lat+90)*20));
  if(key!==x+":"+y)fail("tile_location_mismatch");
  seen.add(p.osmId);
  return {type:"Feature",geometry:{type:"Point",coordinates:[lon,lat]},
    properties:{osmId:p.osmId,name:p.name.trim(),category:p.category,
      sourceUrl:p.sourceUrl,positionType:p.positionType,
      currentlyOpen:null,officialQuarterMembership:null}};
}
export async function buildJ18ReleaseCandidate({sourceDir,pbfPath,evidencePath,outDir,now=new Date()}){
  if(!(now instanceof Date)||!Number.isFinite(now.getTime()))fail("clock_invalid");
  const output=resolve(outDir??"");
  if(!sourceDir||!pbfPath||!evidencePath||!outDir||
     output===ROOT||output.startsWith(ROOT+sep))fail("output_must_be_outside_repo");
  // Canonicalize the existing parent: symlinks and Windows case must not bypass
  // the repository/public release gate. Operators create an external parent first.
  const parentReal=await realpath(dirname(output));
  const repoReal=await realpath(ROOT);
  const under=(path,root)=>path.toLowerCase()===root.toLowerCase()||
    path.toLowerCase().startsWith(root.toLowerCase()+sep);
  if(under(parentReal,repoReal))fail("output_must_be_outside_repo");
  const staging=output+".part";
  if(await exists(output)||await exists(staging))fail("candidate_output_exists");
  const {json:manifest}=await limitedJson(join(resolve(sourceDir),"manifest.json"));
  const {json:evidence}=await limitedJson(resolve(evidencePath),20000);
  const hashes=await fileHashes(resolve(pbfPath));
  validateSource(manifest,evidence,hashes,now);
  await mkdir(dirname(output),{recursive:true});
  const seen=new Set(),tiles={};
  let total=0,created=false;
  try{
    await mkdir(staging,{recursive:false});created=true;
    for(const [key,entry] of Object.entries(manifest.tiles).sort((a,b)=>a[0].localeCompare(b[0],"en"))){
      if(!/^\d{1,4}:\d{1,4}$/.test(key))fail("tile_key_invalid");
      const [x,y]=key.split(":").map(Number);
      const rel="tiles/"+String(x).padStart(4,"0")+"/"+String(y).padStart(4,"0")+".json";
      if(entry?.path!==rel||!hex(entry.sha256,64)||
         !Number.isSafeInteger(entry.count)||entry.count<1||entry.count>10000)fail("tile_manifest_invalid");
      const {bytes,json:tile}=await limitedJson(join(resolve(sourceDir),rel));
      if(sha(bytes)!==entry.sha256||tile?.schema!==QA_SCHEMA||
         tile.state!=="PRIVATE_QA_ONLY"||!Array.isArray(tile.features)||
         tile.features.length!==entry.count)fail("tile_integrity");
      const features=tile.features.map(f=>validateFeature(f,key,seen));
      total+=features.length;
      const serialized=Buffer.from(JSON.stringify({schema:CANDIDATE_SCHEMA,state:CANDIDATE_STATE,features})+"\n");
      if(serialized.length>MAX_TILE_BYTES)fail("candidate_tile_too_large");
      await mkdir(dirname(join(staging,rel)),{recursive:true});
      await writeFile(join(staging,rel),serialized);
      tiles[key]={path:rel,sha256:sha(serialized),count:features.length};
    }
    if(total!==manifest.featureCount||seen.size!==total)fail("feature_count_mismatch");
    const validUntil=new Date(Date.parse(evidence.pbfReplicationAt)+MAX_AGE_DAYS*DAY_MS).toISOString();
    const candidate={schema:CANDIDATE_SCHEMA,state:CANDIDATE_STATE,
      publicationAuthorized:false,publicEndpointEnabled:false,
      license:"ODbL-1.0",attribution:ATTRIBUTION,
      source:"OpenStreetMap via Geofabrik",sourceSha256:hashes.sha256,sourceMd5:hashes.md5,
      pbfReplicationAt:evidence.pbfReplicationAt,expiresAt:validUntil,
      sourceFreshnessMeansBusinessIsOpen:false,businessOperatingStatusCertified:false,
      officialNeighborhoodMembershipCertified:false,entrancePrecisionCertified:false,
      cellSizeDegrees:0.05,tileCount:Object.keys(tiles).length,featureCount:total,tiles};
    await writeFile(join(staging,"manifest.json"),JSON.stringify(candidate,null,2)+"\n");
    await rename(staging,output);
    return {status:CANDIDATE_STATE,output,tileCount:candidate.tileCount,featureCount:total,
      expiresAt:validUntil,publicEndpointEnabled:false};
  }catch(error){if(created)await rm(staging,{recursive:true,force:true});throw error;}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args={};
  for(let i=2;i<process.argv.length;i+=2){
    const key=process.argv[i],value=process.argv[i+1];
    if(!["--pack","--pbf","--evidence","--out"].includes(key)||!value)fail("cli_argument");
    args[key]=value;
  }
  buildJ18ReleaseCandidate({sourceDir:args["--pack"],pbfPath:args["--pbf"],
    evidencePath:args["--evidence"],outDir:args["--out"]})
    .then(result=>console.log(JSON.stringify(result)))
    .catch(error=>{console.error(error.message);process.exitCode=1;});
}
