/**
 * J18-D: generate a REVIEW-ONLY, content-addressed object-storage upload plan.
 * No network calls, credentials, or public object creation. The plan is NOT an upload.
 */
import {createHash} from "node:crypto";
import {readFile,stat,realpath,writeFile} from "node:fs/promises";
import {dirname,join,resolve,sep} from "node:path";
import {fileURLToPath} from "node:url";
const ROOT=resolve(fileURLToPath(new URL("../../",import.meta.url)));
const sha=b=>createHash("sha256").update(b).digest("hex");
const hex=s=>typeof s==="string"&&/^[a-f0-9]{64}$/.test(s);
const bad=s=>{throw Error("j18_cdn_"+s)};
export async function buildJ18CdnPlan({candidateDirectory,sourceSha,outFile,now=new Date()}){
 if(!candidateDirectory||!outFile||!hex(sourceSha))bad("parameters");
 const root=await realpath(ROOT),dir=await realpath(resolve(candidateDirectory));
 const parent=await realpath(dirname(resolve(outFile)));
 const inside=(p)=>p.toLowerCase()===root.toLowerCase()||p.toLowerCase().startsWith(root.toLowerCase()+sep);
 if(inside(dir)||inside(parent))bad("repo_write_or_source_forbidden");
 const manifestFile=join(dir,"manifest.json"),ms=await stat(manifestFile);
 if(!ms.isFile()||ms.size>1000000)bad("manifest_size");
 const m=JSON.parse(await readFile(manifestFile,"utf8"));
 const replication=Date.parse(m.pbfReplicationAt),expires=Date.parse(m.expiresAt);
 if(m.schema!=="AKARFINDER_J18_INDICATIVE_RELEASE_CANDIDATE_V1"||
 m.state!=="REVIEW_CANDIDATE_ONLY_NOT_PUBLIC"||m.publicationAuthorized!==false||
 m.publicEndpointEnabled!==false||m.sourceSha256!==sourceSha||m.license!=="ODbL-1.0"||
 m.attribution!=="© OpenStreetMap contributors"||m.businessOperatingStatusCertified!==false||
 m.officialNeighborhoodMembershipCertified!==false||m.entrancePrecisionCertified!==false||
 !Number.isSafeInteger(m.tileCount)||m.tileCount<1||m.tileCount>10000||
 !Number.isSafeInteger(m.featureCount)||m.featureCount<1||
 !m.tiles||typeof m.tiles!=="object"||Array.isArray(m.tiles)||
 Object.keys(m.tiles).length!==m.tileCount||
 !Number.isFinite(expires)||!Number.isFinite(replication)||
 expires!==replication+30*86400000||now.getTime()>=expires||replication>now.getTime())
 bad("manifest_invalid_or_stale");
 const entries=[];let bytes=0,count=0;
 for(const [key,entry] of Object.entries(m.tiles).sort((a,b)=>a[0].localeCompare(b[0],"en"))){
  if(!/^[0-9]{1,4}:[0-9]{1,4}$/.test(key)||!hex(entry?.sha256)||
   !Number.isSafeInteger(entry.count)||entry.count<1)bad("tile_entry_invalid");
  const [x,y]=key.split(":").map(Number);
  const rel="tiles/"+String(x).padStart(4,"0")+"/"+String(y).padStart(4,"0")+".json";
  if(entry.path!==rel)bad("tile_path_invalid");
  const file=join(dir,rel),s=await stat(file);
  if(!s.isFile()||s.size<1||s.size>650000)bad("tile_bytes_invalid");
  const data=await readFile(file);
  if(sha(data)!==entry.sha256)bad("tile_hash_invalid");
  const tile=JSON.parse(data.toString("utf8"));
  if(tile.schema!==m.schema||tile.state!==m.state||
    !Array.isArray(tile.features)||tile.features.length!==entry.count)bad("tile_data_invalid");
  entries.push({objectKey:"osm-indicative/v1/"+sourceSha+"/tiles/"+
    String(x).padStart(4,"0")+"/"+String(y).padStart(4,"0")+"-"+entry.sha256+".json",
    relativeSourcePath:rel,sha256:entry.sha256,bytes:data.length,count:entry.count});
  count+=entry.count;bytes+=data.length;
 }
 if(count!==m.featureCount)bad("feature_count_mismatch");
 const plan={schema:"AKARFINDER_J18_CDN_UPLOAD_PLAN_REVIEW_V1",
 status:"NOT_APPROVED_NOT_UPLOADED",networkActionsPerformed:0,
 publicationAuthorized:false,storageProvider:"UNSELECTED",sourceSha256:sourceSha,
 sourceReplicationAt:m.pbfReplicationAt,expiresAt:m.expiresAt,
 license:m.license,attribution:m.attribution,featureCount:count,
 objectCount:entries.length,totalObjectBytes:bytes,
 immutableKeys:true,activationPointerCreated:false,
 requiresHumanApprovalBeforeUpload:true,
 entries};
 await writeFile(outFile,JSON.stringify(plan,null,2)+"\n",{flag:"wx"});
 return {status:plan.status,objects:entries.length,bytes,features:count,
 expiresAt:plan.expiresAt,uploadPerformed:false};
}
