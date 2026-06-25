// TypeScript shapes for rows coming out of the SQLite DB.
// JSONB columns are parsed to their typed equivalents.

import type { FieldConfidence } from "../types.js";

export type ScrapeRunRow = {
  id: number;
  started_at: string;
  finished_at: string | null;
  source_file: string | null;
  source_file_hash: string | null;
  sources_attempted: string | null; // JSON array
  sources_succeeded: string | null; // JSON array
  total_raw: number;
  total_clean: number;
  errors_count: number;
  quality_report_json: string | null; // JSON
  created_at: string;
};

export type RawListingRow = {
  id: number;
  scrape_run_id: number;
  source_name: string;
  source_url: string | null;
  listing_url: string;
  raw_json: string; // JSON ScrapedListingP0
  created_at: string;
};

export type PropertyListingRow = {
  id: number;
  canonical_fingerprint: string;
  title: string | null;
  price_mad: number | null;
  city: string | null;
  district: string | null;
  property_type: string | null;
  transaction_type: string | null;
  surface_m2: number | null;
  rooms_count: number | null;
  bedrooms_count: number | null;
  bathrooms_count: number | null;
  description_snippet: string | null;
  images_count: number | null;
  seller_name: string | null;
  data_completeness_score: number;
  field_confidence: string | null; // JSON FieldConfidence
  created_at: string;
  updated_at: string;
};

export type ListingSourceRow = {
  id: number;
  property_listing_id: number;
  source_name: string;
  listing_url: string;
  source_url: string | null;
  first_seen_at: string;
  last_seen_at: string;
  is_active: number; // 1 | 0
};

// Parsed versions (JSONB already deserialised).
export type ParsedPropertyListing = Omit<PropertyListingRow, "field_confidence"> & {
  field_confidence: FieldConfidence | null;
};
