export function allowJ18BlobLocalReview(args:{
 nodeEnv?:string;optIn?:string;urlHostname:string;hostHeader:string|null;
 forwardedHostHeader:string|null;storeId?:string;expectedStoreId?:string;
 sourceSha?:string;manifestSha?:string;requestMethod?:string;
}):boolean;
export function createJ18LocalRateLimiter(args?:{
 max?:number;windowMs?:number;clock?:()=>number;
}):{take():boolean;state():{count:number;start:number}};
