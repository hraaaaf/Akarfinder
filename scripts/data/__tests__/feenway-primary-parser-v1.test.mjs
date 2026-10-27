import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePrimary} from '../../acquisition/feenway-primary-parser-v1.mjs';
function example(source,id,title,text,final){
 const identities={'mubawab.ma':'a:'+id,'avito.ma':'avito:'+id,'agenz.ma':'agenz:'+id,'masaken.ma':'masaken:'+id,'sarouty.ma':'sarouty:'+id,'yakeey.com':'yakeey:test-ma'+id};
 const urls={
 'mubawab.ma':'https://www.mubawab.ma/fr/a/'+id+'/detail',
 'avito.ma':'https://www.avito.ma/fr/ville/appartements/test_'+id+'.htm',
 'agenz.ma':'https://agenz.ma/fr/annonces/city/'+id,
 'masaken.ma':'https://www.masaken.ma/fr/immobilier-maroc/detail/'+id,
 'sarouty.ma':'https://sarouty.ma/property-details/?listing_id='+id,
 'yakeey.com':'https://yakeey.com/fr-ma/test-ma'+id
 };
 return parsePrimary({source,identity:identities[source],original_url:urls[source],final_url:final||urls[source],title,text});
}
const mub='Traitement en cours...\n### 11 000 DH\n90m²\n4 Pièces\n### Casablanca Finance City à Casablanca\n### 11 000 DH\n90m²\n#### Contacter l\u0027annonceur\n# Appartement à louer\nAutres biens 99999999 DH';
test('Mubawab: primary headline price and area, exclude related listings',()=>{
 const r=example('mubawab.ma','8399673','Appartement à louer à Casablanca',mub);
 assert.equal(r.price_mad,11000);assert.equal(r.surface_m2,90);assert.equal(r.city,'Casablanca');assert.equal(r.district,'Casablanca Finance City');assert.equal(r.transaction,'rent');assert.equal(r.gate,'review_five_fields');assert.equal(r.eligible,false);
});
test('Mubawab: no invention of district from city-only header',()=>{
 const r=example('mubawab.ma','8403457','Appartement à louer','### 7 500 DH\n65m²\n### Dar Bouazza\n#### Contacter l\u0027annonceur');
 assert.equal(r.price_mad,7500);assert.equal(r.surface_m2,65);assert.equal(r.city,'Dar Bouazza');assert.equal(r.district,null);assert.equal(r.fields_5_present,false);
});
test('Mubawab: conflicting header prices fail review gate',()=>{
 const r=example('mubawab.ma','8399673','Appartement à louer',mub.replace('### 11 000 DH\n90m²\n####','### 13 000 DH\n90m²\n####'));
 assert.equal(r.price_mad,null);assert.equal(r.gate,'review_economic_or_field_conflict');
});
test('Avito: source price and total area, not recommendations',()=>{
 const t='# Appartement vide à louer\nMesnana, Tangeril y a 23 heures\n4 700 DH\nRéf de l\u0027annonce : #57405312\nCategorieAppartements, à louer\n70Surface totale\n## Description\nAppartement voisin 70 000 DH';
 const r=example('avito.ma','57405312','Appartement vide à louer à Tanger',t);
 assert.equal(r.price_mad,4700);assert.equal(r.surface_m2,70);assert.equal(r.city,'Tanger');assert.equal(r.district,'Mesnana');assert.equal(r.fields_5_present,true);
});
test('Avito: pas de porte flagged, not eligible',()=>{
 const r=example('avito.ma','58945147','Local à louer','# Local à louer\n800 000 DH\n151Surface totale\nPas-de-porte\n## Description');
 assert.ok(r.issues.includes('pas_de_porte'));assert.equal(r.eligible,false);
});
test('Agenz: structured price, surface and geography',()=>{
 const t='Appartement à vendre\n# Appartement familial - Espace et confort garantis\n1 100 000 DH\nCasablanca – Oulfa\nRéf. CMN-HA-2206\n2 Ch\n88 m²\nFiche du bien\n99999999 DH';
 const r=example('agenz.ma','93055','Appartement à vendre Oulfa',t);
 assert.equal(r.price_mad,1100000);assert.equal(r.surface_m2,88);assert.equal(r.city,'Casablanca');assert.equal(r.district,'Oulfa');assert.equal(r.fields_5_present,true);
});
test('Masaken: habitable vs terrain, district not promoted from description',()=>{
 const t='# Location appartement 74 m² à Salé\n3 200\nDH\n/ mois\nSurf. habitable\n74 m²\nDétails de prix\n**Prix total :** 3 200 DH\nDescription de propriétaire\nHay Chmaou\n**Surf. terrain:** 110 m²\nOptions';
 const r=example('masaken.ma','15428','Location appartement Salé',t);
 assert.equal(r.price_mad,3200);assert.equal(r.surface_m2,74);assert.equal(r.city,'Salé');assert.equal(r.district,null);assert.equal(r.price_period,'month');assert.equal(r.fields_5_present,false);
});
test('Sarouty: primary location and monthly price, not recommendations',()=>{
 const t='# Bureaux 127 m² à louer Centre Ville Casablanca\n17 000 DH / mois\n* Surface: 127 m²\n* Emplacement: Centre Ville Casablanca, Casablanca\n* Référence: locbur200226\n## Description\nvoisins 250 000 DH';
 const r=example('sarouty.ma','897663','Bureaux 127 m² à louer',t);
 assert.equal(r.price_mad,17000);assert.equal(r.surface_m2,127);assert.equal(r.city,'Casablanca');assert.equal(r.district,'Centre Ville Casablanca');assert.equal(r.price_period,'month');
});
test('Yakeey: route alias flagged but same numeric identity preserved',()=>{
 const t='### 6 700 DH\n# Appartement 86 m² à louer\nSurface totale\n86m²\n## Caractéristiques du bien\n### Ville:\nMarrakech\n### Quartier:\nIzdihar';
 const r=example('yakeey.com','183633','Appartement à louer',t,'https://yakeey.com/fr-ma/test-ta183633');
 assert.equal(r.identity_verified,true);assert.equal(r.price_mad,6700);assert.equal(r.surface_m2,86);assert.equal(r.city,'Marrakech');assert.equal(r.district,'Izdihar');assert.equal(r.gate,'review_source_route_alias');
});
test('Mismatch ID fails closed and never borrows other listing fields',()=>{
 const r=example('mubawab.ma','8399673','Appartement à louer',mub,'https://www.mubawab.ma/fr/a/9999999/else');
 assert.equal(r.identity_verified,false);assert.equal(r.price_mad,null);assert.equal(r.gate,'quarantine_identity');
});
test('Program routes excluded as individual properties',()=>{
 const r=parsePrimary({source:'mubawab.ma',identity:'pa:8388431',original_url:'https://www.mubawab.ma/fr/pa/8388431/detail',final_url:'https://www.mubawab.ma/fr/pa/8388431/detail',title:'Programme à vendre',text:mub});
 assert.equal(r.gate,'review_program');assert.equal(r.eligible,false);
});
test('Rental period is never fabricated from transaction alone',()=>{
 const r=example('mubawab.ma','8399673','Appartement à louer à Casablanca',mub);
 assert.equal(r.price_period,null);assert.ok(r.issues.includes('rental_period_unconfirmed'));
});
test('Explicit nightly rate gets an economic review',()=>{
 const t='### 250 DH\n56m²\n### Al Mahamid à Marrakech\n### 250 DH\n56m²\npar nuit\n#### Contacter l\u0027annonceur';
 const r=example('mubawab.ma','8441029','Appartement à louer',t);
 assert.ok(r.issues.includes('daily_or_nightly_rent'));assert.equal(r.gate,'review_economic_or_field_conflict');
});
test('No automatic availability or rights certification under any source',()=>{
 for(const source of ['mubawab.ma','avito.ma','yakeey.com','agenz.ma','masaken.ma','sarouty.ma']){
  const r=example(source,'123456','Appartement à vendre','### 1 000 000 DH\n98m²');
  assert.equal(r.eligible,false);assert.equal(r.availability_verified,false);assert.equal(r.reuse_rights_verified,false);
 }
});

