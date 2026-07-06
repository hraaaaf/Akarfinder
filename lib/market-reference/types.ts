export type ReferenceTransactionType = "buy" | "rent";

export type ReferencePropertyType =
  | "apartment"
  | "villa"
  | "land"
  | "riad"
  | "mixed";

export type ReferenceSourceType =
  | "manual_review"
  | "portal_listing_prices"
  | "fiscal_reference"
  | "partner_export"
  | "public_report";

export type ReferenceConfidence = "low" | "medium" | "high";

export type StandingLevel = "standard" | "haut standing" | "premium";

export type UrbanFunction =
  | "commerciale"
  | "residentielle"
  | "universitaire"
  | "touristique"
  | "mixte";

export interface ReferencePricePoint {
  metric_name: string;
  value_low: number;
  value_median: number;
  value_high: number;
  transaction_type: ReferenceTransactionType;
  property_type: ReferencePropertyType;
  source_type: ReferenceSourceType;
  source_url: string | null;
  evidence_ref: string | null;
  date_accessed: string;
  confidence: ReferenceConfidence;
  public_safe: boolean;
  internal_only: boolean;
}

export interface LifestyleIndicator {
  label: string;
  confidence: ReferenceConfidence;
  public_safe: boolean;
}

export interface CityReferenceRange {
  low: number;
  high: number;
  confidence: ReferenceConfidence;
  public_safe: boolean;
}

export interface CityReference {
  id: string;
  city: string;
  country: "MA";
  internal_only: boolean;
  buy_apartment_mad_m2_range: CityReferenceRange;
  rent_apartment_mad_m2_month_range: CityReferenceRange;
}

export interface DistrictReference {
  id: string;
  city_id: string;
  city: string;
  district: string;
  aliases: string[];
  standing_level: StandingLevel;
  urban_function: UrbanFunction[];
  internal_only: boolean;
  public_disclaimer: string;
  prices: ReferencePricePoint[];
  lifestyle_indicators: Record<string, LifestyleIndicator>;
}

export interface SourceRegistryEntry {
  source_id: string;
  source_type: ReferenceSourceType;
  collection_method: string;
  validation_required: boolean;
  public_safe: boolean;
}

export interface MethodologyNote {
  note: string;
}

export interface ForbiddenPublicClaim {
  term: string;
}

export interface MoroccoReferenceDataset {
  version: "v3";
  internal_only: boolean;
  cities: CityReference[];
  district_reference: DistrictReference[];
  source_registry: SourceRegistryEntry[];
  methodology_notes: MethodologyNote[];
  forbidden_public_claims: ForbiddenPublicClaim[];
}

export interface PublicLifestyleSummary {
  city: string;
  district: string;
  disclaimer: string;
  lifestyle_indicators: Record<string, string>;
}
