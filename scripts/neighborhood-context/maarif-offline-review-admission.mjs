import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Private-only bridge between a pinned OSM extract and independently reviewed evidence.
 * Does NOT import the runtime read-model, call Overpass, publish POIs, or write to a DB.
 * The data in source/review files is untrusted. Source links are declarations, not
 * automatically verified webpages. Reviewers must examine original sources separately.
 */
export const QA_SCHEMA = "AKARFINDER_MAARIF_OSM_PBF_QA_V1";
export const REVIEW_SCHEMA = "AKARFINDER_MAARIF_POI_PRIORITY_SOURCE_RECONCILIATION_V1";
export const OUTPUT_SCHEMA = "AKARFINDER_MAARIF_OFFLINE_PRIVATE_ADMISSION_V1";
export const PINNED_MD5 = "c2334c9499b4565a6a16cf2f45624912";

export function verifyPinnedCandidateExportBytes(sourceBytes, manifest) {
  if(!sourceBytes || !manifest || typeof manifest.candidate_snapshot_sha256 !== "string" ||
     !/^[a-f0-9]{64}$/i.test(manifest.candidate_snapshot_sha256)) return false;
  const actual = createHash("sha256").update(sourceBytes).digest("hex");
  return actual===manifest.candidate_snapshot_sha256.toLowerCase();
}


const DAY_MS = 86_400_000;
const MAX_EVIDENCE_AGE_DAYS = 30;
const SOURCE_DOMAINS_BLOCKED = new Set(["openstreetmap.org", "www.openstreetmap.org", "geofabrik.de",
  "www.geofabrik.de", "overpass-api.de", "overpass.private.coffee"]);

