import { neon } from "@neondatabase/serverless";
import type { DbListingRow, DbListingsQuery, DbListingsResult, DbStats } from "@/lib/listings/db-listings";
import { getSourcesByType } from "@/lib/sources/source-access-registry";

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required for Neon");
  return neon(url);
}
function json(v: unknown): string | null {
  if (v == null) return null;
  return typeof v === "string" ? v : JSON.stringify(v);
}
function normalizePropertyType(v?: string) {
  if (!v) return undefined;
  const n=v.trim().toLowerCase();
  if(n==="appartement"||n==="apartment") return "apartment";
  if(n==="terrain"||n==="land") return "land";
  if(n==="bureau"||n==="office") return "office";
  return n;
}
function normalizeTransactionType(v?: string) {
  if (!v) return undefined;
  const n=v.trim().toLowerCase();
  if(n==="buy"||n==="sale"||n==="achat") return "sale";
  if(n==="rent"||n==="location") return "rent";
  if(n==="new"||n==="neuf") return "new";
  return n;
}
function mapRow(r:any): DbListingRow {
  const b=(v:any)=>v==null?null:(v===true?1:0);
  return {
    id:Number(r.id), canonical_fingerprint:r.canonical_fingerprint, title:r.title, price_mad:r.price_mad==null?null:Number(r.price_mad),
    city:r.city, district:r.district, property_type:r.property_type, transaction_type:r.transaction_type,
    surface_m2:r.surface_m2==null?null:Number(r.surface_m2), rooms_count:r.rooms_count==null?null:Number(r.rooms_count),
    bedrooms_count:r.bedrooms_count==null?null:Number(r.bedrooms_count), bathrooms_count:r.bathrooms_count==null?null:Number(r.bathrooms_count),
    description_snippet:r.description_snippet, images_count:r.images_count==null?null:Number(r.images_count), thumbnail_url:r.thumbnail_url??null,
    seller_name:r.seller_name, data_completeness_score:Number(r.data_completeness_score??0), field_confidence:json(r.field_confidence),
    created_at:String(r.created_at??""), updated_at:String(r.updated_at??""), duplicate_group_id:r.duplicate_group_id,
    duplicate_score:r.duplicate_score==null?null:Number(r.duplicate_score), reliability_score:r.reliability_score==null?null:Number(r.reliability_score),
    reliability_badge:r.reliability_badge, reliability_reasons:json(r.reliability_reasons),
    built_surface_m2:r.built_surface_m2==null?null:Number(r.built_surface_m2), plot_surface_m2:r.plot_surface_m2==null?null:Number(r.plot_surface_m2),
    condition:r.condition, property_age_range:r.property_age_range, orientation:r.orientation, floor_type:r.floor_type,
    floors_count:r.floors_count==null?null:Number(r.floors_count), garden_m2:r.garden_m2==null?null:Number(r.garden_m2),
    terrace_m2:r.terrace_m2==null?null:Number(r.terrace_m2), garage_spaces:r.garage_spaces==null?null:Number(r.garage_spaces),
    has_pool:b(r.has_pool), has_concierge:b(r.has_concierge), has_moroccan_living_room:b(r.has_moroccan_living_room),
    has_european_living_room:b(r.has_european_living_room), has_equipped_kitchen:b(r.has_equipped_kitchen),
    premium_features:json(r.premium_features), source_name:r.source_name??null, listing_url:r.listing_url??null,
    source_url:r.source_url??null, origin_type:r.origin_type??null,
  };
}
const STRUCTURED_PUBLIC_SOURCE_NAMES = [
  ...new Set([
    ...getSourcesByType("first_party"),
    ...getSourcesByType("partner_authorized"),
  ]),
];

function addPublicSearchCandidateClause(conditions:string[],params:any[]){
  const structuredSourceParams = STRUCTURED_PUBLIC_SOURCE_NAMES.map((sourceName) => {
    params.push(sourceName);
    return "$" + params.length;
  });

  conditions.push(`(
    (
      (pl.field_confidence->>'provider' = 'openserp'
        OR pl.field_confidence->>'acquisition_provider' = 'openserp')
      AND pl.field_confidence->>'publication_lane' = 'external_web_result'
      AND pl.field_confidence->>'classification_lane' = 'individual_listing'
    )
    OR EXISTS (
      SELECT 1
      FROM listing_sources ls_candidate
      WHERE ls_candidate.property_listing_id = pl.id
        AND ls_candidate.is_active IS TRUE
        AND lower(trim(ls_candidate.source_name)) IN (${structuredSourceParams.join(",")})
    )
  )`);
}

