export type ConsolidatedDecision = "PERMISSION_REQUIRED" | "HOLD";
export interface ReviewRecordLike {
  rank:number; sourceDomain:string; massPotentialScore:number; decision:ConsolidatedDecision;
  sourceAcquisition:string; termsStatus:string; publicIndexingMode:string; identityUrl:string; termsUrl:string|null; rationale:string;
  yield?: { urlRepresentations:number; likelyMoroccoRealEstateUrls:number; likelyMoroccoListingDetailUrls:number };
}
export interface ReviewManifestLike { reviewedAt:string; records:ReviewRecordLike[] }
export interface RegistryPreviewRow {
  source_domain:string; source_name:string; current_representation_count:number; discovery_policy:"public_index_only";
  detail_fetch_policy:"permission_required"|"legal_review_required"; content_reuse_policy:"permission_required"|"unknown";
  display_policy:"internal_signal_only"; robots_status:"unverified"; terms_status:"permission_required"|"unverified";
  partnership_required:boolean; legal_review_required:true; no_bypass_required:true; evidence_urls:string[]; evidence_summary:string;
  primary_geography:"MA"; volume_score:number; diversification_score:0; structure_score:number; policy_confidence_score:number;
  freshness_score:0; execution_score:null; recommended_action:"REQUEST_PERMISSION"|"RESOLVE_POLICY"; reviewed_at:string; next_review_at:string;
  policy_version:"MASS_2E_PREVIEW_V1"; authorization_status:"permission_required"|"unverified"; acquisition_mode:"public_index_internal_only";
  allowed_discovery_channels:string[]; max_revalidation_interval_days:30; review_status:"current"; policy_effective_at:null; policy_expires_at:null;
  evidence_observed_at:string; robots_observed_at:null; terms_observed_at:string|null; contact_status:"not_started";
  machine_gate:"internal_signal_only"; policy_hash:null; ingestion_gate:"internal_signal_only"; display_gate:"hidden";
}
export interface PolicyMatrix { schemaVersion:"MASS_2E_POLICY_MATRIX_V1"; generatedAt:string; records:ReviewRecordLike[]; registryPreview:RegistryPreviewRow[]; summary:{domains:number; permissionRequired:number; hold:number; canonicalCandidates:number; canonicalApproved:0; publicActivable:0; registryWrites:0; totalUrlRepresentations:number; totalLikelyMoroccoRealEstateUrls:number; totalLikelyMoroccoListingDetailUrls:number} }

