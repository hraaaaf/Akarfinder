import test from "node:test";
import assert from "node:assert/strict";
import {generateKeyPairSync,sign} from "node:crypto";
import {readFileSync} from "node:fs";
import {canonicalJ18ApprovalBytes,verifyJ18Approval,validateJ18Viewport,
 evaluateJ18Release,j18CacheHeader,J18H_SOURCE_PUBLICATION_ENABLED,J18H_APPROVAL_SCHEMA}
 from "../j18-public-release-policy.mjs";

const sourceSha="a".repeat(64),manifestSha="b".repeat(64);
const storeId="store_A1TestHash";
const pbfTime="2026-11-08T21:21:00.000Z";
const sourceExpiry="2026-12-08T21:21:00.000Z";
const clock=Date.parse("2026-11-10T23:30:00.000Z");
const record=()=>({
 schema:J18H_APPROVAL_SCHEMA,approvalId:"RELEASE_J18_SAMPLE_01",
 sourceSha256:sourceSha,manifestSha256:manifestSha,storeId,
 pbfReplicationAt:pbfTime,sourceExpiresAt:sourceExpiry,
 approvedAt:"2026-11-10T21:00:00.000Z",
 approvalExpiresAt:"2026-11-14T21:00:00.000Z",
 dataClass:"INDICATIVE_OSM_NOT_COMMERCIALLY_CERTIFIED",
 license:"ODbL-1.0",attribution:"© OpenStreetMap contributors",
 reviewedFor:"OSM_INDICATIVE_PUBLIC_ONLY",
 businessOperatingStatusCertified:false,
 officialNeighborhoodMembershipCertified:false,
 entrancePrecisionCertified:false,
 publicationAuthorized:true
});
function fixture(){
 const keys=generateKeyPairSync("ed25519");
 const publicKeyPem=keys.publicKey.export({format:"pem",type:"spki"});
 const approve=(r=record())=>sign(null,canonicalJ18ApprovalBytes(r),keys.privateKey).toString("base64");
 const rec=record(),signature=approve(rec);
 const base={record:rec,signatureBase64:signature,publicKeyPem,sourceSha,manifestSha,storeId,now:clock};
 return {rec,approve,base,publicKeyPem};
}
const data=()=>({
 sourceSha256:sourceSha,manifestSha256:manifestSha,
 license:"ODbL-1.0",attribution:"© OpenStreetMap contributors",
 expiresAt:sourceExpiry,pbfReplicationAt:pbfTime,
 publicationAuthorized:false,businessOperatingStatusCertified:false,
 officialNeighborhoodMembershipCertified:false,entrancePrecisionCertified:false,
 features:[{type:"Feature",geometry:{type:"Point",coordinates:[-7.63,33.59]},
 properties:{name:"Repère fictif",osmId:"node/1",category:"education",
 currentlyOpen:null,officialQuarterMembership:null}}]
});
const input=(f=fixture())=>({
 enabledInSource:true,
 approvalRecord:f.rec,approvalSignature:f.base.signatureBase64,
 approvalPublicKey:f.publicKeyPem,sourceSha,manifestSha,storeId,
 now:clock,subjectKey:"trusted:visitor:abc123",
 quota:{reserveAtomic:async()=>true},
 readModel:{query:async()=>data()},bbox:"-7.67,33.57,-7.62,33.61",limit:180
});
test("J18-H source-level publication is false and cannot be enabled via env",async()=>{
 assert.equal(J18H_SOURCE_PUBLICATION_ENABLED,false);
 const args=input();args.enabledInSource=J18H_SOURCE_PUBLICATION_ENABLED;
 process.env.AKAR_VIVRE_ICI_J18_PUBLIC="true";
 assert.deepEqual(await evaluateJ18Release(args),{allowed:false,status:404,reason:"not_published"});
 delete process.env.AKAR_VIVRE_ICI_J18_PUBLIC;
});
test("J18-H verifies a detached Ed25519 approval for exact source/manifest/store",()=>{
 const f=fixture();
 assert.equal(verifyJ18Approval(f.base),true);
 assert.equal(verifyJ18Approval({...f.base,manifestSha:"c".repeat(64)}),false);
 assert.equal(verifyJ18Approval({...f.base,storeId:"store_Other"}),false);
 assert.equal(verifyJ18Approval({...f.base,sourceSha:"d".repeat(64)}),false);
});
test("J18-H rejects invalid signer, modified fields and unrelated authorization",()=>{
 const f=fixture(),other=fixture();
 assert.equal(verifyJ18Approval({...f.base,publicKeyPem:other.publicKeyPem}),false);
 assert.equal(verifyJ18Approval({...f.base,signatureBase64:other.base.signatureBase64}),false);
 assert.equal(verifyJ18Approval({...f.base,record:{...f.rec,reviewedFor:"COMMERCIAL_POI"}}),false);
 assert.equal(verifyJ18Approval({...f.base,record:{...f.rec,extra:"inject"}}),false);
});
test("J18-H rejects unsigned approval, bad signature and non-Ed25519 key",()=>{
 const f=fixture();
 assert.equal(verifyJ18Approval({...f.base,signatureBase64:""}),false);
 assert.equal(verifyJ18Approval({...f.base,signatureBase64:"bad"}),false);
 assert.equal(verifyJ18Approval({...f.base,publicKeyPem:"-----BEGIN PUBLIC KEY-----\ninvalid\n-----END PUBLIC KEY-----"}),false);
});
test("J18-H rejects commercial openings and official boundaries even if signed",()=>{
 const f=fixture();
 for(const k of ["businessOperatingStatusCertified","officialNeighborhoodMembershipCertified","entrancePrecisionCertified"]){
  const changed={...f.rec,[k]:true};
  assert.equal(verifyJ18Approval({...f.base,record:changed,signatureBase64:f.approve(changed)}),false,k);
 }
});
test("J18-H prohibits approval expiry extending beyond source expiry",()=>{
 const f=fixture();
 for(const approvalExpiresAt of ["2026-12-09T21:00:00.000Z","2026-11-20T21:00:00.000Z"]){
  const r={...f.rec,approvalExpiresAt};
  assert.equal(verifyJ18Approval({...f.base,record:r,signatureBase64:f.approve(r)}),false);
 }
});
test("J18-H rejects expired approval and expired source",()=>{
 const f=fixture();
 assert.equal(verifyJ18Approval({...f.base,now:Date.parse("2026-11-15T00:00:00Z")}),false);
 assert.equal(verifyJ18Approval({...f.base,now:Date.parse("2026-12-09T00:00:00Z")}),false);
});
test("J18-H rejects approval in the future, source timestamp mismatches",()=>{
 const f=fixture();
 assert.equal(verifyJ18Approval({...f.base,now:Date.parse("2026-11-09T20:00:00Z")}),false);
 const r={...f.rec,sourceExpiresAt:"2026-12-07T21:21:00.000Z"};
 assert.equal(verifyJ18Approval({...f.base,record:r,signatureBase64:f.approve(r)}),false);
});
test("J18-H viewport caps 64 cells and at most 180 landmarks",()=>{
 assert.equal(validateJ18Viewport({bbox:"-7.67,33.57,-7.62,33.61",limit:180}).length,4);
 assert.throws(()=>validateJ18Viewport({bbox:"-15,20,0,40",limit:180}),RangeError);
 assert.throws(()=>validateJ18Viewport({bbox:"-7.67,33.57,-7.62,33.61",limit:181}),RangeError);
});
test("J18-H fails closed without cross-instance atomic quota",async()=>{
 const a=input();delete a.quota;
 assert.equal((await evaluateJ18Release(a)).status,503);
});
test("J18-H fails closed without trusted actor identity",async()=>{
 const a=input();delete a.subjectKey;
 assert.equal((await evaluateJ18Release(a)).status,503);
});
test("J18-H rejects exceeded atomic quota before reading Blob",async()=>{
 const a=input();let called=0;
 a.quota={reserveAtomic:async()=>false};
 a.readModel={query:async()=>{called++;return data()}};
 const result=await evaluateJ18Release(a);
 assert.equal(result.status,429);
 assert.equal(called,0);
});
test("J18-H fails closed for unavailable distributed quota",async()=>{
 const a=input();
 a.quota={reserveAtomic:async()=>{throw Error("provider_offline")}};
 assert.equal((await evaluateJ18Release(a)).status,503);
});
test("J18-H approved policy flow is only simulated with injected test adapter",async()=>{
 const a=input(),observed=[];
 a.quota={reserveAtomic:async p=>{observed.push(p);return true}};
 const output=await evaluateJ18Release(a);
 assert.equal(output.status,200);
 assert.equal(output.result.features.length,1);
 assert.equal(output.result.businessOperatingStatusCertified,false);
 assert.equal(output.result.officialNeighborhoodMembershipCertified,false);
 assert.equal(output.result.entrancePrecisionCertified,false);
 assert.equal(output.cacheControl,"public, max-age=0, s-maxage=30, stale-while-revalidate=0");
 assert.equal(observed.length,1);
 assert.deepEqual(observed[0],{namespace:"j18h-indicative",subjectKey:a.subjectKey,periodMs:60000,maxHits:20,cost:1});
});
test("J18-H refuses an incorrect private reader pin and never serves data",async()=>{
 const a=input();a.readModel={query:async()=>({...data(),sourceSha256:"f".repeat(64)})};
 assert.equal((await evaluateJ18Release(a)).status,503);
});
test("J18-H clamps cache TTL before snapshot expiration",()=>{
 const e="2026-12-08T21:21:00.000Z";
 assert.equal(j18CacheHeader(e,Date.parse(e)-18000),"public, max-age=0, s-maxage=18, stale-while-revalidate=0");
 assert.equal(j18CacheHeader(e,Date.parse(e)-1000),"public, max-age=0, s-maxage=1, stale-while-revalidate=0");
});
test("J18-H public route has immutable 404 and no Blob read nor publish switch",()=>{
 const route=readFileSync(new URL("../../../app/api/geo/indicative-landmarks/route.ts",import.meta.url),"utf8");
 assert.match(route,/J18H_SOURCE_PUBLICATION_ENABLED/);
 assert.match(route,/status:404/);
 assert.match(route,/not_published/);
 assert.match(route,/no-store/);
 assert.match(route,/noindex/);
 assert.doesNotMatch(route,/@vercel\/blob|NEXT_PUBLIC_|process\.env\.AKAR_VIVRE_ICI_J18_PUBLIC|evaluateJ18Release/);
});
