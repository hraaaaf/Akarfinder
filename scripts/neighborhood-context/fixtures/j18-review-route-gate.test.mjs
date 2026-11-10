import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {allowJ18LocalReview as allow} from "../j18-review-route-gate.mjs";
const good={nodeEnv:"development",optIn:"true",urlHostname:"127.0.0.1",
 hostHeader:"127.0.0.1:3100",forwardedHostHeader:null,
 datasetDirectory:"C:/private-j18-candidate",sourceSha:"a".repeat(64),requestMethod:"GET"};
test("J18 review route is OFF in prod, even when env contains candidate and flag",()=>{
 assert.equal(allow({...good,nodeEnv:"production"}),false);
 assert.equal(allow({...good,nodeEnv:"test"}),false);
});
test("J18 review route needs opt-in, pinned SHA and candidate directory",()=>{
 assert.equal(allow(good),true);
 assert.equal(allow({...good,optIn:undefined}),false);
 assert.equal(allow({...good,datasetDirectory:undefined}),false);
 assert.equal(allow({...good,sourceSha:"invalid"}),false);
 assert.equal(allow({...good,requestMethod:"POST"}),false);
});
test("J18 review rejects forged host/forwarded host",()=>{
 assert.equal(allow({...good,hostHeader:"example.invalid"}),false);
 assert.equal(allow({...good,forwardedHostHeader:"external.invalid"}),false);
 assert.equal(allow({...good,urlHostname:"example.invalid"}),false);
});
test("J18 route is a distinct no-store, noindex endpoint and no public enablement",()=>{
 const source=readFileSync(new URL("../../../app/api/geo/j18-indicative-review/route.ts",import.meta.url),"utf8");
 assert.match(source,/Cache-Control.*private, no-store/);
 assert.match(source,/X-Robots-Tag.*noindex/);
 assert.match(source,/J18_LOCAL_REVIEW_NOT_PUBLISHED/);
 assert.match(source,/allowJ18LocalReview/);
 assert.doesNotMatch(source,/NEXT_PUBLIC_|publicEndpointEnabled:\s*true|deploymentAuthorized:\s*true/);
});
