import { NextRequest, NextResponse } from "next/server";
import { allowJ18LocalReview } from "@/scripts/neighborhood-context/j18-review-route-gate.mjs";
import { queryJ18IndicativeCandidate } from "@/scripts/neighborhood-context/j18-indicative-candidate-reader.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SAFE_HEADERS = {
 "Cache-Control": "private, no-store, max-age=0",
 "X-Robots-Tag": "noindex, nofollow",
 "Content-Security-Policy": "default-src 'none'",
 "X-Content-Type-Options": "nosniff",
};

/** Pre-publication review ONLY. NEVER enable this URL in production. */
export async function GET(request: NextRequest) {
 const directory = process.env.AKAR_VIVRE_ICI_J18_REVIEW_DIR;
 const sourceSha = process.env.AKAR_VIVRE_ICI_J18_REVIEW_SHA256;
 const permitted = allowJ18LocalReview({
   nodeEnv: process.env.NODE_ENV,
   optIn: process.env.AKAR_VIVRE_ICI_J18_REVIEW_ONLY,
   urlHostname: request.nextUrl.hostname,
   hostHeader: request.headers.get("host"),
   forwardedHostHeader: request.headers.get("x-forwarded-host"),
   datasetDirectory: directory, sourceSha, requestMethod: "GET",
 });
 if (!permitted || !directory || !sourceSha) {
   return NextResponse.json({status:"unavailable"}, {status:404,headers:SAFE_HEADERS});
 }
 try {
   const params=request.nextUrl.searchParams;
   const inputLimit=params.get("limit") ?? "180";
   if (!/^[1-9][0-9]{0,2}$/.test(inputLimit))throw new RangeError("bad_limit");
   const limit=Number(inputLimit);
   if (limit>180)throw new RangeError("bad_limit");
   const result=await queryJ18IndicativeCandidate({
     directory,expectedSourceSha:sourceSha,bbox:params.get("bbox")??"",limit
   });
   return NextResponse.json({
     ok:true,
     state:"J18_LOCAL_REVIEW_NOT_PUBLISHED",
     label:"Repères indicatifs à proximité",
     source:result.source,attribution:result.attribution,license:result.license,
     sourceSha256:result.sourceSha256,
     pbfReplicationAt:result.pbfReplicationAt,expiresAt:result.expiresAt,
     officialNeighborhoodMembershipCertified:false,
     businessOperatingStatusCertified:false,
     entrancePrecisionCertified:false,
     features:result.features,
   },{status:200,headers:SAFE_HEADERS});
 } catch (error) {
   if (error instanceof RangeError) {
     return NextResponse.json({status:"invalid_viewport"},{status:400,headers:SAFE_HEADERS});
   }
   console.error("[vivre-ici-j18] review source unavailable");
   return NextResponse.json({status:"unavailable"},{status:503,headers:SAFE_HEADERS});
 }
}
