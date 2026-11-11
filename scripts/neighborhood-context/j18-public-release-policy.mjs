/**
 * J18-H: independent, signed human release approval + distributed-quota contract.
 * This is a TESTABLE POLICY, not a production publication switch or quota backend.
 * The HTTP route has an immutable source-level off switch.
 */
import {createPublicKey,verify} from "node:crypto";
import {parseQaBbox} from "./private-national-qa-tiles.mjs";

export const J18H_APPROVAL_SCHEMA="AKARFINDER_J18H_INDICATIVE_RELEASE_APPROVAL_V1";
export const J18H_SOURCE_PUBLICATION_ENABLED=false;
const DAY_MS=86400000;
const hex=s=>typeof s==="string"&&/^[a-f0-9]{64}$/.test(s);
const iso=s=>typeof s==="string"&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString()===s;
const KEY_NAMES=Object.freeze([
 "schema","approvalId","sourceSha256","manifestSha256","storeId",
 "pbfReplicationAt","sourceExpiresAt","approvedAt","approvalExpiresAt",
 "dataClass","license","attribution","reviewedFor",
 "businessOperatingStatusCertified","officialNeighborhoodMembershipCertified",
 "entrancePrecisionCertified","publicationAuthorized"
].sort());
const DENIED=Object.freeze({allowed:false,status:404,reason:"not_published"});
const unsafe=s=>({allowed:false,status:503,reason:s});

export function canonicalJ18ApprovalBytes(record){
 if(!record||typeof record!=="object"||Array.isArray(record))throw new TypeError("j18h_record_invalid");
 const keys=Object.keys(record).sort();
 if(JSON.stringify(keys)!==JSON.stringify(KEY_NAMES))throw new TypeError("j18h_fields_invalid");
 // Explicit ordered tuple: properties cannot be reordered to change the signature.
 return Buffer.from(JSON.stringify(KEY_NAMES.map(k=>[k,record[k]])),"utf8");
}
export function verifyJ18Approval({
 record,signatureBase64,publicKeyPem,sourceSha,manifestSha,storeId,now=Date.now()
}){
 try{
  if(!Number.isFinite(now)||!hex(sourceSha)||!hex(manifestSha)||
     typeof storeId!=="string"||!/^(store_)[A-Za-z0-9]+$/.test(storeId)||
     record?.schema!==J18H_APPROVAL_SCHEMA||
     record.publicationAuthorized!==true||
     record.dataClass!=="INDICATIVE_OSM_NOT_COMMERCIALLY_CERTIFIED"||
     record.reviewedFor!=="OSM_INDICATIVE_PUBLIC_ONLY"||
     record.license!=="ODbL-1.0"||
     record.attribution!=="© OpenStreetMap contributors"||
     record.businessOperatingStatusCertified!==false||
     record.officialNeighborhoodMembershipCertified!==false||
     record.entrancePrecisionCertified!==false||
     !/^[a-zA-Z0-9_-]{12,80}$/.test(record.approvalId||"")||
     record.sourceSha256!==sourceSha||record.manifestSha256!==manifestSha||
     record.storeId!==storeId||
     ![record.pbfReplicationAt,record.sourceExpiresAt,
       record.approvedAt,record.approvalExpiresAt].every(iso))return false;
  const replicate=Date.parse(record.pbfReplicationAt);
  const expires=Date.parse(record.sourceExpiresAt);
  const approved=Date.parse(record.approvedAt);
  const approvalExpires=Date.parse(record.approvalExpiresAt);
  if(replicate>approved||approved>now||now>=expires||
     expires!==replicate+30*DAY_MS||
     approvalExpires>expires||approvalExpires<=now||
     approvalExpires<=approved||approvalExpires>approved+7*DAY_MS)return false;
  if(typeof signatureBase64!=="string"||
     !/^[A-Za-z0-9+/]{86}==$/.test(signatureBase64))return false;
  if(typeof publicKeyPem!=="string"||!publicKeyPem.includes("BEGIN PUBLIC KEY"))return false;
  const bytes=canonicalJ18ApprovalBytes(record);
  const key=createPublicKey(publicKeyPem);
  if(key.asymmetricKeyType!=="ed25519")return false;
  return verify(null,bytes,key,Buffer.from(signatureBase64,"base64"));
 }catch{return false;}
}
export function validateJ18Viewport({bbox,limit}){
 if(!Number.isInteger(limit)||limit<1||limit>180)throw new RangeError("j18h_limit");
 const coords=parseQaBbox(bbox);
 const [w,s,e,n]=coords;
 const x0=Math.floor((w+180)*20),x1=Math.min(7199,Math.floor((e+180)*20));
 const y0=Math.floor((s+90)*20),y1=Math.min(3599,Math.floor((n+90)*20));
 if((x1-x0+1)*(y1-y0+1)>64)throw new RangeError("j18h_bbox");
 return coords;
}
export function j18CacheHeader(expiresAt,now=Date.now()){
 const remaining=Math.max(0,Math.floor((Date.parse(expiresAt)-now)/1000));
 // Snapshot TTL is checked on every server invocation; never cache past expiry.
 const ttl=Math.min(30,remaining);
 return "public, max-age=0, s-maxage="+ttl+", stale-while-revalidate=0";
}
/**
 * For hypothetical release QA only. The actual route's source constant is false.
 * quota.reserveAtomic must be backed by a real cross-instance atomic counter;
 * an in-memory limiter is NEVER accepted as proof of production readiness.
 */
