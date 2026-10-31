// Offline, fail-closed authorization + live-availability review for direct partner feeds.
// Review-only: no database, HTTP, media download, or publication.
import {stageFeed, type StagedFeedRow} from "./staging.js";
import {validatedFeedRowToPartnerListingV2, type PartnerFeedV2Context} from "./partner-v2-bridge.js";
import {validatePartnerListingV2} from "../partners/partner-listing-v2.js";
import type {RawFeedRow} from "./schema.js";

export type SourceApproval = {
  partner_id: string;
  source_name: string;
  source_hostname: string;
  status: "reviewed_allow" | "unreviewed" | "revoked";
  permission_ref: string;
  reviewed_by: string;
  valid_from: string;
  valid_until: string;
  currency: "MAD";
  price_basis: "total_sale_or_monthly_rent";
  image_reuse_allowed: boolean;
};
export type PartnerActivityReceipt = {
  external_id: string;
  source_name: string;
  status: "available" | "withdrawn" | "unknown";
  confirmed_at: string;
  issuer_role: "owner" | "mandated_agent";
  issuer_verified: boolean;
  evidence_ref: string;
  price_basis: "total_sale" | "monthly_rent" | "other";
};
export type PartnerPreflightReview = {
  identity_key: string | null;
  source_external_id: string | null;
  decision: "candidate_v2_review" | "lifecycle_review" | "hold";
  reasons: string[];
  prospective_action: string | null;
  partner_listing_id: string | null;
  eligible_for_db: false;
  publishable: false;
};
export type PartnerPreflightSummary = {
  total_input_rows: number;
  candidate_v2_review: number;
  lifecycle_review: number;
  hold: number;
  rejected_by_feed_schema: number;
  duplicate_feed_rows: number;
  eligible_for_db: 0;
  publishable: 0;
  network_requests: 0;
  database_writes: 0;
};

