import test from "node:test";
import assert from "node:assert/strict";
import {saroutyListingRoute,inspectSaroutyDetail} from "../sarouty-detail-identity-v1.mjs";
const src="https://www.sarouty.ma/acheter/appartement-casablanca-racine-908416/";
test("real source detail pattern has stable numeric source ID",()=>{
 assert.equal(saroutyListingRoute(src)?.identity,"sarouty:908416");
 assert.equal(saroutyListingRoute("https://www.sarouty.ma/acheter/casablanca/appartements-a-vendre/"),null);
 assert.equal(saroutyListingRoute("https://evil.example/acheter/appartement-casablanca-racine-908416/"),null);
});
test("explicit portal banner prevents calling unavailable listing active",()=>{
 const html="<html><h1>Appartement à vendre à Casablanca Racine</h1><p>Cette annonce n'est plus disponible, mais voici des biens similaires actuellement sur le marché.</p><div>1 200 000 DH 120 m²</div></html>";
 const result=inspectSaroutyDetail(html,src,src,"sarouty:908416");
 assert.equal(result.explicit_unavailable_banner,true);
 assert.equal(result.primary_detail_verified,false);
 assert.equal(result.state,"explicitly_unavailable");
 assert.equal(result.commercial_availability_certified,false);
});
test("primary title and preserved numeric ID are required before any candidate",()=>{
 const html="<html><h1>Bel appartement en vente</h1><p>Appartement 120 m² à Racine</p></html>";
 assert.equal(inspectSaroutyDetail(html,src,src,"sarouty:908416").primary_detail_verified,true);
 assert.equal(inspectSaroutyDetail(html,src,src.replace("908416","907164"),"sarouty:908416").primary_detail_verified,false);
});
test("no source content can assert commercial availability",()=>{
 const r=inspectSaroutyDetail("<h1>Appartement à vendre</h1>",src,src,"sarouty:908416");
 assert.equal(r.commercial_availability_certified,false);assert.equal(r.database_writes,0);
});
