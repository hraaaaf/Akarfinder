import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {createJ18PrivateBlobReadModel} from "../j18-private-blob-read-model.mjs";
const sha=b=>createHash("sha256").update(b).digest("hex");
const replicated="2026-11-08T21:21:00.000Z";
const expiry="2026-12-08T21:21:00.000Z";
const sourceSha="0ba250a5c27319a029b7c6b971e2a96a86b300d459406bb162be4c44a23a730f";
const at="2026-11-10T20:00:00.000Z";
const bbox="-7.66,33.57,-7.60,33.62";
const base="osm-indicative/v1/"+sourceSha+"/";
function fixture(){
 const feature=(id,cat)=>({type:"Feature",geometry:{type:"Point",coordinates:[-7.631,33.59]},
  properties:{osmId:id,name:id,category:cat,sourceUrl:"https://www.openstreetmap.org/"+id,
   positionType:"osm-node",currentlyOpen:null,officialQuarterMembership:null}});
 const tile={schema:"AKARFINDER_J18_INDICATIVE_RELEASE_CANDIDATE_V1",
 state:"REVIEW_CANDIDATE_ONLY_NOT_PUBLIC",
 features:[feature("node/301","education"),feature("node/302","transport")]};
 const tileBytes=Buffer.from(JSON.stringify(tile)+"\n"),tileSha=sha(tileBytes);
 const path="tiles/3447/2471.json";
 const manifest={schema:tile.schema,state:tile.state,publicationAuthorized:false,publicEndpointEnabled:false,
 source:"OpenStreetMap via Geofabrik",sourceSha256:sourceSha,
 attribution:"© OpenStreetMap contributors",license:"ODbL-1.0",
 sourceFreshnessMeansBusinessIsOpen:false,
 businessOperatingStatusCertified:false,officialNeighborhoodMembershipCertified:false,
 entrancePrecisionCertified:false,cellSizeDegrees:0.05,tileCount:1,featureCount:2,
 pbfReplicationAt:replicated,expiresAt:expiry,tiles:{"3447:2471":{path,sha256:tileSha,count:2}}};
 const manifestBytes=Buffer.from(JSON.stringify(manifest)+"\n"),manifestSha=sha(manifestBytes);
 const tileKey=base+"tiles/3447/2471-"+tileSha+".json";
 const manifestKey=base+"manifest-"+manifestSha+".json";
 const store=new Map([[manifestKey,manifestBytes],[tileKey,tileBytes]]);
 let requestCount=0,clock=Date.parse(at);
 const readObject=async(path)=>{
  requestCount++;
  const value=store.get(path);
  if(!value)throw Error("PRIVATE_BLOB_NOT_FOUND");
  return value;
 };
 const newModel=()=>createJ18PrivateBlobReadModel({readObject,sourceSha,manifestSha,
  clock:()=>clock,cacheTtlMs:30000,maxCacheBytes:650000});
 return {manifest,tile,store,manifestKey,tileKey,manifestSha,newModel,
  count:()=>requestCount,time:value=>{clock=Date.parse(value);}};
}
test("J18-F private content-addressed reader returns provenance and bounded features",async()=>{
 const f=fixture(),model=f.newModel(),data=await model.query({bbox,limit:180});
 assert.equal(data.features.length,2);
 assert.equal(data.state,"J18_PRIVATE_BLOB_LOCAL_REVIEW");
 assert.equal(data.publicationAuthorized,false);
 assert.equal(data.sourceSha256,sourceSha);
 assert.equal(data.manifestSha256,f.manifestSha);
 assert.equal(data.officialNeighborhoodMembershipCertified,false);
 assert.equal(data.businessOperatingStatusCertified,false);
 assert.equal(data.features[0].properties.osmId,"node/301");
 assert.equal(f.count(),2);
 assert.match(model.manifestPath,/manifest-[0-9a-f]{64}\.json$/);
});
test("J18-F reuses verified cache and deduplicates simultaneous private fetches",async()=>{
 const f=fixture(),model=f.newModel();
 await Promise.all([model.query({bbox}),model.query({bbox}),model.query({bbox})]);
 assert.equal(f.count(),2);
 await model.query({bbox});
 assert.equal(f.count(),2);
 assert.ok(model.cacheStats().bytes>0);
 f.time("2026-11-10T20:01:00.000Z");
 await model.query({bbox});
 assert.equal(f.count(),4);
 assert.ok(model.cacheStats().bytes<=650000);
});
test("J18-F rejects oversized bbox and excess limit before reading private object",async()=>{
 const f=fixture(),model=f.newModel();
 await assert.rejects(model.query({bbox:"-15,20,0,40"}),RangeError);
 await assert.rejects(model.query({bbox,limit:181}),RangeError);
 assert.equal(f.count(),0);
});
test("J18-F refuses expired snapshot even while cached",async()=>{
 const f=fixture(),model=f.newModel();
 await model.query({bbox});
 f.time(expiry);
 await assert.rejects(model.query({bbox}),/j18_blob_snapshot_expired/);
});
test("J18-F fails closed for tampered manifest bytes",async()=>{
 const f=fixture(),model=f.newModel();
 f.store.set(f.manifestKey,Buffer.from("{}"));
 await assert.rejects(model.query({bbox}),/j18_blob_checksum/);
});
test("J18-F refuses an unreviewed source claim with internally recomputed manifest sha",async()=>{
 const f=fixture(),m={...f.manifest,businessOperatingStatusCertified:true};
 const bytes=Buffer.from(JSON.stringify(m)+"\n"),h=sha(bytes),name=base+"manifest-"+h+".json";
 f.store.set(name,bytes);
 const model=createJ18PrivateBlobReadModel({
  sourceSha,manifestSha:h,readObject:async p=>f.store.get(p),clock:()=>Date.parse(at)
 });
 await assert.rejects(model.query({bbox}),/j18_blob_manifest_invalid/);
});
test("J18-F refuses wrong tile sha and prevents stale/corrupted content from leaking",async()=>{
 const f=fixture(),model=f.newModel();
 f.store.set(f.tileKey,Buffer.from("{}"));
 await assert.rejects(model.query({bbox}),/j18_blob_checksum/);
});
test("J18-F rejects forged opening or neighborhood claim even with valid tile hash",async()=>{
 const f=fixture(),bad={...f.tile,features:[{...f.tile.features[0],properties:{...f.tile.features[0].properties,currentlyOpen:true}},f.tile.features[1]]};
 const tileBytes=Buffer.from(JSON.stringify(bad)+"\n"),tileSha=sha(tileBytes);
 f.manifest.tiles["3447:2471"].sha256=tileSha;
 const mbytes=Buffer.from(JSON.stringify(f.manifest)+"\n"),msha=sha(mbytes);
 f.store.set(base+"manifest-"+msha+".json",mbytes);
 f.store.set(base+"tiles/3447/2471-"+tileSha+".json",tileBytes);
 const model=createJ18PrivateBlobReadModel({sourceSha,manifestSha:msha,clock:()=>Date.parse(at),
  readObject:async p=>f.store.get(p)});
 await assert.rejects(model.query({bbox}),/j18_blob_feature_invalid/);
});
test("J18-F rejects duplicate OSM id in a signed tile",async()=>{
 const f=fixture(),copy={...f.tile,features:[f.tile.features[0],f.tile.features[0]]};
 const bytes=Buffer.from(JSON.stringify(copy)+"\n"),hash=sha(bytes);
 f.manifest.tiles["3447:2471"].sha256=hash;
 const mb=Buffer.from(JSON.stringify(f.manifest)+"\n"),mh=sha(mb);
 f.store.set(base+"manifest-"+mh+".json",mb);
 f.store.set(base+"tiles/3447/2471-"+hash+".json",bytes);
 const model=createJ18PrivateBlobReadModel({sourceSha,manifestSha:mh,clock:()=>Date.parse(at),
  readObject:async p=>f.store.get(p)});
 await assert.rejects(model.query({bbox}),/j18_blob_duplicate_feature/);
});
test("J18-F requires pinned source and manifest SHA and a bounded cache",()=>{
 const f=fixture();
 assert.throws(()=>createJ18PrivateBlobReadModel({readObject:async()=>new Uint8Array(),sourceSha:"wrong",manifestSha:f.manifestSha}),RangeError);
 assert.throws(()=>createJ18PrivateBlobReadModel({readObject:async()=>new Uint8Array(),sourceSha,manifestSha:f.manifestSha,maxCacheBytes:100}),RangeError);
});

