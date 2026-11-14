import {get} from "@vercel/blob";
import {NextRequest,NextResponse} from "next/server";
import {createJ18PrivateBlobReadModel} from "@/scripts/neighborhood-context/j18-private-blob-read-model.mjs";
import {allowJ18BlobLocalReview,createJ18LocalRateLimiter} from "@/scripts/neighborhood-context/j18-blob-review-gate.mjs";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const HEADERS={
 "Cache-Control":"private, no-store, max-age=0",
 "X-Robots-Tag":"noindex, nofollow",
 "Content-Security-Policy":"default-src 'none'",
 "X-Content-Type-Options":"nosniff",
};
const limiter=createJ18LocalRateLimiter({max:24,windowMs:60000});
let cachedModel:ReturnType<typeof createJ18PrivateBlobReadModel>|null=null;
let cachedPin="";

async function readPrivateBlob(path:string,maxBytes:number):Promise<Uint8Array>{
 const response=await get(path,{access:"private"});
 if(!response||response.statusCode!==200)throw new Error("J18_BLOB_UNAVAILABLE");
 const reader=response.stream.getReader();
 const chunks:Uint8Array[]=[];
 let size=0;
 try{
  for(;;){
   const {done,value}=await reader.read();
   if(done)break;
   size+=value.byteLength;
   if(size>maxBytes){await reader.cancel();throw new Error("J18_BLOB_OVERSIZE");}
   chunks.push(value);
  }
 }finally{reader.releaseLock();}
 if(size===0)throw new Error("J18_BLOB_EMPTY");
 return Buffer.concat(chunks.map(chunk=>Buffer.from(chunk)),size);
}

/** Private QA only. It cannot become public through env flags alone. */
export async function GET(request:NextRequest){
 const sourceSha=process.env.AKAR_VIVRE_ICI_J18_BLOB_SOURCE_SHA256;
 const manifestSha=process.env.AKAR_VIVRE_ICI_J18_BLOB_MANIFEST_SHA256;
 const expectedStoreId=process.env.AKAR_VIVRE_ICI_J18_BLOB_EXPECTED_STORE_ID;
 const allowed=allowJ18BlobLocalReview({
  nodeEnv:process.env.NODE_ENV,
  optIn:process.env.AKAR_VIVRE_ICI_J18_BLOB_REVIEW_ONLY,
  urlHostname:request.nextUrl.hostname,
  hostHeader:request.headers.get("host"),
  forwardedHostHeader:request.headers.get("x-forwarded-host"),
  storeId:process.env.BLOB_STORE_ID,expectedStoreId,
  sourceSha,manifestSha,requestMethod:request.method
 });
 if(!allowed||!sourceSha||!manifestSha){
  return NextResponse.json({status:"unavailable"},{status:404,headers:HEADERS});
 }
 if(!limiter.take()){
  return NextResponse.json({status:"rate_limited"},{status:429,headers:{...HEADERS,"Retry-After":"60"}});
 }
 if(!process.env.VERCEL_OIDC_TOKEN&&!process.env.BLOB_READ_WRITE_TOKEN){
  return NextResponse.json({status:"unavailable"},{status:503,headers:HEADERS});
 }
 try{
  const inputLimit=request.nextUrl.searchParams.get("limit")??"180";
  if(!/^[1-9][0-9]{0,2}$/.test(inputLimit)||Number(inputLimit)>180)
   throw new RangeError("j18_bad_limit");
  const pin=sourceSha+":"+manifestSha;
  if(cachedPin!==pin||!cachedModel){
   cachedModel=createJ18PrivateBlobReadModel({
    readObject:readPrivateBlob,sourceSha,manifestSha,
    maxCacheBytes:4000000,cacheTtlMs:30000
   });
   cachedPin=pin;
  }
  const data=await cachedModel.query({
   bbox:request.nextUrl.searchParams.get("bbox")??"",
   limit:Number(inputLimit)
  });
  return NextResponse.json({
   ok:true,state:data.state,label:"Repères OSM indicatifs à proximité",
   source:data.source,sourceSha256:data.sourceSha256,
   pbfReplicationAt:data.pbfReplicationAt,expiresAt:data.expiresAt,
   attribution:data.attribution,license:data.license,
   businessOperatingStatusCertified:false,
   officialNeighborhoodMembershipCertified:false,
   entrancePrecisionCertified:false,
   features:data.features
  },{status:200,headers:HEADERS});
 }catch(error){
  if(error instanceof RangeError)
   return NextResponse.json({status:"invalid_viewport"},{status:400,headers:HEADERS});
  console.error("[vivre-ici-j18] pinned private blob review unavailable");
  return NextResponse.json({status:"unavailable"},{status:503,headers:HEADERS});
 }
}
