export type J18IndicativeFeature={
 type:"Feature";
 geometry:{type:"Point";coordinates:[number,number]};
 properties:{osmId:string;name:string;category:string;sourceUrl:string;
 positionType:"osm-node"|"indicative-area-point";currentlyOpen:null;officialQuarterMembership:null};
};
export type J18BlobReadResult={
 schema:string;state:string;publicationAuthorized:false;source:string;sourceSha256:string;
 manifestSha256:string;pbfReplicationAt:string;expiresAt:string;attribution:string;license:string;
 businessOperatingStatusCertified:false;officialNeighborhoodMembershipCertified:false;
 entrancePrecisionCertified:false;features:J18IndicativeFeature[];
};
export type J18BlobReadModel={
 manifestPath:string;
 query(args:{bbox:string;limit?:number}):Promise<J18BlobReadResult>;
 cacheStats():{entries:number;bytes:number};
};
export function createJ18PrivateBlobReadModel(args:{
 readObject:(path:string,maxBytes:number)=>Promise<Uint8Array>;
 sourceSha:string;manifestSha:string;clock?:()=>number;
 maxCacheBytes?:number;cacheTtlMs?:number;
}):J18BlobReadModel;