test("J18-F allows a SHA-pinned newer manifest to reuse an unchanged older private tile",async()=>{
 const f=fixture(),newSource="c".repeat(64);
 const newer={...f.manifest,sourceSha256:newSource,
  tiles:{"3447:2471":{...f.manifest.tiles["3447:2471"],blobSourceSha256:sourceSha}}};
 const data=Buffer.from(JSON.stringify(newer)+"\n"),hash=sha(data);
 const newManifestKey="osm-indicative/v1/"+newSource+"/manifest-"+hash+".json";
 f.store.set(newManifestKey,data);
 const reads=[];
 const model=createJ18PrivateBlobReadModel({sourceSha:newSource,manifestSha:hash,
  readObject:async p=>{reads.push(p);return f.store.get(p);},
  clock:()=>Date.parse(at)});
 const result=await model.query({bbox,limit:180});
 assert.equal(result.sourceSha256,newSource);
 assert.equal(result.features.length,2);
 assert.deepEqual(reads,[newManifestKey,f.tileKey]);
 assert.equal(result.publicationAuthorized,false);
});
test("J18-F rejects invalid previous-snapshot source SHA before any private tile GET",async()=>{
 const f=fixture(),newSource="c".repeat(64);
 const m={...f.manifest,sourceSha256:newSource,
  tiles:{"3447:2471":{...f.manifest.tiles["3447:2471"],blobSourceSha256:"../../unauthorized"}}};
 const bytes=Buffer.from(JSON.stringify(m)+"\n"),hash=sha(bytes);
 const pathname="osm-indicative/v1/"+newSource+"/manifest-"+hash+".json";
 f.store.set(pathname,bytes);
 const reads=[];
 const model=createJ18PrivateBlobReadModel({sourceSha:newSource,manifestSha:hash,
  readObject:async p=>{reads.push(p);return f.store.get(p);},
  clock:()=>Date.parse(at)});
 await assert.rejects(model.query({bbox}),/j18_blob_tile_manifest_invalid/);
 assert.deepEqual(reads,[pathname]);
});
