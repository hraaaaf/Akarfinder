export const TYPESENSE_COLLECTION = "properties_search_v1";

export type TypesenseSearchDocument = {
  id: string;
  canonical_property_id: string;
  title: string;
  searchable_text: string;
  city: string;
  district?: string;
  property_type: string;
  transaction_type: string;
  price_mad?: number;
  surface_m2?: number;
  bedrooms?: number;
  geo?: [number, number];
  quality_tier: string;
  quality_score: number;
  reliability_score: number;
  freshness_score: number;
  display_eligibility: string;
  document_kind: string;
  source_count: number;
  best_source_name: string;
  production_allowed: boolean;
  updated_at: number;
};

export const typesenseSearchCollectionSchema = {
  name: TYPESENSE_COLLECTION,
  enable_nested_fields: false,
  fields: [
    { name: "id", type: "string" },
    { name: "canonical_property_id", type: "string", facet: true },
    { name: "title", type: "string" },
    { name: "searchable_text", type: "string" },
    { name: "city", type: "string", facet: true },
    { name: "district", type: "string", facet: true, optional: true },
    { name: "property_type", type: "string", facet: true },
    { name: "transaction_type", type: "string", facet: true },
    { name: "price_mad", type: "int64", facet: true, optional: true },
    { name: "surface_m2", type: "float", facet: true, optional: true },
    { name: "bedrooms", type: "int32", facet: true, optional: true },
    { name: "geo", type: "geopoint", optional: true },
    { name: "quality_tier", type: "string", facet: true },
    { name: "quality_score", type: "float" },
    { name: "reliability_score", type: "float" },
    { name: "freshness_score", type: "float" },
    { name: "display_eligibility", type: "string", facet: true },
    { name: "document_kind", type: "string", facet: true },
    { name: "source_count", type: "int32" },
    { name: "best_source_name", type: "string", facet: true },
    { name: "production_allowed", type: "bool", facet: true },
    { name: "updated_at", type: "int64" },
  ],
  default_sorting_field: "quality_score",
} as const;

export function isTypesensePublicCandidate(document: TypesenseSearchDocument): boolean {
  return document.production_allowed
    && document.document_kind === "LISTING"
    && (document.display_eligibility === "eligible_primary" || document.display_eligibility === "eligible_secondary");
}
