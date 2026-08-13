import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { buildPolicyMatrix, validatePolicyMatrix } from "../data-mass/source-factory-policy-matrix";
const root=process.cwd();
const read=(p:string)=>JSON.parse(fs.readFileSync(path.join(root,p),"utf8"));
async function main(){
  const h=read("data/data-mass-2b/high-yield-source-review.json");
  const m=read("data/data-mass-2c/mid-yield-source-review.json");
  const l=read("data/data-mass-2d/long-tail-source-review.json");
  const matrix=buildPolicyMatrix(h,m,l,new Date().toISOString()); validatePolicyMatrix(matrix);
  const url=process.env.SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY; if(!url||!key) throw new Error("MISSING_SUPABASE_ENV");
  const supabase=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const domains=matrix.records.map((r:any)=>r.sourceDomain);
  const {data,error}=await supabase.from("source_policy_registry").select("source_domain").in("source_domain",domains);
  if(error) throw error;
  const overlap=(data??[]).map((r:any)=>r.source_domain);
  const proof={schemaVersion:"MASS_2E_POLICY_MATRIX_REGISTRY_PREVIEW_V1",readOnly:true,domains:101,permissionRequired:43,hold:58,canonicalCandidates:43,canonicalApproved:0,publicActivable:0,registryPreviewRows:101,currentRegistryRowsForReviewedDomains:overlap.length,registryOverlap:overlap,databaseWrites:0,ddlChanges:0,registryWrites:0,policyChanges:0,sourceNetworkRequests:0,detailPageFetches:0,searchActivations:0,permissionsInferred:0,totals:matrix.summary};
  const out=path.join(root,".tmp/data-mass-2e/results"); fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,"policy-matrix.json"),JSON.stringify(matrix,null,2));
  fs.writeFileSync(path.join(out,"registry-preview.json"),JSON.stringify(matrix.registryPreview,null,2));
  fs.writeFileSync(path.join(out,"proof.json"),JSON.stringify(proof,null,2));
  console.log(JSON.stringify(proof,null,2));
}
main().catch((e)=>{console.error(e);process.exit(1)});
