import test from "node:test";
import assert from "node:assert/strict";
import { buildMinimalListing, isPolicyAdmissible } from "../minimal-listing-index-policy";

const future="2099-01-01T00:00:00.000Z";
const allowed={source_domain:"example.ma",authorization_status:"authorized",machine_gate:"canonical_link_only",ingestion_gate:"canonical_link_only",display_gate:"external_tail_link_only",policy_expires_at:future};

test("MASS-3A requires explicit positive, non-expired policy",()=>{
  assert.equal(isPolicyAdmissible(allowed,new Date("2026-08-13T00:00:00Z")),true);
  assert.equal(isPolicyAdmissible({...allowed,authorization_status:"unverified"}),false);
  assert.equal(isPolicyAdmissible({...allowed,authorization_status:"permission_required"}),false);
  assert.equal(isPolicyAdmissible({...allowed,display_gate:"hidden"}),false);
  assert.equal(isPolicyAdmissible({...allowed,policy_expires_at:"2026-08-10T00:00:00Z"},new Date("2026-08-13T00:00:00Z")),false);
});

test("minimal existence needs canonical URL, source and reliable signal only",()=>{
  const listing=buildMinimalListing({canonicalUrl:"https://example.ma/a/1",sourceDomain:"example.ma",titleOrStructuralSignal:"Appartement Agdal"},allowed,new Date("2026-08-13T00:00:00Z"));
  assert.equal(listing.price,null);
  assert.equal(listing.surface,null);
  assert.equal(listing.photoUrl,null);
  assert.equal(listing.description,null);
  assert.equal(listing.geography,null);
});

test("optional fields are preserved but never invented",()=>{
  const listing=buildMinimalListing({canonicalUrl:"https://example.ma/a/2",sourceDomain:"example.ma",titleOrStructuralSignal:"Villa",geography:"Rabat",price:4200000},allowed,new Date("2026-08-13T00:00:00Z"));
  assert.equal(listing.geography,"Rabat");
  assert.equal(listing.price,4200000);
  assert.equal(listing.surface,null);
});

test("policy failure blocks construction",()=>{
  assert.throws(()=>buildMinimalListing({canonicalUrl:"https://example.ma/a/3",sourceDomain:"example.ma",titleOrStructuralSignal:"X"},{...allowed,authorization_status:"unverified"}),/SOURCE_POLICY_NOT_ADMISSIBLE/);
});
