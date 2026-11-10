import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {mkdtemp,mkdir,readFile,rm,writeFile} from "node:fs/promises";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {buildJ18ReleaseCandidate,QA_SCHEMA,EVIDENCE_SCHEMA,CANDIDATE_SCHEMA,CANDIDATE_STATE}
 from "../j18-public-indicative-candidate.mjs";
const sha=b=>createHash("sha256").update(b).digest("hex");
const md5=b=>createHash("md5").update(b).digest("hex");
const t="2026-11-10T00:00:00.000Z",observed="2026-11-08T21:21:00.000Z";
const sample={type:"Feature",geometry:{type:"Point",coordinates:[-7.631,33.59]},
 properties:{osmId:"node/301",name:"École Exemple",category:"education",
 sourceUrl:"https://www.openstreetmap.org/node/301",positionType:"osm-node",
 currentlyOpen:null,officialQuarterMembership:null}};
async function fixture(){
 const root=await mkdtemp(join(tmpdir(),"j18-osm-release-"));
 const pack=join(root,"input"),out=join(root,"candidate");
 const bytes=Buffer.from("synthetic_pbf_fixture_bytes_not_real_osm");
 const sourceMd5=md5(bytes),sourceSha256=sha(bytes),pbf=join(root,"test.pbf"),evidence=join(root,"evidence.json");
 await mkdir(join(pack,"tiles","3447"),{recursive:true});
 const tileFile="tiles/3447/2471.json",tile=Buffer.from(JSON.stringify({schema:QA_SCHEMA,
   state:"PRIVATE_QA_ONLY",features:[sample]})+"\n");
 await writeFile(pbf,bytes);await writeFile(join(pack,tileFile),tile);
 const manifest={schema:QA_SCHEMA,state:"PRIVATE_QA_ONLY",source:"Geofabrik Morocco OpenStreetMap PBF",
   license:"ODbL-1.0",attribution:"© OpenStreetMap contributors",cellSizeDegrees:0.05,
   businessOperatingStatusCertified:false,officialNeighborhoodMembershipCertified:false,
   entrancePrecisionCertified:false,sourceMd5,sourceSha256,tileCount:1,featureCount:1,
   tiles:{"3447:2471":{path:tileFile,sha256:sha(tile),count:1}}};
 await writeFile(join(pack,"manifest.json"),JSON.stringify(manifest));
 const evidenceObject={schema:EVIDENCE_SCHEMA,source:"Geofabrik Morocco OpenStreetMap PBF",
   sourceMd5,sourceSha256,pbfReplicationAt:observed};
 await writeFile(evidence,JSON.stringify(evidenceObject));
 return {root,pack,pbf,evidence,out,manifest,evidenceObject,tileFile};
}
async function withFixture(fn){const f=await fixture();try{await fn(f);}finally{await rm(f.root,{recursive:true,force:true});}}
const build=f=>buildJ18ReleaseCandidate({sourceDir:f.pack,pbfPath:f.pbf,
 evidencePath:f.evidence,outDir:f.out,now:new Date(t)});
test("J18 candidate is distinct from QA, non-public, and has safe OSM claims",()=>withFixture(async f=>{
 const result=await build(f),m=JSON.parse(await readFile(join(f.out,"manifest.json"),"utf8"));
 assert.equal(result.status,CANDIDATE_STATE);assert.equal(m.schema,CANDIDATE_SCHEMA);
 assert.equal(result.featureCount,1);assert.equal(result.tileCount,1);
 assert.equal(m.publicationAuthorized,false);assert.equal(m.publicEndpointEnabled,false);
 assert.equal(m.businessOperatingStatusCertified,false);assert.equal(m.officialNeighborhoodMembershipCertified,false);
 const tile=JSON.parse(await readFile(join(f.out,f.tileFile),"utf8"));
 assert.deepEqual(tile.features[0].properties,sample.properties);
 assert.equal(tile.state,CANDIDATE_STATE);
 assert.match(m.expiresAt,/2026-12-08/);
}));
test("J18 rejects altered PBF",()=>withFixture(async f=>{
 await writeFile(f.pbf,"tampered");await assert.rejects(build(f),/j18_source_pbf_integrity/);
}));
test("J18 rejects old source instead of refreshing it on export",()=>withFixture(async f=>{
 await assert.rejects(buildJ18ReleaseCandidate({sourceDir:f.pack,pbfPath:f.pbf,
 evidencePath:f.evidence,outDir:f.out,now:new Date("2027-01-10T00:00:00.000Z")}),/j18_source_stale_or_future/);
}));
test("J18 rejects corrupt tile",()=>withFixture(async f=>{
 await writeFile(join(f.pack,f.tileFile),"{}");await assert.rejects(build(f),/j18_tile_integrity/);
}));
test("J18 rejects manifest path traversal",()=>withFixture(async f=>{
 f.manifest.tiles["3447:2471"].path="../../sneaky.json";
 await writeFile(join(f.pack,"manifest.json"),JSON.stringify(f.manifest));
 await assert.rejects(build(f),/j18_tile_manifest_invalid/);
}));
test("J18 rejects claimed current opening even with recalculated hash",()=>withFixture(async f=>{
 const copy=structuredClone(sample);copy.properties.currentlyOpen=true;
 const tile=Buffer.from(JSON.stringify({schema:QA_SCHEMA,state:"PRIVATE_QA_ONLY",features:[copy]})+"\n");
 await writeFile(join(f.pack,f.tileFile),tile);
 f.manifest.tiles["3447:2471"].sha256=sha(tile);
 await writeFile(join(f.pack,"manifest.json"),JSON.stringify(f.manifest));
 await assert.rejects(build(f),/j18_feature_invalid/);
}));
test("J18 rejects unverifiable replication date",()=>withFixture(async f=>{
 f.evidenceObject.pbfReplicationAt=null;await writeFile(f.evidence,JSON.stringify(f.evidenceObject));
 await assert.rejects(build(f),/j18_source_pbf_integrity/);
}));
test("J18 will not overwrite an existing candidate",()=>withFixture(async f=>{
 await build(f);await assert.rejects(build(f),/j18_candidate_output_exists/);
}));
test("J18 forbids output inside repository including public folder",async()=>{
 const url=new URL("../../../public/j18-data",import.meta.url);
 await assert.rejects(buildJ18ReleaseCandidate({
 sourceDir:"/invalid",pbfPath:"/invalid",evidencePath:"/invalid",outDir:url.pathname,
 now:new Date(t)}),/j18_output_must_be_outside_repo/);
});
