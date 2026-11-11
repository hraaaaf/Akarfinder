import {NextResponse} from "next/server";
import {J18H_SOURCE_PUBLICATION_ENABLED} from "@/scripts/neighborhood-context/j18-public-release-policy.mjs";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const HEADERS={
 "Cache-Control":"private, no-store, max-age=0",
 "X-Robots-Tag":"noindex, nofollow",
 "X-Content-Type-Options":"nosniff",
 "Content-Security-Policy":"default-src 'none'",
};
/**
 * J18-H is a publication-design scaffold, NOT a live OSM endpoint.
 * A signed human approval AND true distributed atomic quota are missing.
 * Future activation requires a reviewed implementation, separate human GO,
 * merge and an explicit Vercel deployment permission.
 * An environment flag alone cannot enable public data.
 */
export async function GET(){
 if(J18H_SOURCE_PUBLICATION_ENABLED){
  // Fail closed until the reviewed controller is physically wired.
  return NextResponse.json({status:"release_not_configured"},
   {status:503,headers:HEADERS});
 }
 return NextResponse.json({status:"not_published"},
  {status:404,headers:HEADERS});
}
