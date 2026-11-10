/**
 * J18-G: deterministic OFFLINE differential OSM Blob plan.
 * No SDK, network, credentials, deletion or publication.
 * Reused refs REQUIRE independent remote existence proof before any activation.
 */
import {createHash} from "node:crypto";
import {access,lstat,mkdir,readFile,realpath,rename,rm,writeFile} from "node:fs/promises";
import {dirname,join,resolve,sep} from "node:path";
import {fileURLToPath} from "node:url";

export const DIFF_SCHEMA="AKARFINDER_J18G_DIFFERENTIAL_REVIEW_PLAN_V1";
const SCHEMA="AKARFINDER_J18_INDICATIVE_RELEASE_CANDIDATE_V1";
const STATE="REVIEW_CANDIDATE_ONLY_NOT_PUBLIC";
const ROOT=resolve(fileURLToPath(new URL("../../",import.meta.url)));
const PREFIX="osm-indicative/v1/";
const DAY_MS=86400000,MAX_TILE=650000,MAX_MANIFEST=1000000;
const hex=(v,n=64)=>typeof v==="string"&&new RegExp("^[0-9a-f]{"+n+"}$").test(v);
const sha=bytes=>createHash("sha256").update(bytes).digest("hex");
const fail=reason=>{throw new Error("j18g_"+reason);};
const iso=v=>typeof v==="string"&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
async function exists(path){try{await access(path);return true;}catch{return false;}}
function under(path,root){
 const p=path.toLowerCase(),r=root.toLowerCase();
 return p===r||p.startsWith(r+sep);
}
async function readJson(path,maxBytes){
 const s=await lstat(path);
 if(!s.isFile()||s.isSymbolicLink()||s.size<1||s.size>maxBytes)fail("file_size");
 const bytes=await readFile(path);
 return JSON.parse(bytes.toString("utf8"));
}
function validateManifest(m,expectedSourceSha,{now,allowExpired=false}){
 if(m?.schema!==SCHEMA||m.state!==STATE||
   m.publicationAuthorized!==false||m.publicEndpointEnabled!==false||
   m.source!=="OpenStreetMap via Geofabrik"||
   m.license!=="ODbL-1.0"||m.attribution!=="© OpenStreetMap contributors"||
   m.sourceFreshnessMeansBusinessIsOpen!==false||
   m.businessOperatingStatusCertified!==false||
   m.officialNeighborhoodMembershipCertified!==false||
   m.entrancePrecisionCertified!==false||
   !hex(m.sourceSha256)||!hex(m.sourceMd5,32)||m.sourceSha256!==expectedSourceSha||
   !iso(m.pbfReplicationAt)||!iso(m.expiresAt)||
   Date.parse(m.expiresAt)!==Date.parse(m.pbfReplicationAt)+30*DAY_MS||
   Date.parse(m.pbfReplicationAt)>now||
   (!allowExpired&&Date.parse(m.expiresAt)<=now)||
   m.cellSizeDegrees!==0.05||
   !Number.isSafeInteger(m.tileCount)||m.tileCount<1||m.tileCount>10000||
   !Number.isSafeInteger(m.featureCount)||m.featureCount<1||
   !m.tiles||typeof m.tiles!=="object"||Array.isArray(m.tiles)||
   Object.keys(m.tiles).length!==m.tileCount)fail("manifest_invalid");
 let features=0;
 for(const [key,e] of Object.entries(m.tiles)){
  const parts=/^([0-9]{1,4}):([0-9]{1,4})$/.exec(key);
  if(!parts||+parts[1]>7199||+parts[2]>3599)fail("tile_key_invalid");
  const rel="tiles/"+parts[1].padStart(4,"0")+"/"+parts[2].padStart(4,"0")+".json";
  if(!e||Object.getPrototypeOf(e)!==Object.prototype||e.path!==rel||
      !hex(e.sha256)||!Number.isSafeInteger(e.count)||e.count<1||e.count>10000||
      (e.blobSourceSha256!==undefined&&!hex(e.blobSourceSha256)))fail("tile_manifest_invalid");
  features+=e.count;
 }
 if(features!==m.featureCount)fail("feature_count_invalid");
}
function objectKey(source,key,tileSha){
 const [x,y]=key.split(":");
 return PREFIX+source+"/tiles/"+x.padStart(4,"0")+"/"+y.padStart(4,"0")+"-"+tileSha+".json";
}
function safeFeature(f,key,seen){
 const p=f?.properties,c=f?.geometry?.coordinates;
 if(f?.type!=="Feature"||f.geometry?.type!=="Point"||
   !Array.isArray(c)||c.length!==2||!c.every(Number.isFinite)||
   !p||typeof p!=="object"||Array.isArray(p)||
   typeof p.osmId!=="string"||!/^(node|way|relation)\/[1-9]\d*$/.test(p.osmId)||
   seen.has(p.osmId)||typeof p.name!=="string"||!p.name.trim()||p.name.length>200||
   /[\u0000-\u001f]/.test(p.name)||
   !["education","green_sport","groceries","health","shopping","transport"].includes(p.category)||
   p.sourceUrl!=="https://www.openstreetmap.org/"+p.osmId||
   !["osm-node","indicative-area-point"].includes(p.positionType)||
   p.currentlyOpen!==null||p.officialQuarterMembership!==null)fail("feature_invalid");
 const [lon,lat]=c;
 if(lon < -180||lon>180||lat < -90||lat>90)fail("coordinates_invalid");
 const x=Math.min(7199,Math.floor((lon+180)*20));
 const y=Math.min(3599,Math.floor((lat+90)*20));
 if(key!==x+":"+y)fail("tile_membership_invalid");
 seen.add(p.osmId);
}
export async function buildJ18DifferentialPlan({
 previousDirectory,currentDirectory,previousSourceSha,currentSourceSha,outDir,
 remainingAdvancedOperations=null,now=new Date()
}){
 if(!previousDirectory||!currentDirectory||!outDir||
    !hex(previousSourceSha)||!hex(currentSourceSha)||
    !(now instanceof Date)||!Number.isFinite(now.getTime()))fail("arguments_invalid");
 if(previousSourceSha===currentSourceSha)fail("same_snapshot_no_refresh");
 if(remainingAdvancedOperations!==null&&
    (!Number.isSafeInteger(remainingAdvancedOperations)||remainingAdvancedOperations<0||remainingAdvancedOperations>100000))
   fail("budget_invalid");
 const [repo,oldDir,newDir,outParent]=await Promise.all([
  realpath(ROOT),realpath(resolve(previousDirectory)),
  realpath(resolve(currentDirectory)),realpath(dirname(resolve(outDir)))
 ]);
 if([oldDir,newDir,outParent].some(p=>under(p,repo))||
    under(outParent,oldDir)||under(outParent,newDir))fail("path_outside_repo_required");
 const output=resolve(outDir),staging=output+".part";
 if(await exists(output)||await exists(staging))fail("output_exists");
 const [previous,current]=await Promise.all([
  readJson(join(oldDir,"manifest.json"),MAX_MANIFEST),
  readJson(join(newDir,"manifest.json"),MAX_MANIFEST)
 ]);
 const timestamp=now.getTime();
 validateManifest(previous,previousSourceSha,{now:timestamp,allowExpired:true});
 validateManifest(current,currentSourceSha,{now:timestamp});
 if(Date.parse(current.pbfReplicationAt)<=Date.parse(previous.pbfReplicationAt))
   fail("replication_not_newer");
 const currentEntries={},toUpload=[],toReuse=[];
 let features=0,allBytes=0,changedBytes=0;
 const seen=new Set();
 let unchanged=0,changed=0,added=0;
 for(const [key,e] of Object.entries(current.tiles).sort((a,b)=>a[0].localeCompare(b[0],"en"))){
  const sourcePath=join(newDir,e.path),s=await lstat(sourcePath);
  if(!s.isFile()||s.isSymbolicLink()||s.size<1||s.size>MAX_TILE)fail("tile_size");
  const bytes=await readFile(sourcePath);
  if(sha(bytes)!==e.sha256)fail("tile_checksum");
  const json=JSON.parse(bytes.toString("utf8"));
  if(json?.schema!==SCHEMA||json.state!==STATE||
     !Array.isArray(json.features)||json.features.length!==e.count)fail("tile_integrity");
  for(const f of json.features)safeFeature(f,key,seen);
  allBytes+=bytes.length;features+=e.count;
  const old=previous.tiles[key];
  const canReuse=old?.sha256===e.sha256 && old.count===e.count;
  if(canReuse){
   const source=old.blobSourceSha256??previous.sourceSha256;
   if(!hex(source))fail("old_blob_source_invalid");
   currentEntries[key]={path:e.path,sha256:e.sha256,count:e.count,blobSourceSha256:source};
   toReuse.push({tile:key,objectKey:objectKey(source,key,e.sha256),
     sha256:e.sha256,count:e.count,bytes:bytes.length,remoteExistenceVerified:false});
   unchanged++;
  }else{
   currentEntries[key]={path:e.path,sha256:e.sha256,count:e.count};
   toUpload.push({tile:key,objectKey:objectKey(currentSourceSha,key,e.sha256),
     relativeSourcePath:e.path,sha256:e.sha256,count:e.count,bytes:bytes.length});
   changedBytes+=bytes.length;
   if(old)changed++;else added++;
  }
 }
 if(features!==current.featureCount||seen.size!==features)fail("feature_count");
 const removed=Object.keys(previous.tiles).filter(key=>!Object.hasOwn(current.tiles,key)).sort();
 const manifest={
  schema:SCHEMA,state:STATE,publicationAuthorized:false,publicEndpointEnabled:false,
  license:"ODbL-1.0",attribution:"© OpenStreetMap contributors",
  source:"OpenStreetMap via Geofabrik",sourceSha256:current.sourceSha256,
  sourceMd5:current.sourceMd5,pbfReplicationAt:current.pbfReplicationAt,
  expiresAt:current.expiresAt,sourceFreshnessMeansBusinessIsOpen:false,
  businessOperatingStatusCertified:false,officialNeighborhoodMembershipCertified:false,
  entrancePrecisionCertified:false,cellSizeDegrees:0.05,
  tileCount:current.tileCount,featureCount:current.featureCount,tiles:currentEntries
 };
 const manifestBytes=Buffer.from(JSON.stringify(manifest,null,2)+"\n");
 if(manifestBytes.length>600000)fail("manifest_too_large");
 const manifestSha=sha(manifestBytes);
 const minimumNewUploads=toUpload.length+1;
 const budgetStatus=remainingAdvancedOperations===null?"UNVERIFIED":
   minimumNewUploads>remainingAdvancedOperations?"OVER_DECLARED_REMAINING":"WITHIN_DECLARED_REMAINING";
 const plan={
  schema:DIFF_SCHEMA,state:"REVIEW_ONLY_NOT_UPLOADED",publicationAuthorized:false,
  networkActionsPerformed:0,deploymentPerformed:false,remoteInventoryVerified:false,
  requiresRemoteObjectExistenceProof:true,requiresHumanApprovalBeforeUpload:true,
  requiresHumanApprovalBeforePublication:true,
  previousSourceSha256:previousSourceSha,currentSourceSha256:currentSourceSha,
  replicationAt:current.pbfReplicationAt,expiresAt:current.expiresAt,
  proposedManifestSha256:manifestSha,
  proposedManifestKey:PREFIX+currentSourceSha+"/manifest-"+manifestSha+".json",
  manifestBytes:manifestBytes.length,
  counts:{previousTiles:previous.tileCount,currentTiles:current.tileCount,
   reused:unchanged,changed,added,removed:removed.length,
   newTileUploads:toUpload.length,newManifestUploads:1,
   minimumNewUploads:minimumNewUploads,previousFullUploadTiles:current.tileCount,
   avoidedTileUploads:unchanged},
  sizes:{currentTilesBytes:allBytes,newTileBytes:changedBytes,manifestBytes:manifestBytes.length},
  quota:{remainingAdvancedOperations,budgetStatus,
   note:"No Vercel usage query performed. Network LIST/HEAD and other operations are not included in minimumNewUploads."},
  reusedReferences:toReuse,newObjects:toUpload,removedTilesNotDeleted:removed
 };
 let created=false;
 try{
  await mkdir(staging);created=true;
  await writeFile(join(staging,"manifest.json"),manifestBytes);
  await writeFile(join(staging,"upload-plan.json"),JSON.stringify(plan,null,2)+"\n");
  await rename(staging,output);
 }catch(error){if(created)await rm(staging,{recursive:true,force:true});throw error;}
 return {state:plan.state,manifestSha256:manifestSha,
   counts:plan.counts,budgetStatus,output,uploadPerformed:false};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args={};
 for(let i=2;i<process.argv.length;i+=2){
  const flag=process.argv[i],value=process.argv[i+1];
  if(!["--previous","--current","--previous-sha","--current-sha","--out","--remaining-ops"].includes(flag)||
    !value||Object.hasOwn(args,flag))fail("cli_arguments");
  args[flag]=value;
 }
 if(!args["--previous"]||!args["--current"]||!args["--previous-sha"]||
    !args["--current-sha"]||!args["--out"])fail("cli_required");
 let remainingAdvancedOperations=null;
 if(args["--remaining-ops"]!==undefined){
  if(!/^(0|[1-9][0-9]*)$/.test(args["--remaining-ops"]))fail("cli_budget");
  remainingAdvancedOperations=Number(args["--remaining-ops"]);
 }
 buildJ18DifferentialPlan({
  previousDirectory:args["--previous"],currentDirectory:args["--current"],
  previousSourceSha:args["--previous-sha"],currentSourceSha:args["--current-sha"],
  outDir:args["--out"],remainingAdvancedOperations
 }).then(summary=>console.log(JSON.stringify(summary)))
   .catch(error=>{console.error(error.message);process.exitCode=1;});
}
