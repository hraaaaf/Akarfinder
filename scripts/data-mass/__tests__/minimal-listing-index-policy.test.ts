import test from "node:test";
import assert from "node:assert/strict";
import { buildMinimalListing, isPolicyAdmissible } from "../minimal-listing-index-policy";

const future="2099-01-01T00:00:00.000Z";
const limited={source_domain:"example.ma",authorization_status:"limited_public_facts",acquisition_mode:"public_sitemap_canonical_link",machine_gate:"canonical_link_only",ingestion_gate:"canonical_link_only",display_policy:"canonical_link_only",policy_expires_at:future};
const partner={source_domain:"partner.ma",authorization_status:"authorized_partner",acquisition_mode:"partner_feed",machine_gate:"partner_feed",ingestion_gate:"partner_feed",display_policy:"partner_content",policy_expires_at:future};

test("MASS-3A accepts only explicit positive, non-expired Registry paths",()=>{
  const now=new Date("2026-08-13T00:00:00Z");
  assert.equal(isPolicyAdmissible(limited,now),true);
  assert.equal(isPolicyAdmissible(partner,now),true);
  assert.equal(isPolicyAdmissible({...limited,authorization_status:"unverified"},now),false);
  assert.equal(isPolicyAdmissible({...limited,authorization_status:"permission_required"},now),false);
  assert.equal(isPolicyAdmissible({...limited,display_policy:"internal_signal_only"},now),false);
  assert.equal(isPolicyAdmissible({...limited,policy_expires_at:"2026-08-10T00:00:00Z"},now),false);
});

test("minimal listing content contract is ville + quartier + prix; title and richer fields are optional",()=>{
  const listing=buildMinimalListing({
    canonicalUrl:"https://example.ma/a/1",
    sourceDomain:"example.ma",
    city:"Rabat",
    district:"Agdal",
    price:1250000,
  },limited,new Date("2026-08-13T00:00:00Z"));

  assert.equal(listing.city,"Rabat");
  assert.equal(listing.district,"Agdal");
  assert.equal(listing.price,1250000);
  assert.equal(listing.titleOrStructuralSignal,null);
  assert.equal(listing.surface,null);
  assert.equal(listing.photoUrl,null);
  assert.equal(listing.description,null);
});

test("missing any one of ville, quartier or prix blocks minimal construction",()=>{
  const base={canonicalUrl:"https://example.ma/a/2",sourceDomain:"example.ma",city:"Rabat",district:"Agdal",price:1250000};
  const now=new Date("2026-08-13T00:00:00Z");
  assert.throws(()=>buildMinimalListing({...base,city:""},limited,now),/CITY_REQUIRED/);
  assert.throws(()=>buildMinimalListing({...base,district:""},limited,now),/DISTRICT_REQUIRED/);
  assert.throws(()=>buildMinimalListing({...base,price:null},limited,now),/PRICE_REQUIRED/);
  assert.throws(()=>buildMinimalListing({...base,price:0},limited,now),/PRICE_REQUIRED/);
});

test("policy failure still blocks construction even with complete minimum facts",()=>{
  assert.throws(()=>buildMinimalListing({
    canonicalUrl:"https://example.ma/a/3",
    sourceDomain:"example.ma",
    city:"Rabat",
    district:"Agdal",
    price:1250000,
  },{...limited,authorization_status:"unverified"}),/SOURCE_POLICY_NOT_ADMISSIBLE/);
});