function domainName(domain:string){ return domain.replace(/^www\./,""); }
function clamp(n:number,min:number,max:number){ return Math.max(min,Math.min(max,n)); }
export function buildPolicyMatrix(high:ReviewManifestLike, mid:ReviewManifestLike, long:ReviewManifestLike, generatedAt:string):PolicyMatrix {
  const records=[...high.records,...mid.records,...long.records].sort((a,b)=>a.rank-b.rank);
  if(records.length!==101) throw new Error(`DOMAIN_COUNT:${records.length}`);
  records.forEach((r,i)=>{ if(r.rank!==i+1) throw new Error(`RANK_DRIFT:${r.sourceDomain}`); });
  const seen=new Set(records.map(r=>r.sourceDomain)); if(seen.size!==101) throw new Error("DUPLICATE_DOMAIN");
  const registryPreview=records.map<RegistryPreviewRow>((r)=>{
    const permission=r.decision==="PERMISSION_REQUIRED";
    const y=r.yield ?? {urlRepresentations:0,likelyMoroccoRealEstateUrls:0,likelyMoroccoListingDetailUrls:0};
    const reviewedAt = r.rank<=20 ? high.reviewedAt : r.rank<=50 ? mid.reviewedAt : long.reviewedAt;
    return {
      source_domain:r.sourceDomain, source_name:domainName(r.sourceDomain), current_representation_count:y.urlRepresentations,
      discovery_policy:"public_index_only", detail_fetch_policy:permission?"permission_required":"legal_review_required",
      content_reuse_policy:permission?"permission_required":"unknown", display_policy:"internal_signal_only", robots_status:"unverified",
      terms_status:permission?"permission_required":"unverified", partnership_required:permission, legal_review_required:true, no_bypass_required:true,
      evidence_urls:[r.identityUrl,...(r.termsUrl?[r.termsUrl]:[])], evidence_summary:r.rationale, primary_geography:"MA",
      volume_score:clamp(Math.round(r.massPotentialScore/10),0,10), diversification_score:0,
      structure_score:clamp(Math.round((y.likelyMoroccoListingDetailUrls/Math.max(1,y.urlRepresentations))*10),0,10),
      policy_confidence_score:permission?8:2, freshness_score:0, execution_score:null,
      recommended_action:permission?"REQUEST_PERMISSION":"RESOLVE_POLICY", reviewed_at:reviewedAt,
      next_review_at:new Date(Date.parse(reviewedAt)+30*86400000).toISOString(), policy_version:"MASS_2E_PREVIEW_V1",
      authorization_status:permission?"permission_required":"unverified", acquisition_mode:"public_index_internal_only", allowed_discovery_channels:[],
      max_revalidation_interval_days:30, review_status:"current", policy_effective_at:null, policy_expires_at:null,
      evidence_observed_at:reviewedAt, robots_observed_at:null, terms_observed_at:r.termsUrl?reviewedAt:null, contact_status:"not_started",
      machine_gate:"internal_signal_only", policy_hash:null, ingestion_gate:"internal_signal_only", display_gate:"hidden"
    };
  });
  const permissionRequired=records.filter(r=>r.decision==="PERMISSION_REQUIRED").length;
  const hold=records.filter(r=>r.decision==="HOLD").length;
  const canonicalCandidates=records.filter(r=>r.publicIndexingMode==="CANONICAL_LINK_ONLY_CANDIDATE").length;
  const totals=records.reduce((s,r)=>{const y=r.yield??{urlRepresentations:0,likelyMoroccoRealEstateUrls:0,likelyMoroccoListingDetailUrls:0}; return {a:s.a+y.urlRepresentations,b:s.b+y.likelyMoroccoRealEstateUrls,c:s.c+y.likelyMoroccoListingDetailUrls}}, {a:0,b:0,c:0});
  return {schemaVersion:"MASS_2E_POLICY_MATRIX_V1",generatedAt,records,registryPreview,summary:{domains:101,permissionRequired,hold,canonicalCandidates,canonicalApproved:0,publicActivable:0,registryWrites:0,totalUrlRepresentations:totals.a,totalLikelyMoroccoRealEstateUrls:totals.b,totalLikelyMoroccoListingDetailUrls:totals.c}};
}

export function validatePolicyMatrix(m:PolicyMatrix){
  if(m.records.length!==101||m.registryPreview.length!==101) throw new Error("COUNT_DRIFT");
  if(m.summary.permissionRequired!==43||m.summary.hold!==58||m.summary.canonicalCandidates!==43) throw new Error("DECISION_DRIFT");
  if(m.summary.canonicalApproved!==0||m.summary.publicActivable!==0||m.summary.registryWrites!==0) throw new Error("SAFETY_DRIFT");
  if(m.summary.totalUrlRepresentations!==22656||m.summary.totalLikelyMoroccoRealEstateUrls!==19665||m.summary.totalLikelyMoroccoListingDetailUrls!==4114) throw new Error("YIELD_DRIFT");
  for(const r of m.registryPreview){ if(r.machine_gate!=="internal_signal_only"||r.ingestion_gate!=="internal_signal_only"||r.display_gate!=="hidden"||r.allowed_discovery_channels.length!==0) throw new Error(`ACTIVE_PREVIEW:${r.source_domain}`); }
}
