import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {mkdtemp,mkdir,readFile,rm,symlink,writeFile} from "node:fs/promises";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {fileURLToPath} from "node:url";
import {buildJ18DifferentialPlan} from "../j18-differential-plan.mjs";
import {createJ18PrivateBlobReadModel} from "../j18-private-blob-read-model.mjs";
const sha=b=>createHash("sha256").update(b).digest("hex");
const OLD="a".repeat(64),NEXT="b".repeat(64),ANCESTOR="f".repeat(64);
const oldTime="2026-11-08T21:21:00.000Z",nextTime="2026-11-09T21:21:00.000Z";
const expiry=t=>new Date(Date.parse(t)+30*86400000).toISOString();
const state="REVIEW_CANDIDATE_ONLY_NOT_PUBLIC";
const schema="AKARFINDER_J18_INDICATIVE_RELEASE_CANDIDATE_V1";
const now=new Date("2026-11-10T23:00:00.000Z");
const point=(num,name,lon)=>({
 type:"Feature",geometry:{type:"Point",coordinates:[lon,33.59]},
 properties:{osmId:"node/"+num,name,category:"education",sourceUrl:"https://www.openstreetmap.org/node/"+num,
 positionType:"osm-node",currentlyOpen:null,officialQuarterMembership:null}
});
const spots=[
 {tile:"3447:2471",x:"3447",y:"2471",features:[point(301,"École A",-7.631)]},
 {tile:"3448:2471",x:"3448",y:"2471",features:[point(302,"École B",-7.58)]},
 {tile:"3449:2471",x:"3449",y:"2471",features:[point(303,"École C",-7.53)]}
];
const tileBytes=features=>Buffer.from(JSON.stringify({schema,state,features})+"\n");
function manifest(source,t,entries){
 return {schema,state,publicationAuthorized:false,publicEndpointEnabled:false,
  license:"ODbL-1.0",attribution:"© OpenStreetMap contributors",
  source:"OpenStreetMap via Geofabrik",sourceSha256:source,
  sourceMd5:(source===OLD?"c":"d").repeat(32),
  pbfReplicationAt:t,expiresAt:expiry(t),
  sourceFreshnessMeansBusinessIsOpen:false,
  businessOperatingStatusCertified:false,officialNeighborhoodMembershipCertified:false,
  entrancePrecisionCertified:false,cellSizeDegrees:0.05,
  tileCount:Object.keys(entries).length,
  featureCount:Object.values(entries).reduce((sum,e)=>sum+e.count,0),tiles:entries};
}
async function writeSnapshot(directory,source,t,spotsToUse,opts={}){
 const entries={};
 for(const p of spotsToUse){
  const path="tiles/"+p.x+"/"+p.y+".json";
  const bytes=tileBytes(p.features);
  await mkdir(join(directory,"tiles",p.x),{recursive:true});
  await writeFile(join(directory,path),bytes);
  entries[p.tile]={path,sha256:sha(bytes),count:p.features.length};
  if(opts.ancestorFor===p.tile)entries[p.tile].blobSourceSha256=ANCESTOR;
 }
 const m=manifest(source,t,entries);
 await writeFile(join(directory,"manifest.json"),JSON.stringify(m,null,2)+"\n");
 return m;
}
async function fixture(){
 const root=await mkdtemp(join(tmpdir(),"j18g-differential-"));
 const previousDirectory=join(root,"old"),currentDirectory=join(root,"new"),outDir=join(root,"diff");
 await Promise.all([mkdir(previousDirectory),mkdir(currentDirectory)]);
 const previous=await writeSnapshot(previousDirectory,OLD,oldTime,spots.slice(0,2));
 const changed={...spots[1],features:[point(302,"École B actualisée",-7.58)]};
 const current=await writeSnapshot(currentDirectory,NEXT,nextTime,[spots[0],changed,spots[2]]);
 return {root,previousDirectory,currentDirectory,outDir,previous,current};
}
async function inFixture(fn){
 const f=await fixture();
 try{await fn(f);}finally{await rm(f.root,{recursive:true,force:true});}
}
const args=f=>({previousDirectory:f.previousDirectory,currentDirectory:f.currentDirectory,
 previousSourceSha:OLD,currentSourceSha:NEXT,outDir:f.outDir,now});
