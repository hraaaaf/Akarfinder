import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import type { Listing, ListingPropertyType } from "@/lib/listings/types";

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
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("owner_listing_representations")
    .select("id, normalized_city, normalized_neighborhood, normalized_property_type, normalized_price_mad, normalized_surface_m2, price_per_m2_mad, bedrooms_count, condition_label, photo_count, quality_score, display_eligibility, display_eligibility_reason, lifecycle_status, provenance_label, updated_at")
    .eq("id", representationId)
    .eq("lifecycle_status", "live")
    .in("display_eligibility", ["eligible_primary", "eligible_secondary"])
    .single();

  if (error || !data) return null;
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
    image_url: "",
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
    can_show_gallery: false,
    production_allowed: true,
    primary_cta: "view_full_listing",
    original_source_required: false,
    source_access_level: "partner_full",
    image_permission_status: "allowed",
    images_count: data.photo_count,
    updated_at_label: "Mise à jour récente",
  };
}
