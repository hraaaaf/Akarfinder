#!/usr/bin/env tsx
// P1B.14 — Geometry Coverage Expansion foundation.
// Certifies geometry type/provenance boundaries and refuses arrondissement→neighborhood substitution.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import {
  CASABLANCA_GEOMETRY_SOURCE_POLICY,
  listCasablancaShadowGeometries,
  listCasablancaShadowGeometryCandidates,
} from "@/lib/geo/casablanca-neighborhood-geometry-shadow";

const POLICY=JSON.parse(readFileSync(join(process.cwd(),"data/geo/p1b14-geometry-level-policy.json"),"utf8"));
const TOPOLOGY=JSON.parse(readFileSync(join(process.cwd(),"data/geo/casablanca-arrondissements-osm.audit.json"),"utf8"));
const OUTPUT=join(process.cwd(),"data/audits/runtime/p1b14-typed-geometry-coverage.json");
function assert(v:unknown,m:string):asserts v{if(!v)throw new Error(m);}

export async function runP1B14TypedGeometryCoverage(){
 assert(POLICY.schema_version==="p1b14-typed-geometry-policy-v1","wrong P1B.14 policy schema");
 for(const k of ["read_only","name_only_cross_type_binding_forbidden","neighborhood_polygon_requires_neighborhood_grade_source","administrative_polygon_may_not_impersonate_neighborhood"]) assert(POLICY.policy[k]===true,`missing safe policy ${k}`);
 for(const k of ["registry_mutation","resolution_mutation","map_neighborhood_choropleth_default"]) assert(POLICY.policy[k]===false,`unsafe P1B.14 policy ${k}`);

 const candidates=listCasablancaShadowGeometryCandidates();
 const geometries=listCasablancaShadowGeometries();
 assert(TOPOLOGY.status==="passed"&&TOPOLOGY.allTopologiesValid===true,"Casablanca topology audit not passed");
 assert(TOPOLOGY.featureCount===16&&TOPOLOGY.uniqueRelationCount===16&&TOPOLOGY.uniqueCanonicalCount===16,"Casablanca geometry inventory drift");
 assert(candidates.length===16&&geometries.length===16,"Casablanca Shadow geometry count drift");
 assert(CASABLANCA_GEOMETRY_SOURCE_POLICY.usageMode==="shadow-only","administrative geometry must remain Shadow");
 assert(candidates.every(c=>c.sourceEntityType==="osm_relation"&&c.sourceAdminLevel==="10"&&c.publicationStatus==="shadow"&&!c.reviewed),"unexpected Casablanca candidate type/status");
 assert(geometries.every(g=>g.publicationStatus==="shadow"&&!g.reviewed&&g.source.licenseId==="ODbL-1.0"),"unexpected geometry publication/provenance status");

 const maarif=candidates.find(c=>c.neighborhoodCanonicalId==="maarif");
 assert(maarif?.sourceEntityId===2801474,"Maârif arrondissement source relation drift");
 const oasis=candidates.find(c=>c.neighborhoodCanonicalId==="oasis");
 assert(!oasis,"Oasis must not be silently introduced from the arrondissement inventory");
 const decisions=POLICY.explicit_decisions;
 assert(decisions.find((d:any)=>d.registry_entity_id==="district_casablanca_maarif")?.decision==="REJECT_CROSS_TYPE_NAME_ONLY_BINDING","Maârif cross-type rejection missing");
 assert(decisions.find((d:any)=>d.registry_entity_id==="district_casablanca_oasis")?.decision==="KEEP_GEOMETRY_UNRESOLVED","Oasis unresolved decision missing");

 // Live proof is deliberately narrow: P1B.14 certifies geometry typing, not listing-resolution coverage.
 // Querying the territorial join here is both unnecessary and expensive; prior Geo lots own that proof.
 const db=getSupabaseServerClient();
 const targets=["district_casablanca_maarif","district_casablanca_oasis"];
 const entitiesR=await db.from("geo_entities")
  .select("id,entity_type,parent_id,validation_status,map_eligible,seo_eligible")
  .in("id",targets);
 if(entitiesR.error)throw new Error(`P1B.14 entities read failed: ${entitiesR.error.message}`);
 const entities=entitiesR.data??[];
 assert(entities.length===2&&entities.every((e:any)=>e.entity_type==="neighborhood"&&e.parent_id==="city_casablanca"&&e.validation_status==="validated"),"Registry neighborhood identity drift");
 const registryState=Object.fromEntries(entities.map((e:any)=>[e.id,{map_eligible:e.map_eligible,seo_eligible:e.seo_eligible}]));
 assert(registryState.district_casablanca_maarif&&registryState.district_casablanca_oasis,"Registry target state missing");

 const report={
  schema_version:"p1b14-typed-geometry-coverage-v1",
  generated_at:new Date().toISOString(),
  contract:{read_only:true,registry_mutation:false,resolution_mutation:false,map_activation:false,seo_activation:false,name_only_cross_type_binding_forbidden:true},
  administrative_geometry:{territorial_type:"arrondissement",features:16,source_admin_level:"10",topology_status:"passed",publication_status:"shadow",license:"ODbL-1.0"},
  neighborhood_registry_targets:2,
  registry_target_state:registryState,
  map_eligible_does_not_imply_polygon_binding:true,
  certified_neighborhood_geometry_bindings:0,
  blocked_cross_type_bindings:[{registry_entity_id:"district_casablanca_maarif",geometry_canonical_id:"maarif",relation_id:2801474,reason:"source_geometry_is_arrondissement_not_neighborhood"}],
  unresolved_neighborhood_geometry:["district_casablanca_oasis"],
  neighborhood_choropleth_allowed:false,
  administrative_arrondissement_layer_preserved:true,
  verdict:"P1B14_TYPED_GEOMETRY_FOUNDATION_CERTIFIED_FAIL_CLOSED",
  next_boundary:"P1B.15 must certify Geo identity truth and keep neighborhood choropleth blocked until neighborhood-grade polygons exist.",
 };
 mkdirSync(dirname(OUTPUT),{recursive:true});writeFileSync(OUTPUT,`${JSON.stringify(report,null,2)}\n`);console.log(JSON.stringify(report,null,2));return report;
}
const invoked=Boolean(process.argv[1])&&import.meta.url===pathToFileURL(process.argv[1]).href;if(invoked)runP1B14TypedGeometryCoverage().catch(e=>{console.error(e instanceof Error?e.stack??e.message:String(e));process.exitCode=1;});