const readPlan=f=>readFile(join(f.outDir,"upload-plan.json"),"utf8").then(JSON.parse);
const readManifest=f=>readFile(join(f.outDir,"manifest.json"),"utf8").then(JSON.parse);
test("J18-G reuses unchanged object by SHA; only changed+new tiles and manifest require PUT",()=>inFixture(async f=>{
 const result=await buildJ18DifferentialPlan(args(f)),p=await readPlan(f),m=await readManifest(f);
 assert.deepEqual(result.counts,{previousTiles:2,currentTiles:3,reused:1,
  changed:1,added:1,removed:0,newTileUploads:2,newManifestUploads:1,
  minimumNewUploads:3,previousFullUploadTiles:3,avoidedTileUploads:1});
 assert.equal(p.newObjects.length,2);
 assert.equal(p.reusedReferences.length,1);
 assert.match(p.reusedReferences[0].objectKey,new RegExp("^osm-indicative/v1/"+OLD+"/"));
 assert.match(p.newObjects[0].objectKey,new RegExp("^osm-indicative/v1/"+NEXT+"/"));
 assert.equal(p.remoteInventoryVerified,false);
 assert.equal(p.reusedReferences[0].remoteExistenceVerified,false);
 assert.equal(p.networkActionsPerformed,0);
 assert.equal(p.publicationAuthorized,false);
 assert.equal(p.state,"REVIEW_ONLY_NOT_UPLOADED");
 assert.equal(m.tiles["3447:2471"].blobSourceSha256,OLD);
 assert.equal(m.tiles["3448:2471"].blobSourceSha256,undefined);
 assert.equal(m.tileCount,3);
 assert.equal(result.manifestSha256,sha(await readFile(join(f.outDir,"manifest.json"))));
 assert.equal(p.quota.budgetStatus,"UNVERIFIED");
}));
test("J18-G declared remaining quota never grants upload permission",()=>inFixture(async f=>{
 const result=await buildJ18DifferentialPlan({...args(f),remainingAdvancedOperations:2});
 const p=await readPlan(f);
 assert.equal(result.budgetStatus,"OVER_DECLARED_REMAINING");
 assert.equal(p.quota.remainingAdvancedOperations,2);
 assert.equal(p.requiresHumanApprovalBeforeUpload,true);
 assert.equal(p.requiresHumanApprovalBeforePublication,true);
 assert.equal(result.uploadPerformed,false);
}));
test("J18-G with sufficient declared remaining capacity still requires remote presence proof",()=>inFixture(async f=>{
 const r=await buildJ18DifferentialPlan({...args(f),remainingAdvancedOperations:3});
 const p=await readPlan(f);
 assert.equal(r.budgetStatus,"WITHIN_DECLARED_REMAINING");
 assert.equal(p.remoteInventoryVerified,false);
 assert.equal(p.networkActionsPerformed,0);
}));
test("J18-G preserves older content-addressed reference across three snapshots",()=>inFixture(async f=>{
 const old=await readFile(join(f.previousDirectory,"manifest.json"),"utf8");
 const m=JSON.parse(old);
 m.tiles["3447:2471"].blobSourceSha256=ANCESTOR;
 await writeFile(join(f.previousDirectory,"manifest.json"),JSON.stringify(m));
 await buildJ18DifferentialPlan(args(f));
 const next=await readManifest(f);
 assert.equal(next.tiles["3447:2471"].blobSourceSha256,ANCESTOR);
 const p=await readPlan(f);
 assert.ok(p.reusedReferences[0].objectKey.includes("/"+ANCESTOR+"/"));
}));
test("J18-G new manifest is readable by J18-F private reader using previous+new blobs",()=>inFixture(async f=>{
 await buildJ18DifferentialPlan(args(f));
 const next=await readManifest(f);
 const mbytes=await readFile(join(f.outDir,"manifest.json"));
 const mh=sha(mbytes);
 const prefix="osm-indicative/v1/";
 const memory=new Map([[prefix+NEXT+"/manifest-"+mh+".json",mbytes]]);
 for(const [key,entry] of Object.entries(next.tiles)){
  const source=entry.blobSourceSha256??NEXT;
  const [x,y]=key.split(":");
  const p=prefix+source+"/tiles/"+x.padStart(4,"0")+"/"+y.padStart(4,"0")+"-"+entry.sha256+".json";
  memory.set(p,await readFile(join(f.currentDirectory,entry.path)));
 }
 const model=createJ18PrivateBlobReadModel({
  readObject:async path=>{if(!memory.has(path))throw Error("MISSING_PRIVATE_OBJECT");return memory.get(path);},
  sourceSha:NEXT,manifestSha:mh,clock:()=>now.getTime()});
 const response=await model.query({bbox:"-7.66,33.57,-7.49,33.62",limit:180});
 assert.equal(response.features.length,3);
 assert.equal(response.publicationAuthorized,false);
 assert.equal(response.businessOperatingStatusCertified,false);
}));
test("J18-G rejects tampered changed tiles and never creates output",()=>inFixture(async f=>{
 await writeFile(join(f.currentDirectory,"tiles","3448","2471.json"),"{}");
 await assert.rejects(buildJ18DifferentialPlan(args(f)),/j18g_tile_checksum/);
 await assert.rejects(readPlan(f),/ENOENT/);
}));
test("J18-G refuses expired next source, even if old expired reuse is allowed",()=>inFixture(async f=>{
 await assert.rejects(buildJ18DifferentialPlan({...args(f),
  now:new Date("2027-01-10T00:00:00.000Z")}),/j18g_manifest_invalid/);
}));
test("J18-G refuses older or same-time replication",()=>inFixture(async f=>{
 const m=f.current;
 m.pbfReplicationAt=oldTime;
 m.expiresAt=expiry(oldTime);
 await writeFile(join(f.currentDirectory,"manifest.json"),JSON.stringify(m));
 await assert.rejects(buildJ18DifferentialPlan(args(f)),/j18g_replication_not_newer/);
}));
test("J18-G refuses same source digest rather than duplicating uploads",()=>inFixture(async f=>{
 await assert.rejects(buildJ18DifferentialPlan({...args(f),currentSourceSha:OLD}),/j18g_same_snapshot_no_refresh/);
}));
test("J18-G refuses a modified source SHA not matching candidate",()=>inFixture(async f=>{
 await assert.rejects(buildJ18DifferentialPlan({...args(f),currentSourceSha:"f".repeat(64)}),/j18g_manifest_invalid/);
}));
test("J18-G rejects stale output overwrite",()=>inFixture(async f=>{
 await buildJ18DifferentialPlan(args(f));
 await assert.rejects(buildJ18DifferentialPlan(args(f)),/j18g_output_exists/);
}));
test("J18-G fails closed for unchecked opening claims in the new tile",()=>inFixture(async f=>{
 const bytes=tileBytes([{...spots[0].features[0],properties:{
  ...spots[0].features[0].properties,currentlyOpen:true}}]);
 const file=join(f.currentDirectory,"tiles","3447","2471.json");
 await writeFile(file,bytes);
 f.current.tiles["3447:2471"].sha256=sha(bytes);
 await writeFile(join(f.currentDirectory,"manifest.json"),JSON.stringify(f.current));
 await assert.rejects(buildJ18DifferentialPlan(args(f)),/j18g_feature_invalid/);
}));
test("J18-G rejects malicious inherited blob source ref",()=>inFixture(async f=>{
 const m=f.previous;
 m.tiles["3447:2471"].blobSourceSha256="../other";
 await writeFile(join(f.previousDirectory,"manifest.json"),JSON.stringify(m));
 await assert.rejects(buildJ18DifferentialPlan(args(f)),/j18g_tile_manifest_invalid/);
}));
test("J18-G rejects missing SHA-congruent coordinates",()=>inFixture(async f=>{
 const altered=tileBytes([point(301,"Moved",10)]);
 const file=join(f.currentDirectory,"tiles","3447","2471.json");
 await writeFile(file,altered);
 f.current.tiles["3447:2471"].sha256=sha(altered);
 await writeFile(join(f.currentDirectory,"manifest.json"),JSON.stringify(f.current));
 await assert.rejects(buildJ18DifferentialPlan(args(f)),/j18g_tile_membership_invalid/);
}));
test("J18-G requires outputs outside the repo even through symlink",async()=>{
 const root=await mkdtemp(join(tmpdir(),"j18g-link-"));
 const link=join(root,"repo-link");
 try{
  await symlink(fileURLToPath(new URL("../../../",import.meta.url)),link,"dir");
  await assert.rejects(buildJ18DifferentialPlan({
   previousDirectory:root,currentDirectory:root,
   previousSourceSha:OLD,currentSourceSha:NEXT,outDir:join(link,"output"),now
  }),/j18g_path_outside_repo_required/);
 }finally{await rm(root,{recursive:true,force:true});}
});

