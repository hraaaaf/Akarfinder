import { buildPolicyMatrix, validatePolicyMatrix, type ReviewManifestLike } from "./source-factory-policy-matrix";

export interface FinalCertification {
  schemaVersion:"MASS_2F_FINAL_CERTIFICATION_V1";
  generatedAt:string;
  domains:number;
  permissionRequired:number;
  hold:number;
  canonicalCandidates:number;
  canonicalApproved:0;
  publicActivable:0;
  decisionConflicts:number;
  expiredEvidence:number;
  futureDatedEvidence:number;
  totals:{totalUrlRepresentations:number;totalLikelyMoroccoRealEstateUrls:number;totalLikelyMoroccoListingDetailUrls:number};
}

function isIsoDate(v:string){ return Number.isFinite(Date.parse(v)); }

export function buildFinalCertification(high:ReviewManifestLike,mid:ReviewManifestLike,long:ReviewManifestLike,generatedAt:string):FinalCertification{
  const matrix=buildPolicyMatrix(high,mid,long,generatedAt); validatePolicyMatrix(matrix);
  const now=Date.parse(generatedAt);
  if(!Number.isFinite(now)) throw new Error("INVALID_GENERATED_AT");
  const manifests=[high,mid,long];
  let futureDatedEvidence=0, expiredEvidence=0, decisionConflicts=0;
  for(const manifest of manifests){
    if(!isIsoDate(manifest.reviewedAt)) throw new Error("INVALID_REVIEWED_AT");
    const reviewed=Date.parse(manifest.reviewedAt);
    if(reviewed>now) futureDatedEvidence++;
    if(now-reviewed>30*86400000) expiredEvidence++;
    for(const r of manifest.records){
      const permission=r.decision==="PERMISSION_REQUIRED";
      if(permission && (r.publicIndexingMode!=="CANONICAL_LINK_ONLY_CANDIDATE" || !r.termsUrl)) decisionConflicts++;
      if(!permission && r.publicIndexingMode!=="UNRESOLVED") decisionConflicts++;
      if(!r.identityUrl || !r.rationale) decisionConflicts++;
    }
  }
  return {schemaVersion:"MASS_2F_FINAL_CERTIFICATION_V1",generatedAt,domains:matrix.summary.domains,permissionRequired:matrix.summary.permissionRequired,hold:matrix.summary.hold,canonicalCandidates:matrix.summary.canonicalCandidates,canonicalApproved:0,publicActivable:0,decisionConflicts,expiredEvidence,futureDatedEvidence,totals:{totalUrlRepresentations:matrix.summary.totalUrlRepresentations,totalLikelyMoroccoRealEstateUrls:matrix.summary.totalLikelyMoroccoRealEstateUrls,totalLikelyMoroccoListingDetailUrls:matrix.summary.totalLikelyMoroccoListingDetailUrls}};
}

export function validateFinalCertification(c:FinalCertification){
  if(c.domains!==101||c.permissionRequired!==43||c.hold!==58||c.canonicalCandidates!==43) throw new Error("COVERAGE_DRIFT");
  if(c.canonicalApproved!==0||c.publicActivable!==0) throw new Error("AUTHORIZATION_DRIFT");
  if(c.decisionConflicts!==0) throw new Error(`DECISION_CONFLICTS:${c.decisionConflicts}`);
  if(c.expiredEvidence!==0||c.futureDatedEvidence!==0) throw new Error("EVIDENCE_TIME_DRIFT");
  if(c.totals.totalUrlRepresentations!==17602||c.totals.totalLikelyMoroccoRealEstateUrls!==16018||c.totals.totalLikelyMoroccoListingDetailUrls!==3051) throw new Error("YIELD_DRIFT");
}
