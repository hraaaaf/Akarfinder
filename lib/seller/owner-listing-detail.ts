import { getDbProvider } from "@/lib/db/provider";
import { neonExecutor } from "@/lib/db/neon-client";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import type { Listing, ListingPropertyType } from "@/lib/listings/types";
import { queryOwnerListingMedia } from "@/lib/seller/owner-listing-media";

type OwnerListingDetailRow = {
  id: string;
  draft_id: string;
  normalized_city: string | null;
  normalized_neighborhood: string | null;
  normalized_property_type: string | null;
  normalized_price_mad: number | null;
  normalized_surface_m2: number | null;
  price_per_m2_mad: number | null;
  bedrooms_count: number | null;
  condition_label: string | null;
  photo_count: number;
  quality_score: number;
  display_eligibility: string;
  display_eligibility_reason: string | null;
  lifecycle_status: string;
  provenance_label: string;
  updated_at: string;
};

function nullableNumber(value: unknown): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizedOwnerDetailRow(row: OwnerListingDetailRow): OwnerListingDetailRow {
  return {
    ...row,
    normalized_price_mad: nullableNumber(row.normalized_price_mad),
    normalized_surface_m2: nullableNumber(row.normalized_surface_m2),
    price_per_m2_mad: nullableNumber(row.price_per_m2_mad),
    bedrooms_count: nullableNumber(row.bedrooms_count),
    photo_count: nullableNumber(row.photo_count) ?? 0,
    quality_score: nullableNumber(row.quality_score) ?? 0,
  };
}

async function readOwnerListingDetailRow(representationId: string): Promise<{
  row: OwnerListingDetailRow | null;
  supabase?: ReturnType<typeof getSupabaseServerClient>;
}> {
  if (getDbProvider() === "neon") {
    const rows = await neonExecutor.query<OwnerListingDetailRow>(
      `SELECT id, draft_id, normalized_city, normalized_neighborhood,
              normalized_property_type, normalized_price_mad, normalized_surface_m2,
              price_per_m2_mad, bedrooms_count, condition_label, photo_count,
              quality_score, display_eligibility, display_eligibility_reason,
              lifecycle_status, provenance_label, updated_at
       FROM public.owner_listing_representations
       WHERE id = $1::uuid
         AND lifecycle_status = 'live'
         AND display_eligibility = ANY($2::text[])
       LIMIT 1`,
      [representationId, ["eligible_primary", "eligible_secondary"]],
    );
    return { row: rows[0] ? normalizedOwnerDetailRow(rows[0]) : null };
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("owner_listing_representations")
    .select("id, draft_id, normalized_city, normalized_neighborhood, normalized_property_type, normalized_price_mad, normalized_surface_m2, price_per_m2_mad, bedrooms_count, condition_label, photo_count, quality_score, display_eligibility, display_eligibility_reason, lifecycle_status, provenance_label, updated_at")
    .eq("id", representationId)
    .eq("lifecycle_status", "live")
    .in("display_eligibility", ["eligible_primary", "eligible_secondary"])
    .single();
  if (error || !data) return { row: null, supabase };
  return { row: normalizedOwnerDetailRow(data as OwnerListingDetailRow), supabase };
}

function propertyType(value: string | null): ListingPropertyType {
  switch (value) {
    case "villa": return "Villa";
    case "land": return "Terrain";
    case "studio": return "Studio";
    case "office": return "Bureau";
    case "house": return "Maison";
    case "riad": return "Riad";
    default: return "Appartement";
  }
}

export async function queryOwnerListingDetail(representationId: string): Promise<Listing | null> {
  if (!/^[0-9a-f-]{36}$/i.test(representationId)) return null;
  const { row: data, supabase } = await readOwnerListingDetailRow(representationId);
  if (!data) return null;

  const mediaUrls = await queryOwnerListingMedia(data.draft_id, supabase);
  const mainImageUrl = mediaUrls[0];
  const galleryImageUrls = mediaUrls.slice(1);

  return {
    id: `owner-${data.id}`,
    title: `${propertyType(data.normalized_property_type)} à vendre${data.normalized_neighborhood ? ` à ${data.normalized_neighborhood}` : data.normalized_city ? ` à ${data.normalized_city}` : ""}`,
    city: data.normalized_city ?? "",
    neighborhood: data.normalized_neighborhood ?? "",
    price: data.normalized_price_mad ?? null,
    currency: "DH",
    surface_m2: data.normalized_surface_m2 ?? 0,
    price_per_m2: data.price_per_m2_mad ?? null,
    property_type: propertyType(data.normalized_property_type),
    transaction_type: "buy",
    bedrooms: data.bedrooms_count ?? 0,
    bathrooms: 0,
    freshness_label: "Mise à jour par le propriétaire",
    source_type: "Source analysée",
    reliability_label: data.quality_score >= 85 ? "Informations complètes" : "Infos limitées",
    reliability_score: data.quality_score,
    reliability_available: true,
    is_mre_friendly: false,
    description: data.condition_label
      ? `Bien déclaré en état : ${data.condition_label}. Dossier structuré et validé avant publication.`
      : "Dossier structuré et validé avant publication.",
    image_url: mainImageUrl ?? "",
    main_image_url: mainImageUrl,
    gallery_image_urls: galleryImageUrls,
    image_source: mediaUrls.length > 0 ? "Photos fournies par le propriétaire" : undefined,
    reliability_explanation: data.display_eligibility_reason ?? "Annonce propriétaire validée.",
    listing_url: `/listings/owner-${data.id}`,
    source_name: "Propriétaire",
    source_badge: "owner_published",
    source_attribution_label: data.provenance_label,
    result_origin: "owner_declared",
    search_result_display_mode: "owner_verified_listing",
    can_show_result: true,
    can_show_thumbnail: false,
    can_show_contact: false,
    can_show_gallery: mediaUrls.length > 1,
    production_allowed: true,
    primary_cta: "view_full_listing",
    original_source_required: false,
    source_access_level: "partner_full",
    image_permission_status: "allowed",
    images_count: mediaUrls.length,
    updated_at_label: "Mise à jour récente",
  };
}