function buildWhere(q:DbListingsQuery){
  const c:string[]=[]; const p:any[]=[]; const add=(sql:string,v:any)=>{p.push(v);c.push(sql.replace("?", "$"+p.length));};
  const pt=normalizePropertyType(q.property_type), tt=normalizeTransactionType(q.transaction_type);
  if(q.city)add("pl.city = ?",q.city); if(pt)add("pl.property_type = ?",pt); if(tt)add("pl.transaction_type = ?",tt);
  if(q.min_price!=null)add("pl.price_mad >= ?",q.min_price); if(q.max_price!=null)add("pl.price_mad <= ?",q.max_price);
  if(q.min_surface!=null)add("pl.surface_m2 >= ?",q.min_surface); if(q.max_surface!=null)add("pl.surface_m2 <= ?",q.max_surface);
  if(q.bedrooms!=null)add("pl.bedrooms_count = ?",q.bedrooms);
  if(q.public_search_only)addPublicSearchCandidateClause(c,p);
  return {where:c.length?"WHERE "+c.join(" AND "):"",params:p};
}
export async function queryNeonListings(q:DbListingsQuery={}):Promise<DbListingsResult>{
  const sql=getSql(),{where,params}=buildWhere(q); const limit=Math.min(Math.max(q.limit??50,1),500), offset=Math.max(q.offset??0,0);
  const count:any=await sql.query(`SELECT COUNT(*)::int AS total FROM property_listings pl ${where}`,params);
  const rp=[...params,limit,offset], li=rp.length-1, oi=rp.length;
  const rows:any=await sql.query(`SELECT pl.*,ls.source_name,ls.listing_url,ls.source_url,ls.origin_type
    FROM property_listings pl
    LEFT JOIN LATERAL (
      SELECT source_name,listing_url,source_url,origin_type FROM listing_sources
      WHERE property_listing_id=pl.id AND is_active IS TRUE ORDER BY first_seen_at NULLS LAST,id LIMIT 1
    ) ls ON TRUE
    ${where}
    ORDER BY pl.data_completeness_score DESC NULLS LAST,pl.updated_at DESC NULLS LAST,pl.id DESC
    LIMIT $${li} OFFSET $${oi}`,rp);
  return {listings:(rows as any[]).map(mapRow),total:Number(count?.[0]?.total??0)};
}
export async function queryNeonStats():Promise<DbStats>{
  const sql=getSql(); const r:any=await sql`SELECT COUNT(*)::int total_listings,
    ROUND(AVG(data_completeness_score)::numeric,1)::float8 avg_completeness,
    COUNT(DISTINCT duplicate_group_id)::int duplicates_detected,
    ROUND(AVG(reliability_score) FILTER (WHERE reliability_score IS NOT NULL)::numeric,1)::float8 avg_reliability
    FROM property_listings`;
  const x=r[0]??{}; return {total_listings:Number(x.total_listings??0),avg_completeness:Number(x.avg_completeness??0),duplicates_detected:Number(x.duplicates_detected??0),avg_reliability:Number(x.avg_reliability??0)};
}
export async function queryNeonListingById(id:number):Promise<DbListingRow|null>{
  const sql=getSql(); const r:any=await sql.query(`SELECT pl.*,ls.source_name,ls.listing_url,ls.source_url,ls.origin_type
    FROM property_listings pl LEFT JOIN LATERAL (
      SELECT source_name,listing_url,source_url,origin_type FROM listing_sources
      WHERE property_listing_id=pl.id AND is_active IS TRUE ORDER BY first_seen_at NULLS LAST,id LIMIT 1
    ) ls ON TRUE WHERE pl.id=$1 LIMIT 1`,[id]);
  return r?.[0]?mapRow(r[0]):null;
}
