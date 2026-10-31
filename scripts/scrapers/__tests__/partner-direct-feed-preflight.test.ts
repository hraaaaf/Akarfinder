import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,writeFile,readFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {inspectPartnerFeedFiles} from "../../data/partner-direct-feed-preflight.js";
const AS_OF="2026-10-30T20:00:00Z";
const goodCsv="external_id,source_name,source_url,transaction_type,property_type,title,city,district,price_mad,surface_m2,updated_at_source,images_rights_confirmed\n"+
"REAL-1,demo-direct,https://demo-direct.example.ma/listings/1,sale,apartment,Appartement Agdal,Rabat,Agdal,1850000,101,2026-10-30T18:00:00Z,false\n";
const approval={
 context:{partner_id:"demo-direct",partner_type:"agency",partner_tier:"agency_partner",source_authorization_note:"Synthetic demo only",acquisition_channel:"partner_feed"},
 authorization:{partner_id:"demo-direct",source_name:"demo-direct",source_hostname:"demo-direct.example.ma",
 status:"reviewed_allow",permission_ref:"synthetic-test-agreement-1",reviewed_by:"synthetic-reviewer",
 valid_from:"2026-10-01T00:00:00Z",valid_until:"2026-11-30T00:00:00Z",currency:"MAD",
 price_basis:"total_sale_or_monthly_rent",image_reuse_allowed:false}
};
const receipt=[{external_id:"REAL-1",source_name:"demo-direct",status:"available",
 confirmed_at:"2026-10-30T18:00:00Z",issuer_role:"mandated_agent",issuer_verified:true,
 evidence_ref:"synthetic-availability-1",price_basis:"total_sale"}];
async function execute(csv:string,auth:unknown,receipts:unknown){
 const dir=await mkdtemp(join(tmpdir(),"akf-direct-partner-"));
 try{
  const feedFile=join(dir,"input.csv"),authorizationFile=join(dir,"auth.json"),receiptsFile=join(dir,"receipts.json"),outputDir=join(dir,"out");
  await Promise.all([writeFile(feedFile,csv),writeFile(authorizationFile,JSON.stringify(auth)),writeFile(receiptsFile,JSON.stringify(receipts))]);
  const result=await inspectPartnerFeedFiles({feedFile,authorizationFile,receiptsFile,outputDir,asOf:AS_OF});
  return {result,rows:(await readFile(join(outputDir,"review-decisions.jsonl"),"utf8")).trimEnd().split("\n").map(JSON.parse),
   saved:JSON.parse(await readFile(join(outputDir,"summary.json"),"utf8"))};
 }finally{await rm(dir,{recursive:true,force:true});}
}
test("real file CLI pipeline stages synthetic entry only for review, not DB",async()=>{
 const {result,rows,saved}=await execute(goodCsv,approval,receipt);
 assert.equal(result.candidate_v2_review,1);assert.equal(result.admitted_as_fresh_inventory,0);
 assert.equal(saved.permission_authenticity_independently_verified_by_runner,false);
 assert.equal(rows[0].eligible_for_db,false);assert.equal(rows[0].publishable,false);
 assert.equal(typeof saved.source_feed_sha256,"string");
});
test("real file route without authorization denies all",async()=>{
 const {result}=await execute(goodCsv,{...approval,authorization:null},receipt);
 assert.equal(result.candidate_v2_review,0);assert.equal(result.hold,1);
});
test("current feed but missing confirmations stays blocked",async()=>{
 const {result}=await execute(goodCsv,approval,[]);
 assert.equal(result.candidate_v2_review,0);assert.equal(result.hold,1);
});
test("real historical agency fixture cannot be silently admitted",async()=>{
 const old=await readFile("data/imports/fixtures/agency-feed.csv","utf8");
 const {result}=await execute(old,approval,[]);
 assert.equal(result.total_input_rows,3);assert.equal(result.admitted_as_fresh_inventory,0);
 assert.equal(result.candidate_v2_review,0);assert.equal(result.hold,3);
});
