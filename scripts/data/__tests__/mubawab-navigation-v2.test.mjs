import test from "node:test";
import assert from "node:assert/strict";
import { classifyMubawabNavigation as classify } from "../mubawab-navigation-v2.mjs";

const original="https://mubawab.ma/fr/a/8374278/terrain-97-m%C2%B2";

test("same identity with canonical slug rewrite and www host is preserved",()=>{
 const r=classify(original,"https://www.mubawab.ma/fr/a/8374278/appartement",true);
 assert.equal(r.identity_preserved,true);
 assert.equal(r.final_category,"same_detail_identity");
 assert.equal(r.http_redirected,true);
 assert.equal(r.request_id_band,"8300000-8399999");
});
test("same URL without redirect remains a detail match",()=>{
 const r=classify(original,original);
 assert.equal(r.identity_preserved,true);
 assert.equal(r.http_redirected,false);
});
test("different detail identity is never preserved",()=>{
 const r=classify(original,"https://mubawab.ma/fr/a/8374279/other",true);
 assert.equal(r.final_category,"different_detail_identity");
 assert.equal(r.identity_preserved,false);
});
test("redirected locale root stays an unknown availability, not a valid detail",()=>{
 const r=classify(original,"https://mubawab.ma/fr/",true);
 assert.equal(r.final_category,"locale_home");
 assert.equal(r.identity_preserved,false);
});
test("search page is rejected, no listing validity inferred",()=>{
 const r=classify(original,"https://mubawab.ma/fr/is/appartements-a-vendre-a-casablanca",true);
 assert.equal(r.final_category,"search_or_catalog");
 assert.equal(r.identity_preserved,false);
});
test("host whitelist rejects forged detail URL",()=>{
 const r=classify(original,"https://example.com/fr/a/8374278/appartement",true);
 assert.equal(r.final_category,"external_host");
 assert.equal(r.identity_preserved,false);
});
test("classification does not reveal final path, query or credentials",()=>{
 const secret="private-property-token-secret";
 const r=classify(original,"https://mubawab.ma/fr/unknown/"+secret+"?token="+secret,true);
 assert.equal(r.final_category,"locale_other_path");
 assert.equal(JSON.stringify(r).includes(secret),false);
});
test("an unexpected malformed detail path stays unresolved",()=>{
 const r=classify(original,"https://mubawab.ma/fr/a/not-an-id/",true);
 assert.equal(r.final_category,"unrecognized_detail_route");
 assert.equal(r.identity_preserved,false);
});
test("other locale and exact pa identity also work",()=>{
 const p="https://mubawab.ma/en/pa/8391011/villa";
 assert.equal(classify(p,"https://mubawab.ma/fr/pa/8391011/autre").identity_preserved,true);
 assert.equal(classify(p,"https://mubawab.ma/fr/a/8391011/autre").identity_preserved,false);
});
test("invalid final URL is privacy-safe",()=>{
 const r=classify(original,"bad url");
 assert.equal(r.final_category,"invalid_final_url");
 assert.equal(r.final_host,"invalid");
});


test("redirection target includes source id as a path segment on alternate route",()=>{
 const r=classify(original,"https://mubawab.ma/fr/b/8374278/appartement",true);
 assert.equal(r.final_category,"locale_other_path");
 assert.equal(r.final_requested_id_in_path,true);
 assert.equal(r.final_route_prefix,"b");
 assert.equal(r.final_route_shape,"locale/known_route/requested_id/alpha");
});
test("non-detail destination lacking source id does not imply listing deletion",()=>{
 const r=classify(original,"https://mubawab.ma/fr/annonces/recherche-appartements",true);
 assert.equal(r.final_category,"locale_other_path");
 assert.equal(r.final_requested_id_in_path,false);
 assert.equal(r.final_route_prefix,"annonces");
});
test("raw unknown destination route words and secrets are never returned",()=>{
 const secret="do-not-disclose-this-token";
 const r=classify(original,"https://mubawab.ma/fr/"+secret+"/other?token="+secret,true);
 assert.equal(r.final_route_prefix,"unrecognized");
 assert.equal(JSON.stringify(r).includes(secret),false);
 assert.equal(r.final_route_shape,"locale/slug_like/alpha");
});
test("other numeric id in target does not falsely match requested id",()=>{
 const r=classify(original,"https://mubawab.ma/fr/b/8374279/other",true);
 assert.equal(r.final_requested_id_in_path,false);
 assert.equal(r.final_has_other_numeric_segment,true);
});
