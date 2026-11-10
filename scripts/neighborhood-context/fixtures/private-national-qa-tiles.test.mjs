import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, writeFile, rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseQaBbox, queryPrivateNationalQaPack, SCHEMA } from "../private-national-qa-tiles.mjs";

const HASH = "a".repeat(64);
const md5 = "b".repeat(32);
const coords = [-7.631,33.59];
const cx = Math.floor((coords[0]+180)*20), cy = Math.floor((coords[1]+90)*20);
const rel = "tiles/"+String(cx).padStart(4,"0")+"/"+String(cy).padStart(4,"0")+".json";
const sample = {type:"Feature",geometry:{type:"Point",coordinates:coords},properties:{
  osmId:"node/301",name:"École",category:"education",
  sourceUrl:"https://www.openstreetmap.org/node/301",positionType:"osm-node",
  currentlyOpen:null,officialQuarterMembership:null
}};
async function fixture() {
  const folder = await mkdtemp(join(tmpdir(),"akar-vivre-ici-qa-"));
  await mkdir(join(folder,"tiles",String(cx).padStart(4,"0")),{recursive:true});
  const tile = JSON.stringify({schema:SCHEMA,state:"PRIVATE_QA_ONLY",features:[sample]})+"\n";
  await writeFile(join(folder,rel),tile);
  const manifest={schema:SCHEMA,state:"PRIVATE_QA_ONLY",source:"Geofabrik Morocco OpenStreetMap PBF",
    sourceSha256:HASH,sourceMd5:md5,cellSizeDegrees:0.05,license:"ODbL-1.0",
    attribution:"© OpenStreetMap contributors",businessOperatingStatusCertified:false,
    officialNeighborhoodMembershipCertified:false,entrancePrecisionCertified:false,
    featureCount:1,tileCount:1,tiles:{}};
  manifest.tiles[cx+":"+cy]={path:rel,sha256:createHash("sha256").update(tile).digest("hex"),count:1};
  await writeFile(join(folder,"manifest.json"),JSON.stringify(manifest));
  return folder;
}
async function withPack(fn) {
  const folder=await fixture();
  try{await fn(folder);}finally{await rm(folder,{recursive:true,force:true});}
}
test("J11C bbox and region validation",()=>{
  assert.deepEqual(parseQaBbox("-7.66,33.57,-7.60,33.62"),[-7.66,33.57,-7.60,33.62]);
  for(const value of ["", "0,1,2", "abc,0,1,2", "0,0,0,1","-200,0,0,1", "0,0,Infinity,1"])
    assert.throws(()=>parseQaBbox(value),RangeError);
});
test("J11C real fixture: bbox, provenance and no commercial claims",()=>withPack(async folder=>{
  const out=await queryPrivateNationalQaPack(folder,HASH,[-7.66,33.57,-7.60,33.62]);
  assert.equal(out.ok,true);
  assert.equal(out.features.length,1);
  assert.equal(out.features[0].properties.name,"École");
  assert.equal(out.features[0].properties.currentlyOpen,null);
  assert.equal(out.features[0].properties.officialQuarterMembership,null);
  assert.equal(out.businessOperatingStatusCertified,false);
}));
test("J11C disjoint viewport has no features",()=>withPack(async folder=>{
  const out=await queryPrivateNationalQaPack(folder,HASH,[-6.90,33.97,-6.81,34.05]);
  assert.equal(out.features.length,0);
}));
test("J11C wrong pinned source SHA fails closed",()=>withPack(async folder=>{
  await assert.rejects(()=>queryPrivateNationalQaPack(folder,"c".repeat(64),[-7.66,33.57,-7.60,33.62]),/provenance/);
}));
test("J11C changed tile bytes rejected",()=>withPack(async folder=>{
  await writeFile(join(folder,rel),"{}");
  await assert.rejects(()=>queryPrivateNationalQaPack(folder,HASH,[-7.66,33.57,-7.60,33.62]),/checksum/);
}));
test("J11C altered manifest path rejected",()=>withPack(async folder=>{
  const p=join(folder,"manifest.json"),data=JSON.parse(await readFile(p,"utf8"));
  data.tiles[cx+":"+cy].path="../../other.json";
  await writeFile(p,JSON.stringify(data));
  await assert.rejects(()=>queryPrivateNationalQaPack(folder,HASH,[-7.66,33.57,-7.60,33.62]),/manifest/);
}));
test("J11C 64-cell safety and result cap",()=>withPack(async folder=>{
  await assert.rejects(()=>queryPrivateNationalQaPack(folder,HASH,[-10,30,-6,35]),RangeError);
  await assert.rejects(()=>queryPrivateNationalQaPack(folder,HASH,[-7.66,33.57,-7.60,33.62],1001),RangeError);
  const r=await queryPrivateNationalQaPack(folder,HASH,[-7.66,33.57,-7.60,33.62],1);
  assert.equal(r.features.length,1);
}));
test("J11C rejects untrusted status claims even with recomputed tile checksum",()=>withPack(async folder=>{
  const path=join(folder,rel),data=JSON.parse(await readFile(path,"utf8"));
  data.features[0].properties.currentlyOpen=true;
  const bytes=JSON.stringify(data);
  await writeFile(path,bytes);
  const mp=join(folder,"manifest.json"),m=JSON.parse(await readFile(mp,"utf8"));
  m.tiles[cx+":"+cy].sha256=createHash("sha256").update(bytes).digest("hex");
  await writeFile(mp,JSON.stringify(m));
  await assert.rejects(()=>queryPrivateNationalQaPack(folder,HASH,[-7.66,33.57,-7.60,33.62]),/invalid_qa_feature/);
}));
