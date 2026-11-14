export type J18Feature = {
 type:"Feature"; geometry:{type:"Point";coordinates:[number,number]};
 properties:{osmId:string; name:string;category:string;sourceUrl:string;
 positionType:"osm-node"|"indicative-area-point";currentlyOpen:null;officialQuarterMembership:null};
};
export type J18CandidateResponse = {
 schema:string;state:string;source:string;sourceSha256:string;
 pbfReplicationAt:string;expiresAt:string;attribution:string;license:string;
 businessOperatingStatusCertified:false;officialNeighborhoodMembershipCertified:false;
 entrancePrecisionCertified:false;publicationAuthorized:false;features:J18Feature[];
};
export function queryJ18IndicativeCandidate(args:{
 directory:string;expectedSourceSha:string;bbox:string;limit?:number;now?:Date;
}):Promise<J18CandidateResponse>;