test('Source original URL must match the source host and exact identity',()=>{
 const title='Appartement à louer à Casablanca';
 const body='### 11 000 DH\n90m²\n### Casablanca Finance City à Casablanca\n#### Contacter l\u0027annonceur';
 const good='https://www.mubawab.ma/fr/a/8399673/detail';
 const badHost=parsePrimary({source:'mubawab.ma',identity:'a:8399673',original_url:'https://other.example/fr/a/8399673/detail',final_url:good,title,text:body});
 assert.equal(badHost.identity_verified,false);assert.equal(badHost.gate,'quarantine_identity');
 const badId=parsePrimary({source:'mubawab.ma',identity:'a:8399673',original_url:'https://www.mubawab.ma/fr/a/1234567/detail',final_url:good,title,text:body});
 assert.equal(badId.identity_verified,false);assert.equal(badId.gate,'quarantine_identity');
});
test('Ambiguous sell-or-rent title cannot create transaction',()=>{
 const r=example('mubawab.ma','8399673','Appartement à vendre ou à louer','### 11 000 DH\n90m²\n### Casablanca Finance City à Casablanca\n#### Contacter l\u0027annonceur');
 assert.equal(r.transaction,null);assert.ok(r.issues.includes('transaction_unconfirmed'));assert.equal(r.fields_5_present,false);
});
test('Interportal identity is not established by same URL digits on wrong route',()=>{
 const base='https://www.mubawab.ma/fr/pa/8399673/test';
 const r=parsePrimary({source:'mubawab.ma',identity:'a:8399673',original_url:base,final_url:base,title:'Appartement à vendre',text:'### 1 000 000 DH\n95m²'});
 assert.equal(r.identity_verified,false);assert.equal(r.eligible,false);
});
