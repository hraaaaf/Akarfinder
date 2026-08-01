export const TYPESENSE_ODM_SHADOW_COLLECTION = "odm_properties_search_v1";

export type OdmSearchProjectionRow = {
  representation_id: string;
  canonical_url: string;
  canonical_property_id?: string | null;
  source_domain: string;
  title?: string | null;
  snippet?: string | null;
  normalized_city?: string | null;
  normalized_district?: string | null;
  normalized_property_type?: string | null;
  normalized_intent?: string | null;
  normalized_price_mad?: number | null;
  normalized_surface_m2?: number | null;
  quality_tier?: string | null;
  quality_score?: number | null;
  reliability_score?: number | null;
  freshness_score?: number | null;
  display_eligibility: string;
  document_kind?: string | null;
  production_allowed?: boolean | null;
  updated_at: string;
};

export type TypesenseOdmShadowDocument = {
  id: string;
  canonical_property_id: string;
  original_url: string;
  source_domain: string;
  title: string;
  searchable_text: string;
  city: string;
  district: string;
  property_type: string;
  transaction_type: string;
  price_mad?: number;
  surface_m2?: number;
  quality_tier: string;
  quality_score: number;
  reliability_score: number;
  freshness_score: number;
  display_eligibility: string;
  document_kind: "LISTING";
  updated_at_unix: number;
};

export const TYPESENSE_ODM_SHADOW_SCHEMA = {
  name: TYPESENSE_ODM_SHADOW_COLLECTION,
  fields: [
    { name: "canonical_property_id", type: "string", facet: true },
    { name: "original_url", type: "string", index: false },
    { name: "source_domain", type: "string", facet: true },
    { name: "title", type: "string" },
    { name: "searchable_text", type: "string" },
    { name: "city", type: "string", facet: true },
    { name: "district", type: "string", facet: true, optional: true },
    { name: "property_type", type: "string", facet: true },
    { name: "transaction_type", type: "string", facet: true },
    { name: "price_mad", type: "int64", optional: true },
    { name: "surface_m2", type: "float", optional: true },
    { name: "quality_tier", type: "string", facet: true },
    { name: "quality_score", type: "float" },
    { name: "reliability_score", type: "float" },
    { name: "freshness_score", type: "float" },
    { name: "display_eligibility", type: "string", facet: true },
    { name: "document_kind", type: "string", facet: true },
    { name: "updated_at_unix", type: "int64" },
  ],
  default_sorting_field: "quality_score",
} as const;

export function isOdmTypesenseShadowCandidate(row: OdmSearchProjectionRow): boolean {
  return row.production_allowed === true
    && row.document_kind === "LISTING"
    && (row.display_eligibility === "eligible_primary" || row.display_eligibility === "eligible_secondary")
    && Boolean(row.normalized_city && row.normalized_property_type && row.normalized_intent);
}

export function projectOdmRowToTypesense(row: OdmSearchProjectionRow): TypesenseOdmShadowDocument | null {
  if (!isOdmTypesenseShadowCandidate(row)) return null;
  const title = row.title?.trim() || "Annonce immobilière";
  const snippet = row.snippet?.trim() || "";
  return {
    id: row.representation_id,
    canonical_property_id: row.canonical_property_id || row.representation_id,
    original_url: row.canonical_url,
    source_domain: row.source_domain,
    title,
    searchable_text: [title, snippet, row.normalized_city, row.normalized_district, row.normalized_property_type].filter(Boolean).join(" "),
    city: row.normalized_city!,
    district: row.normalized_district || "",
    property_type: row.normalized_property_type!,
    transaction_type: row.normalized_intent!,
    ...(row.normalized_price_mad != null ? { price_mad: Math.round(row.normalized_price_mad) } : {}),
    ...(row.normalized_surface_m2 != null ? { surface_m2: row.normalized_surface_m2 } : {}),
    quality_tier: row.quality_tier || "UNSCORED",
    quality_score: row.quality_score ?? 0,
    reliability_score: row.reliability_score ?? 0,
    freshness_score: row.freshness_score ?? 0,
    display_eligibility: row.display_eligibility,
    document_kind: "LISTING",
    updated_at_unix: Math.floor(Date.parse(row.updated_at) / 1000),
  };
}
