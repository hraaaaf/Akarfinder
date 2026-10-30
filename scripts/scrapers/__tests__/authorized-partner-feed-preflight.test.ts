import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {parseCsvFeed,parseJsonFeed} from "../../../lib/feeds/parsers.js";
import {preflightAuthorizedPartnerFeed,type SourceApproval,type PartnerActivityReceipt} from "../../../lib/feeds/authorized-preflight.js";
const asOf="2026-10-30T19:00:00Z";
const context={partner_id:"sample-agency",partner_type:"agency" as const,partner_tier:"agency_partner" as const,
  source_authorization_note:"Approved partner contract evidence, sample only.",acquisition_channel:"partner_feed" as const};
const approval:SourceApproval={partner_id:"sample-agency",source_name:"sample-agency",
  source_hostname:"agency.example.ma",status:"reviewed_allow",permission_ref:"contract-evidence-1234",
  reviewed_by:"sample-legal-reviewer",valid_from:"2026-10-01T00:00:00Z",
  valid_until:"2026-11-30T00:00:00Z",currency:"MAD",
  price_basis:"total_sale_or_monthly_rent",image_reuse_allowed:false};
const receipt:PartnerActivityReceipt={external_id:"AG-77",source_name:"sample-agency",
  status:"available",confirmed_at:"2026-10-30T16:00:00Z",issuer_role:"mandated_agent",
  issuer_verified:true,evidence_ref:"source-activity-1234",price_basis:"total_sale"};
const csv="external_id,source_name,source_url,transaction_type,property_type,title,city,district,price_mad,surface_m2,updated_at_source,images_rights_confirmed\n"+
 "AG-77,sample-agency,https://agency.example.ma/ads/77,sale,apartment,Appartement Agdal,Rabat,Agdal,1750000,95,2026-10-30T16:00:00Z,false\n";
const one=()=>parseCsvFeed(csv);
test("sample current authorized declarations give only review candidate, never DB/publication",()=>{
 const r=preflightAuthorizedPartnerFeed(one(),context,approval,[receipt],asOf);
 assert.equal(r.summary.candidate_v2_review,1);
 assert.equal(r.summary.eligible_for_db,0);assert.equal(r.summary.publishable,0);
 assert.equal(r.reviewed[0].partner_listing_id,"AG-77");
});
test("unreviewed, revoked, expired or missing approval always holds",()=>{
 for(const a of [null,{...approval,status:"revoked" as const},{...approval,status:"unreviewed" as const},
  {...approval,valid_until:"2026-10-01T00:00:00Z"}]){
  const r=preflightAuthorizedPartnerFeed(one(),context,a,[receipt],asOf);
  assert.equal(r.summary.candidate_v2_review,0);assert.equal(r.summary.hold,1);
 }
});
test("stale feed or missing independent receipt cannot be marked available",()=>{
 const stale=one();stale[0].updated_at_source="2026-08-01T00:00:00Z";
 assert.equal(preflightAuthorizedPartnerFeed(stale,context,approval,[receipt],asOf).summary.hold,1);
 for(const receipts of [[],[{...receipt,status:"unknown" as const}],
   [{...receipt,confirmed_at:"2026-10-01T00:00:00Z"}]]){
  assert.equal(preflightAuthorizedPartnerFeed(one(),context,approval,receipts,asOf).summary.hold,1);
 }
});
test("price cadence, missing district, missing price and unsupported host hold",()=>{
 const data=one();
 const scenarios=[
  {...data[0],source_url:"https://evil.example.ma/ads/77"},
  {...data[0],district:null},
  {...data[0],price_mad:null}
 ];
 for(const row of scenarios)assert.equal(preflightAuthorizedPartnerFeed([row],context,approval,[receipt],asOf).summary.hold,1);
 assert.equal(preflightAuthorizedPartnerFeed(one(),context,approval,[{...receipt,price_basis:"monthly_rent"}],asOf).summary.hold,1);
});
test("duplicate external_id and same URL under different IDs do not get double-certified",()=>{
 const dup=[...one(),{...one()[0]}];
 assert.equal(preflightAuthorizedPartnerFeed(dup,context,approval,[receipt],asOf).summary.candidate_v2_review,1);
 assert.equal(preflightAuthorizedPartnerFeed(dup,context,approval,[receipt],asOf).summary.hold,1);
 const collision=[...one(),{...one()[0],external_id:"AG-78"}];
 assert.equal(preflightAuthorizedPartnerFeed(collision,context,approval,[receipt],asOf).summary.candidate_v2_review,0);
});
test("withdrawal accepted as lifecycle review with approval, not as active listing",()=>{
 const stop=one();stop[0]={...stop[0],update_signal:"unpublish",title:"",district:null,price_mad:null,surface_m2:null};
 const r=preflightAuthorizedPartnerFeed(stop,context,approval,[],asOf);
 assert.equal(r.summary.lifecycle_review,1);assert.equal(r.summary.candidate_v2_review,0);
 assert.equal(r.summary.eligible_for_db,0);
});
test("existing historical demo feed cannot certify current inventory",()=>{
 const old=parseCsvFeed(readFileSync("data/imports/fixtures/agency-feed.csv","utf8"));
 const r=preflightAuthorizedPartnerFeed(old,context,approval,[],asOf);
 assert.equal(r.summary.candidate_v2_review,0);
 assert.equal(r.summary.hold,3);
});
test("images permission and source PII cannot bypass preflight",()=>{
 const row=one()[0];row.image_urls=["https://cdn.example.ma/test.jpg"];row.images_rights_confirmed=true;
 assert.equal(preflightAuthorizedPartnerFeed([row],context,approval,[receipt],asOf).summary.hold,1);
 const pii=one()[0];pii.title="Appartement 0612345678";
 assert.equal(preflightAuthorizedPartnerFeed([pii],context,approval,[receipt],asOf).summary.hold,1);
});