export async function evaluateJ18Release({
 enabledInSource=false,approvalRecord,approvalSignature,approvalPublicKey,
 sourceSha,manifestSha,storeId,quota,subjectKey,readModel,bbox,limit=180,
 now=Date.now()
}={}){
 if(enabledInSource!==true)return DENIED;
 if(!verifyJ18Approval({
  record:approvalRecord,signatureBase64:approvalSignature,publicKeyPem:approvalPublicKey,
  sourceSha,manifestSha,storeId,now
 }))return DENIED;
 if(!quota||typeof quota.reserveAtomic!=="function")return unsafe("distributed_quota_not_configured");
 if(typeof subjectKey!=="string"||!/^[-_a-zA-Z0-9:.]{12,128}$/.test(subjectKey))
  return unsafe("trusted_subject_not_configured");
 try{validateJ18Viewport({bbox,limit});}
 catch{return {allowed:false,status:400,reason:"invalid_viewport"};}
 if(typeof readModel?.query!=="function")return unsafe("private_read_model_missing");
 let accepted;
 try{
  accepted=await quota.reserveAtomic({
   namespace:"j18h-indicative",subjectKey,periodMs:60000,maxHits:20,cost:1
  });
 }catch{return unsafe("distributed_quota_unavailable");}
 if(accepted!==true)return {allowed:false,status:429,reason:"rate_limited"};
 try{
  const data=await readModel.query({bbox,limit});
  if(data?.sourceSha256!==sourceSha||data.manifestSha256!==manifestSha||
     data.license!=="ODbL-1.0"||data.attribution!=="© OpenStreetMap contributors"||
     data.publicationAuthorized!==false||
     data.businessOperatingStatusCertified!==false||
     data.officialNeighborhoodMembershipCertified!==false||
     data.entrancePrecisionCertified!==false||
     data.expiresAt!==approvalRecord.sourceExpiresAt||
     Date.parse(data.expiresAt)<=now)return unsafe("private_source_mismatch");
  return {allowed:true,status:200,cacheControl:j18CacheHeader(data.expiresAt,now),
   result:{ok:true,state:"OSM_INDICATIVE_PUBLIC_RELEASE",
    source:"OpenStreetMap via Geofabrik",sourceSha256:sourceSha,
    pbfReplicationAt:data.pbfReplicationAt,expiresAt:data.expiresAt,
    attribution:data.attribution,license:data.license,
    businessOperatingStatusCertified:false,
    officialNeighborhoodMembershipCertified:false,
    entrancePrecisionCertified:false,features:data.features}};
 }catch{return unsafe("private_source_unavailable");}
}
