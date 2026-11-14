import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {allowJ18BlobLocalReview,createJ18LocalRateLimiter} from "../j18-blob-review-gate.mjs";
const good={
 nodeEnv:"development",optIn:"true",urlHostname:"127.0.0.1",
 hostHeader:"127.0.0.1:3100",forwardedHostHeader:null,
 storeId:"store_6gxChm3iUtEuoHOA",expectedStoreId:"store_6gxChm3iUtEuoHOA",
 sourceSha:"a".repeat(64),manifestSha:"b".repeat(64),requestMethod:"GET"
};
test("J18-F production route always 404 regardless of opt-ins or valid credentials",()=>{
 assert.equal(allowJ18BlobLocalReview({...good,nodeEnv:"production"}),false);
 assert.equal(allowJ18BlobLocalReview({...good,nodeEnv:"test"}),false);
 assert.equal(allowJ18BlobLocalReview(good),true);
 assert.equal(allowJ18BlobLocalReview({...good,optIn:undefined}),false);
});
test("J18-F disallows forged or forwarded host",()=>{
 for(const diff of [{urlHostname:"evil.example"},{hostHeader:"evil.example"},
  {forwardedHostHeader:"evil.example"},{requestMethod:"POST"}])
  assert.equal(allowJ18BlobLocalReview({...good,...diff}),false);
});
test("J18-F requires the exact Blob Store ID and source pin",()=>{
 for(const diff of [{storeId:"store_wrong"},{expectedStoreId:undefined},
  {sourceSha:"wrong"},{manifestSha:undefined}])
  assert.equal(allowJ18BlobLocalReview({...good,...diff}),false);
});
test("J18-F local limiter rejects excess requests, allows next window",()=>{
 let now=1000;
 const l=createJ18LocalRateLimiter({max:2,windowMs:1000,clock:()=>now});
 assert.equal(l.take(),true);assert.equal(l.take(),true);assert.equal(l.take(),false);
 now=2000;assert.equal(l.take(),true);assert.equal(l.state().count,1);
 now=1999;assert.equal(l.take(),false);
});
test("J18-F route is a distinct private QA route with no public-release switch",()=>{
 const text=readFileSync(new URL("../../../app/api/geo/j18-blob-review/route.ts",import.meta.url),"utf8");
 assert.match(text,/allowJ18BlobLocalReview/);
 assert.match(text,/Cache-Control.*private, no-store/);
 assert.match(text,/X-Robots-Tag.*noindex/);
 assert.match(text,/get\(path,\{access:"private"\}\)/);
 assert.doesNotMatch(text,/publicEndpointEnabled:\s*true|publicationAuthorized:\s*true|NEXT_PUBLIC_|export const revalidate/);
});
