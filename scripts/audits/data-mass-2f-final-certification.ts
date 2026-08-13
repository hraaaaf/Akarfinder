import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { buildPolicyMatrix, validatePolicyMatrix } from "../data-mass/source-factory-policy-matrix";
import { buildFinalCertification, validateFinalCertification } from "../data-mass/source-factory-final-certification";
const root=process.cwd();
const read=(p:string)=>JSON.parse(fs.readFileSync(path.join(root,p),"utf8"));
async function main(){
  const h=read("data/data-mass-2b/high-yield-source-review.json");
  const m=read("data/data-mass-2c/mid-yield-source-review.json");
  const l=read("data/data-mass-2d/long-tail-source-review.json");
  const generatedAt=new Date().toISOString();
  const matrix=buildPolicyMatrix(h,m,l,generatedAt); validatePolicyMatrix(matrix);
  const certification=buildFinalCertification(h,m,l,generatedAt); validateFinalCertification(certification);
  const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY; if(!url||!key) throw new Error("MISSING_SUPABASE_ENV");
  const supabase=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const domains=matrix.records.map((r:any)=>r.sourceDomain);
  const [registry,search,thin]=await Promise.all([
    supabase.from("source_policy_registry").select("source_domain").in("source_domain",domains),
    supabase.from("public_search_representations_v1").select("source_domain").in("source_domain",domains),
    supabase.from("thin_index_search_documents").select("source_domain").in("source_domain",domains)
  ]);
  if(registry.error) throw registry.error; if(search.error) throw search.error; if(thin.error) throw thin.error;
  const registryDomains=[...new Set((registry.data??[]).map((r:any)=>r.source_domain))];
  const publicSearchDomains=[...new Set((search.data??[]).map((r:any)=>r.source_domain))];
  const thinIndexDomains=[...new Set((thin.data??[]).map((r:any)=>r.source_domain))];
  if(registryDomains.length!==0) throw new Error(`REGISTRY_BYPASS:${registryDomains.length}`);
  if(publicSearchDomains.length!==0) throw new Error(`PUBLIC_SEARCH_BYPASS:${publicSearchDomains.length}`);
  const proof={schemaVersion:"MASS_2F_FINAL_PROOF_V1",status:"PASS",readOnly:true,generatedAt,headSha:process.env.GITHUB_HEAD_SHA??process.env.GITHUB_SHA??null,certification,registryRowsForReviewedDomains:(registry.data??[]).length,registryDomains,publicSearchRowsForReviewedDomains:(search.data??[]).length,publicSearchDomains,thinIndexRowsForReviewedDomains:(thin.data??[]).length,thinIndexDomains,databaseWrites:0,ddlChanges:0,registryWrites:0,policyChanges:0,sourceNetworkRequests:0,detailPageFetches:0,searchActivations:0,permissionsInferred:0};
  const out=path.join(root,".tmp/data-mass-2f/results"); fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,"proof.json"),JSON.stringify(proof,null,2));
  fs.writeFileSync(path.join(out,"policy-matrix.json"),JSON.stringify(matrix,null,2));
  console.log(JSON.stringify(proof,null,2));
}
main().catch((e)=>{console.error(e);process.exit(1)});