function validHttpSource(url) {
  if (typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && !SOURCE_DOMAINS_BLOCKED.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}
function recentTimestamp(value, now, maxDays=MAX_EVIDENCE_AGE_DAYS) {
  if (typeof value !== "string") return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp >= now.getTime() - maxDays * DAY_MS &&
    timestamp <= now.getTime();
}
function distanceM(a, b) {
  const k = Math.PI / 180;
  const dlat = (b.latitude - a.latitude) * k;
  const dlon = (b.longitude - a.longitude) * k;
  const x = Math.sin(dlat/2)**2 + Math.cos(a.latitude*k)*Math.cos(b.latitude*k)*Math.sin(dlon/2)**2;
  return 12742000 * Math.asin(Math.min(1,Math.sqrt(x)));
}

export function evaluatePrivateOfflineAdmission({source, reviews, manifest, now=new Date()}) {
  const hardErrors=[];
  const result={
    schema: OUTPUT_SCHEMA,
    status:"PRIVATE_PREVIEW_CANDIDATES_ONLY",
    never_publish_automatically:true,
    public_read_model_write:false,
    database_write:false,
    overpass_request_count:0,
    original_osm_license:"ODbL-1.0",
    release_requires_separate_human_authorization:true,
    extraction_structurally_valid:false,
    source_candidate_count:0,
    review_queue_count:0,
    review_admission_candidates:[],
    refused_by_reason:{},
    hardErrors,
  };
  if (!source || source.schema!==QA_SCHEMA || source.status!=="QA_CANDIDATES_NOT_PUBLISHABLE" ||
      source.source?.md5_verified!==true || source.source?.md5!==PINNED_MD5 ||
      source.source?.license!=="ODbL-1.0" ||
      source.publication_guard?.eligible!==false ||
      source.publication_guard?.no_ui_publication!==true ||
      source.publication_guard?.db_write!==false) hardErrors.push("source_pbf_provenance_or_private_guard");
  if (!manifest || manifest.checksum_matched!==true ||
      manifest.checksum!==PINNED_MD5 ||
      manifest.pbf_header_replication_timestamp_utc!== "2026-11-08T21:21:00Z" ||
      manifest.file_size_bytes!==244434479) hardErrors.push("pbf_manifest_mismatch");
  if (reviews?.schema!==REVIEW_SCHEMA ||
      reviews.status!=="PRIVATE_SECONDARY_SOURCE_REVIEW_NOT_PUBLISHABLE" ||
      !Array.isArray(reviews.candidates)) hardErrors.push("review_ledger_not_private");
  if (!Array.isArray(source?.candidates) || source.candidates_count!==source.candidates?.length ||
      source.candidates_count===0) hardErrors.push("invalid_candidate_inventory");
  if (hardErrors.length) return result;

  if(source.geographic_scope?.claim!=="radius_context_only_no_quarter_membership" ||
     source.geographic_scope?.radius_m!==1800 ||
     Math.abs(source.geographic_scope?.reference_center?.latitude - 33.5898)>0.000001 ||
     Math.abs(source.geographic_scope?.reference_center?.longitude - (-7.644))>0.000001){
    hardErrors.push("source_radius_not_certified_pilot");
    return result;
  }
  const categoryCounts = {};
  const geometryCounts = {node:0,way:0,relation:0};
  const candidateById=new Map();
  for (const c of source.candidates) {
    if (typeof c.source_id!=="string" || !/^(node|way|relation)\/[1-9]\d*$/.test(c.source_id) ||
        candidateById.has(c.source_id)) {
      hardErrors.push("ambiguous_osm_identity");return result;
    }
    if (c.status!=="candidate_requires_independent_review" ||
      c.current_operation_verified!==false ||
      c.position_precision_independently_verified!==false ||
      c.central_quarter_membership_certified!==false ||
      c.source_license!=="ODbL-1.0") {hardErrors.push("candidate_claims_prior_certification");return result;}
    if(typeof c.name_osm!=="string" || !c.name_osm.trim() ||
      c.source_url!=="https://www.openstreetmap.org/"+c.source_id ||
      !["education","groceries","health","transport","green_sport","shopping"].includes(c.category) ||
      !Number.isFinite(c.latitude)||!Number.isFinite(c.longitude)||
      Math.abs(c.latitude)>90||Math.abs(c.longitude)>180||
      distanceM({latitude:33.5898,longitude:-7.644},c)>1800.5){
      hardErrors.push("malformed_or_outside_radius_candidate");return result;
    }
    const modified=c.osm_object_modified_at;
    if(modified!=null && (!Number.isFinite(Date.parse(modified)) ||
      Date.parse(modified)>now.getTime())) {
      hardErrors.push("invalid_object_edit_timestamp");return result;
    }
    const type=c.source_id.split("/")[0];
    geometryCounts[type]++;
    categoryCounts[c.category]=(categoryCounts[c.category]||0)+1;
    candidateById.set(c.source_id,c);
  }
  for(const [category,count] of Object.entries(categoryCounts)){
    if(source.counts?.[category]!==count){hardErrors.push("category_count_mismatch");return result;}
  }
  for(const [type,count] of Object.entries(geometryCounts)){
    if((source.object_types?.[type]??0)!==count){hardErrors.push("geometry_count_mismatch");return result;}
  }
  const seenReviews=new Set();
  for(const item of reviews.candidates){
    const id=item?.osm_id;
    if(typeof id!=="string" || !candidateById.has(id) || seenReviews.has(id)) {
      hardErrors.push("duplicate_or_unknown_review_identity");return result;
    }
    seenReviews.add(id);
  }
  result.extraction_structurally_valid=true;
  result.source_candidate_count=candidateById.size;
  result.review_queue_count=seenReviews.size;
  const refuse=(reason)=>{result.refused_by_reason[reason]=(result.refused_by_reason[reason]||0)+1;};
  for(const item of reviews.candidates){
    const candidate=candidateById.get(item.osm_id);
    if(item.safe_to_publish_as_verified!==true || item.review_status!=="approved_for_private_preview"){
      refuse("manual_review_not_approved");continue;
    }
    // No app may equate OSM edit timestamps or extract dates with field inspection.
    const evidence=item.independent_review;
    if (!evidence || typeof evidence.reviewer_id!=="string" ||
        !/^\S.{3,}$/.test(evidence.reviewer_id) ||
        !recentTimestamp(evidence.reviewed_at,now)) {refuse("reviewer_or_review_time_missing");continue;}
    const identity=evidence.identity;
    const position=evidence.position;
    const operation=evidence.operation;
    const license=evidence.odbl;
    if(!identity || identity.name_address_match!==true ||
      !validHttpSource(identity.source_url) ||
      !recentTimestamp(identity.verified_at,now)) {refuse("independent_identity_missing");continue;}
    if(!position || !validHttpSource(position.source_url) ||
      !recentTimestamp(position.verified_at,now) ||
      !Number.isFinite(position.latitude) || !Number.isFinite(position.longitude) ||
      Math.abs(position.latitude)>90 || Math.abs(position.longitude)>180) {
        refuse("independent_position_missing");continue;
      }
    const locationGap=distanceM({latitude:candidate.latitude,longitude:candidate.longitude},position);
    const maxGap=item.osm_id.startsWith("node/")?75:250;
    if(locationGap>maxGap){refuse("position_mismatch");continue;}
    if(!operation || operation.documented_as_operating_at_check!==true ||
       !validHttpSource(operation.source_url) ||
       !recentTimestamp(operation.verified_at,now)){
      refuse("operation_evidence_missing_or_stale");continue;
    }
    if(!license || license.odbl_review_accepted!==true ||
      !recentTimestamp(license.checked_at,now) ||
      typeof license.reviewer_id!=="string" || license.reviewer_id!==evidence.reviewer_id){
      refuse("odbl_review_missing");continue;
    }
    if(evidence.boundary_claim!=="radius_context_only" ||
       evidence.quartier_central_certified!==false ||
       evidence.current_open_now_claim!==false){
      refuse("unsupported_boundary_or_open_now_claim");continue;
    }
    if(identity.source_url===position.source_url &&
       identity.source_url===operation.source_url){
      refuse("single_source_cannot_prove_three_independent_checks");continue;
    }
    // Use oldest verification time: never mint fresh evidence from the export time.
    const asOf=[identity.verified_at,position.verified_at,operation.verified_at]
      .map(s=>Date.parse(s)).sort((a,b)=>a-b)[0];
    result.review_admission_candidates.push({
      osm_id:item.osm_id,
      category:candidate.category,
      name:candidate.name_osm,
      osm_source_url:candidate.source_url,
      verified_latitude:position.latitude,
      verified_longitude:position.longitude,
      distance_from_osm_point_m:Math.round(locationGap*10)/10,
      evidence_observed_at:new Date(asOf).toISOString(),
      location_claim:"radius_context_only",
      not_open_now_certification:true,
      current_business_state_only_as_of_evidence:true,
      reviewer_id:evidence.reviewer_id,
      source_license:"ODbL-1.0",
      publication_status:"requires_separate_human_release",
    });
  }
  result.review_admission_candidates.sort((a,b)=>a.osm_id.localeCompare(b.osm_id));
  return result;
}

if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2);
  const get=k=>{const i=args.indexOf(k);return i<0?null:args[i+1];};
  const input=get("--input"),ledger=get("--reviews"),manifest=get("--manifest"),out=get("--output");
  if(!input||!ledger||!manifest||!out){
    console.error("Usage: node scripts/neighborhood-context/maarif-offline-review-admission.mjs --input private-pbf.json --reviews private-review-ledger.json --manifest pinned-source-manifest.json --output private-report.json");
    process.exitCode=2;
  } else try{
    const [sourceBytes,ledgerBytes,manifestBytes]=await Promise.all(
      [input,ledger,manifest].map(async f=>readFile(resolve(f))));
    const metadata=JSON.parse(manifestBytes.toString("utf8"));
    if(!verifyPinnedCandidateExportBytes(sourceBytes,metadata)) {
      throw new Error("candidate_snapshot_sha256 mismatch: source data changed after QA capture");
    }
    const source=JSON.parse(sourceBytes.toString("utf8"));
    const reviews=JSON.parse(ledgerBytes.toString("utf8"));
    const report=evaluatePrivateOfflineAdmission({source,reviews,manifest:metadata});
    await mkdir(dirname(resolve(out)),{recursive:true});
    await writeFile(resolve(out),JSON.stringify(report,null,2)+"\n","utf8");
    console.log(JSON.stringify({
      structural_ok:report.extraction_structurally_valid,
      source_candidate_count:report.source_candidate_count,
      reviews:report.review_queue_count,
      private_preview_admissions:report.review_admission_candidates.length,
      refused:report.refused_by_reason,
      publishable:false,
      output:resolve(out),
    }));
    if(report.hardErrors.length)process.exitCode=1;
  }catch(error){console.error(String(error));process.exitCode=1;}
}
