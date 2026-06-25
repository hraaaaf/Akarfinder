// P0 scraping — shared types.
// Goal of P0: prove the pipeline runs cleanly and safely, not to collect volume.

export type SourceName = "avito" | "mubawab" | "sarouty";

export type PropertyTypeP0 = "apartment" | "villa" | "land" | "office" | "unknown";
export type TransactionTypeP0 = "sale" | "rent" | "unknown";

// P2: per-field source confidence.
// high   = JSON-LD explicit or clearly structured DOM selector
// medium = reliable regex on page text
// low    = ambiguous regex (multiple candidates, short match)
// missing = field is null / absent
export type FieldConfidenceLevel = "high" | "medium" | "low" | "missing";

export type FieldConfidence = {
  price: FieldConfidenceLevel;
  city: FieldConfidenceLevel;
  district: FieldConfidenceLevel;
  surface: FieldConfidenceLevel;
  rooms: FieldConfidenceLevel;
  bedrooms: FieldConfidenceLevel;
  bathrooms: FieldConfidenceLevel;
  description: FieldConfidenceLevel;
  seller: FieldConfidenceLevel;
};

export type ScrapedListingP0 = {
  source_name: SourceName;
  source_url: string;
  listing_url: string;
  title: string | null;
  price_raw: string | null;
  price_mad: number | null;
  city: string | null;
  district: string | null;
  property_type: PropertyTypeP0;
  transaction_type: TransactionTypeP0;
  surface_raw: string | null;
  surface_m2: number | null;
  // rooms_count = total pieces (pièces), bedrooms_count = chambres specifically.
  // These are NEVER cross-filled: "3 pièces" sets rooms_count only,
  // "2 chambres" sets bedrooms_count only.
  rooms_count: number | null;
  bedrooms_count: number | null;
  bathrooms: number | null;
  description_snippet: string | null;
  images_count: number | null;
  seller_name: string | null;
  published_at_raw: string | null;
  scraped_at: string;
  // 0–100: share of key enrichment fields that are present (measures presence,
  // not absolute truth — a field set from regex is counted the same as from JSON-LD).
  data_completeness_score: number;
  // P2: per-field extraction confidence (JSON-LD > DOM > regex > missing).
  field_confidence: FieldConfidence;

  // P8A: advanced property characteristics (from detail page; null/false = absent).
  built_surface_m2: number | null;
  plot_surface_m2: number | null;
  condition: string | null;
  property_age_range: string | null;
  orientation: string | null;
  floor_type: string | null;
  floors_count: number | null;
  garden_m2: number | null;
  terrace_m2: number | null;
  garage_spaces: number | null;
  has_pool: boolean;
  has_concierge: boolean;
  has_moroccan_living_room: boolean;
  has_european_living_room: boolean;
  has_equipped_kitchen: boolean;
  premium_features: string[];
};

// A loose, pre-normalization shape produced by the per-source extractors.
export type RawListing = {
  listing_url?: string | null;
  title?: string | null;
  price_raw?: string | null;
  city?: string | null;
  district?: string | null;
  property_type_raw?: string | null;
  transaction_type_raw?: string | null;
  surface_raw?: string | null;
  rooms_count?: number | string | null;
  bedrooms_count?: number | string | null;
  bathrooms?: number | string | null;
  description_snippet?: string | null;
  images_count?: number | null;
  seller_name?: string | null;
  published_at_raw?: string | null;
};

export type ScrapeError = {
  source: string;
  stage: string;
  url?: string;
  message: string;
  at: string;
};

export type SourceResult = {
  source: string;
  listings: ScrapedListingP0[];
  errors: ScrapeError[];
  skipped?: boolean;
  status?: string;
};

export type SourceModule = {
  name: string;
  run: () => Promise<SourceResult>;
};

// P2: per-source quality summary written to source-quality-report.json
export type SourceQualityEntry = {
  attempted: number;
  succeeded: number;
  failed: number;
  average_completeness_score: number;
  field_fill_rate: Record<string, number>;
  average_images_count: number | null;
  common_missing_fields: string[];
  errors_count: number;
};

export type SourceQualityReport = {
  generated_at: string;
  sources: Partial<Record<string, SourceQualityEntry>>;
};
