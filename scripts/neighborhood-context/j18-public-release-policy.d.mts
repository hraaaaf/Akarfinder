export const J18H_APPROVAL_SCHEMA:string;
export const J18H_SOURCE_PUBLICATION_ENABLED:false;
export type J18ApprovalRecord={
 schema:string;approvalId:string;sourceSha256:string;manifestSha256:string;
 storeId:string;pbfReplicationAt:string;sourceExpiresAt:string;
 approvedAt:string;approvalExpiresAt:string;dataClass:string;license:string;
 attribution:string;reviewedFor:string;businessOperatingStatusCertified:false;
 officialNeighborhoodMembershipCertified:false;entrancePrecisionCertified:false;
 publicationAuthorized:true;
};
export function canonicalJ18ApprovalBytes(record:J18ApprovalRecord):Buffer;
export function verifyJ18Approval(args:{
 record:J18ApprovalRecord;signatureBase64:string;publicKeyPem:string;
 sourceSha:string;manifestSha:string;storeId:string;now?:number;
}):boolean;
export function validateJ18Viewport(args:{bbox:string;limit:number}):[number,number,number,number];
export function j18CacheHeader(expiresAt:string,now?:number):string;
export function evaluateJ18Release(args?:{
 enabledInSource?:boolean;approvalRecord?:J18ApprovalRecord;
 approvalSignature?:string;approvalPublicKey?:string;
 sourceSha?:string;manifestSha?:string;storeId?:string;
 quota?:{reserveAtomic(args:{namespace:string;subjectKey:string;periodMs:number;maxHits:number;cost:number}):Promise<boolean>};
 subjectKey?:string;readModel?:{query(args:{bbox:string;limit:number}):Promise<unknown>};
 bbox?:string;limit?:number;now?:number;
}):Promise<{allowed:boolean;status:number;reason?:string;cacheControl?:string;result?:unknown}>;