function boundedAge(date: string | null | undefined, asOf: number, maxHours: number): boolean {
  if (typeof date !== "string" || !date.trim()) return false;
  const millis=Date.parse(date);
  return Number.isFinite(millis) && millis<=asOf && asOf-millis<=maxHours*3600000;
}
function validRef(ref: string | undefined): boolean {
  return typeof ref==="string" && ref.trim().length>=12;
}
function permissionOk(approval: SourceApproval | null, context: PartnerFeedV2Context, asOf: number): boolean {
  if (!approval || approval.status!=="reviewed_allow" || approval.partner_id!==context.partner_id ||
      !approval.source_name || !approval.source_hostname || !validRef(approval.permission_ref) ||
      !approval.reviewed_by?.trim() || approval.currency!=="MAD" ||
      approval.price_basis!=="total_sale_or_monthly_rent") return false;
  const start=Date.parse(approval.valid_from),end=Date.parse(approval.valid_until);
  return Number.isFinite(start)&&Number.isFinite(end)&&start<=asOf&&end>=asOf;
}
function exactHost(sourceUrl: string | null, hostname: string): boolean {
  if (!sourceUrl) return false;
  try {
    const url=new URL(sourceUrl);
    return url.protocol==="https:" && url.hostname===hostname && !url.username && !url.password;
  }catch{return false;}
}
export function preflightAuthorizedPartnerFeed(
  raw: RawFeedRow[], context: PartnerFeedV2Context, approval: SourceApproval | null,
  receipts: readonly PartnerActivityReceipt[], asOf: string,
): {summary: PartnerPreflightSummary; reviewed: PartnerPreflightReview[]} {
  const now=Date.parse(asOf);
  if (!Number.isFinite(now)) throw new Error("invalid_as_of");
  const staged=stageFeed(raw);
  const approvalAllowed=permissionOk(approval,context,now);
  const receiptById=new Map<string, PartnerActivityReceipt[]>();
  for(const receipt of receipts){
    const existing=receiptById.get(receipt.external_id)||[];
    existing.push(receipt);receiptById.set(receipt.external_id,existing);
  }
  const urlIdentities=new Map<string,Set<string>>();
  for(const entry of staged.staged){
    if (entry.canonical_source_url && entry.action!=="duplicate_skipped"){
      const keys=urlIdentities.get(entry.canonical_source_url)||new Set<string>();
      keys.add(entry.identity_key);urlIdentities.set(entry.canonical_source_url,keys);
    }
  }
  const reviewed:PartnerPreflightReview[]=[];
  const add=(entry:StagedFeedRow|null, sourceId:string|null, reasons:string[], action:string|null, listingId:string|null=null)=>{
    const decision:PartnerPreflightReview["decision"]=reasons.length?"hold":action==="delete"||action==="unpublish"?"lifecycle_review":"candidate_v2_review";
    reviewed.push({identity_key:entry?.identity_key??null,source_external_id:sourceId,
      decision,reasons:[...new Set(reasons)].sort(),prospective_action:action,partner_listing_id:listingId,
      eligible_for_db:false,publishable:false});
  };
  for(const entry of staged.staged){
    const row=entry.row;
    const reasons:string[]=[];
    if(!approvalAllowed) reasons.push("authorization_not_independently_reviewed");
    if(!approval || row.source_name!==approval.source_name)reasons.push("source_name_not_authorized");
    if(!row.external_id?.trim())reasons.push("missing_partner_external_id");
    if(!approval || !exactHost(row.source_url,approval.source_hostname))reasons.push("source_url_not_in_approved_host");
    if(entry.action==="duplicate_skipped")reasons.push("duplicate_identity_in_batch");
    if(entry.canonical_source_url && (urlIdentities.get(entry.canonical_source_url)?.size||0)>1)reasons.push("same_source_url_multiple_external_ids");
    if(row.image_urls.length && !approval?.image_reuse_allowed)reasons.push("image_reuse_scope_missing");
    if(entry.action==="delete"||entry.action==="unpublish"){
      add(entry,row.external_id,reasons,entry.action);
      continue;
    }
    if(!boundedAge(row.updated_at_source,now,168))reasons.push("source_update_not_recent");
    if(!row.district?.trim())reasons.push("district_missing");
    if(row.price_mad===null)reasons.push("price_missing");
    const matched=receiptById.get(row.external_id||"")||[];
    if(matched.length!==1)reasons.push("missing_or_ambiguous_partner_activity_receipt");
    else {
      const receipt=matched[0];
      if(receipt.source_name!==row.source_name || receipt.status!=="available" ||
         !["owner","mandated_agent"].includes(receipt.issuer_role) ||
         receipt.issuer_verified!==true || !validRef(receipt.evidence_ref) ||
         !boundedAge(receipt.confirmed_at,now,168)) reasons.push("availability_not_confirmed");
      const basis=row.transaction_type==="sale"?"total_sale":"monthly_rent";
      if(receipt.price_basis!==basis)reasons.push("price_basis_not_confirmed");
    }
    if(!reasons.length){
      // The bridge marks partner_authorized and available; invoke it ONLY after
      // upstream verification declarations and a dated owner/agent receipt.
      const bridged=validatedFeedRowToPartnerListingV2(row,context,asOf);
      if(!bridged.ok)reasons.push("v2_bridge_rejected");
      else if(bridged.kind!=="listing"||!validatePartnerListingV2(bridged.listing).valid)
        reasons.push("v2_validation_failed");
      else {
        add(entry,row.external_id,[],entry.action,bridged.listing.partner_listing_id);
        continue;
      }
    }
    add(entry,row.external_id,reasons,entry.action);
  }
  for(const rejected of staged.rejected_rows){
    reviewed.push({identity_key:null,source_external_id:rejected.external_id,decision:"hold",
      reasons:["schema_rejected:"+rejected.reason],prospective_action:null,partner_listing_id:null,
      eligible_for_db:false,publishable:false});
  }
  const tally=(decision:PartnerPreflightReview["decision"])=>reviewed.filter(x=>x.decision===decision).length;
  const summary:PartnerPreflightSummary={total_input_rows:raw.length,candidate_v2_review:tally("candidate_v2_review"),
    lifecycle_review:tally("lifecycle_review"),hold:tally("hold"),rejected_by_feed_schema:staged.rejected_rows.length,
    duplicate_feed_rows:staged.duplicate_count,eligible_for_db:0,publishable:0,network_requests:0,database_writes:0};
  if(summary.total_input_rows!==reviewed.length)throw new Error("preflight_accounting_mismatch");
  return {summary,reviewed};
}
