import test from 'node:test';
import assert from 'node:assert/strict';
import {extractFeenwayRaw} from '../../acquisition/feenway-jsonld-mold-v1.mjs';
const link='https://www.feenway.com/listings/123456';
function html(record,duplicate=false){const script='<script type="application/ld+json">'+JSON.stringify(record)+'</script>';return '<html><body>'+script+(duplicate?script:'')+'</body></html>'}
const listing={ '@context':'https://schema.org','@type':'RealEstateListing',url:link,name:'Appartement à vendre',description:'Appartement lumineux 80 m² à proximité du centre.',datePosted:'2026-10-20T10:20:00Z',offers:{'@type':'Offer',price:850000,priceCurrency:'MAD',availability:'https://schema.org/InStock'},spatialCoverage:{'@type':'Place',address:{'@type':'PostalAddress',addressLocality:'Casablanca',addressRegion:'Casablanca-Settat'}}};
test('JSON-LD source signals are extracted without commercial certification',()=>{
 const r=extractFeenwayRaw({url:link,html:html(listing),observed_at:'2026-10-27T10:30:00Z'});
 assert.equal(r.price_mad,850000);assert.equal(r.city,'Casablanca');assert.equal(r.region,'Casablanca-Settat');assert.equal(r.surface_candidate_m2,80);
 assert.equal(r.property_type_candidate,'apartment');assert.equal(r.gate,'review_structured_metadata');
 assert.equal(r.availability_verified,false);assert.equal(r.real_freshness_verified,false);assert.equal(r.eligible,false);
});
test('no source description or contacts copied into mold',()=>{
 const s={...listing,description:'Appelez +212612345678 pour 80 m²',name:'Appartement de Mme Dupont'};
 const x=extractFeenwayRaw({url:link,html:html(s)});
 assert.ok(!JSON.stringify(x).includes('612345678'));assert.ok(!JSON.stringify(x).includes('Dupont'));
});
test('multiple primary records quarantine',()=>{
 const r=extractFeenwayRaw({url:link,html:html(listing,true)});
 assert.equal(r.gate,'quarantine');assert.ok(r.issues.includes('missing_or_duplicate_real_estate_listing'));
});
test('cross-property URL mismatch quarantine',()=>{
 const r=extractFeenwayRaw({url:link,html:html({...listing,url:'https://www.feenway.com/listings/999999'})});
 assert.equal(r.gate,'quarantine');assert.ok(r.issues.includes('listing_id_mismatch'));
});
test('multiple surface signals remain unknown instead of guessed',()=>{
 const r=extractFeenwayRaw({url:link,html:html({...listing,description:'Appartement 80 m² sur terrain de 450 m²'})});
 assert.equal(r.surface_candidate_m2,null);assert.ok(r.issues.includes('area_ambiguous_or_missing'));
});
test('malformed or absent JSON-LD quarantine',()=>{
 for(const htmlValue of ['<html></html>','<script type="application/ld+json">{invalid}</script>']){
  const r=extractFeenwayRaw({url:link,html:htmlValue});
  assert.equal(r.gate,'quarantine');assert.equal(r.eligible,false);
 }
});
test('price currency mismatch quarantined from technical completeness',()=>{
 const r=extractFeenwayRaw({url:link,html:html({...listing,offers:{price:50000,priceCurrency:'EUR'}})});
 assert.equal(r.price_mad,null);assert.equal(r.gate,'review_incomplete');assert.equal(r.eligible,false);
});