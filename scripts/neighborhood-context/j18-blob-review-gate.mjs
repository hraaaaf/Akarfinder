import {isPrivateQaLoopbackRequest} from "./private-qa-host-guard.mjs";

const hex=s=>typeof s==="string"&&/^[a-f0-9]{64}$/.test(s);
/** Even a populated Vercel production environment must return 404. */
export function allowJ18BlobLocalReview({
 nodeEnv,optIn,urlHostname,hostHeader,forwardedHostHeader,
 storeId,expectedStoreId,sourceSha,manifestSha,requestMethod="GET"
}){
 return nodeEnv==="development"&&optIn==="true"&&requestMethod==="GET"&&
   isPrivateQaLoopbackRequest(urlHostname,hostHeader,forwardedHostHeader)&&
   typeof storeId==="string"&&/^store_[a-zA-Z0-9]+$/.test(storeId)&&
   storeId===expectedStoreId&&hex(sourceSha)&&hex(manifestSha);
}
/** QA-only best-effort burst guard. NOT a multi-instance public rate limiter. */
export function createJ18LocalRateLimiter({max=24,windowMs=60000,clock=()=>Date.now()}={}){
 if(!Number.isInteger(max)||max<1||max>120||
    !Number.isInteger(windowMs)||windowMs<1000||windowMs>3600000)throw new RangeError("j18_rate_config");
 let start=clock(),count=0;
 return {take(){
   const now=clock();
   if(!Number.isFinite(now)||now<start)return false;
   if(now-start>=windowMs){start=now;count=0;}
   if(count>=max)return false;
   count++;return true;
 },state:()=>({count,start})};
}
