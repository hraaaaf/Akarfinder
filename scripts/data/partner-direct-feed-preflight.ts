#!/usr/bin/env tsx
// File-based, read-only review for an incoming direct partner feed.
// NEVER trusts the feed file alone as authorization or availability evidence.
import {readFile,mkdir,writeFile} from "node:fs/promises";
import {extname,resolve,join} from "node:path";
import {createHash} from "node:crypto";
import {pathToFileURL} from "node:url";
import {parseCsvFeed,parseJsonFeed,parseXmlFeed} from "../../lib/feeds/parsers.js";
import {preflightAuthorizedPartnerFeed,type SourceApproval,type PartnerActivityReceipt} from "../../lib/feeds/authorized-preflight.js";
import type {PartnerFeedV2Context} from "../../lib/feeds/partner-v2-bridge.js";
const MAX_BYTES=5*1024*1024;
export type PreflightFilesInput={feedFile:string;authorizationFile:string;receiptsFile:string;outputDir:string;asOf:string};
async function safeRead(p:string):Promise<Buffer>{
 const data=await readFile(p);if(data.length>MAX_BYTES)throw Error("partner_input_over_size_limit");
 return data;
}
export async function inspectPartnerFeedFiles(opts:PreflightFilesInput){
 if(!opts.feedFile||!opts.authorizationFile||!opts.receiptsFile||!opts.outputDir||!opts.asOf)throw Error("required_input_missing");
 const [feed,auth,receiptsData]=await Promise.all([
  safeRead(opts.feedFile),safeRead(opts.authorizationFile),safeRead(opts.receiptsFile)
 ]);
 const extension=extname(opts.feedFile).toLowerCase();
 const source=feed.toString("utf8");
 const raw=extension===".csv"?parseCsvFeed(source):
   extension===".json"?parseJsonFeed(source):
   extension===".xml"?parseXmlFeed(source):null;
 if(!raw)throw Error("unsupported_feed_extension");
 if(raw.length>20000)throw Error("too_many_partner_rows");
 const meta=JSON.parse(auth.toString("utf8")) as {
  context:PartnerFeedV2Context;authorization:SourceApproval|null;
 };
 const receipts=JSON.parse(receiptsData.toString("utf8")) as PartnerActivityReceipt[];
 if(!meta?.context?.partner_id||!Array.isArray(receipts))throw Error("invalid_evidence_bundle");
 const review=preflightAuthorizedPartnerFeed(raw,meta.context,meta.authorization,receipts,opts.asOf);
 const report={
  schema:"AKARFINDER_DIRECT_PARTNER_PREFLIGHT_OFFLINE_V1",as_of:opts.asOf,
  source_feed_sha256:createHash("sha256").update(feed).digest("hex"),
  evidence_manifest_sha256:createHash("sha256").update(auth).digest("hex"),
  receipts_sha256:createHash("sha256").update(receiptsData).digest("hex"),
  ...review.summary,permission_authenticity_independently_verified_by_runner:false,
  human_final_approval_required:true,
  admitted_as_fresh_inventory:0
 };
 await mkdir(opts.outputDir,{recursive:true});
 await writeFile(join(opts.outputDir,"summary.json"),JSON.stringify(report,null,2)+"\n");
 // No titles, contact fields, descriptions, photo URLs or coordinates in report.
 await writeFile(join(opts.outputDir,"review-decisions.jsonl"),
  review.reviewed.map(r=>JSON.stringify(r)).join("\n")+"\n");
 return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const args=process.argv.slice(2);
 const get=(key:string)=>{const i=args.indexOf(key);return i>=0?args[i+1]:undefined};
 const feedFile=get("--feed"),authorizationFile=get("--authorization");
 const receiptsFile=get("--receipts"),outputDir=get("--out"),asOf=get("--as-of");
 if(!feedFile||!authorizationFile||!receiptsFile||!outputDir||!asOf){
  console.error("Usage: npx tsx scripts/data/partner-direct-feed-preflight.ts --feed partner.csv --authorization reviewed-authorization.json --receipts activity-receipts.json --as-of 2026-10-30T20:00:00Z --out .tmp/partner-review");
  process.exitCode=2;
 }else inspectPartnerFeedFiles({feedFile,authorizationFile,receiptsFile,outputDir,asOf})
  .then(x=>console.log(JSON.stringify(x)))
  .catch(e=>{console.error(e instanceof Error?e.message:String(e));process.exitCode=1;});
}