test("J18-G identifies removed tiles without issuing object deletion",()=>inFixture(async f=>{
 await writeSnapshot(f.currentDirectory,NEXT,nextTime,[spots[0]]);
 const r=await buildJ18DifferentialPlan(args(f)),plan=await readPlan(f);
 assert.equal(r.counts.reused,1);
 assert.equal(r.counts.removed,1);
 assert.equal(r.counts.newTileUploads,0);
 assert.equal(r.counts.minimumNewUploads,1);
 assert.deepEqual(plan.removedTilesNotDeleted,["3448:2471"]);
 assert.equal(plan.networkActionsPerformed,0);
}));
test("J18-G permits an expired previous snapshot only as a source of checksummed references",()=>inFixture(async f=>{
 f.previous.pbfReplicationAt="2026-09-01T00:00:00.000Z";
 f.previous.expiresAt=expiry(f.previous.pbfReplicationAt);
 await writeFile(join(f.previousDirectory,"manifest.json"),JSON.stringify(f.previous));
 const r=await buildJ18DifferentialPlan(args(f));
 assert.equal(r.counts.reused,1);
 const m=await readManifest(f);
 assert.equal(m.expiresAt,expiry(nextTime));
}));
test("J18-G rejects a tile symlink even when its target hashes correctly",()=>inFixture(async f=>{
 const tile=join(f.currentDirectory,"tiles","3447","2471.json");
 const data=await readFile(tile);
 const target=join(f.root,"outside.json");
 await writeFile(target,data);
 await rm(tile);
 await symlink(target,tile,"file");
 await assert.rejects(buildJ18DifferentialPlan(args(f)),/j18g_tile_size/);
}));
test("J18-G rejects invalid or negative declared budget",()=>inFixture(async f=>{
 await assert.rejects(buildJ18DifferentialPlan({...args(f),remainingAdvancedOperations:-1}),/j18g_budget_invalid/);
 await assert.rejects(buildJ18DifferentialPlan({...args(f),remainingAdvancedOperations:1.3}),/j18g_budget_invalid/);
}));
