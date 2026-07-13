import type { OpenSerpEngine, OpenSerpRawResult } from "@/lib/openserp-async/types";

export type OpenSerpIngestionQuery = {
  query_id: string;
  city: "Casablanca" | "Rabat" | "Marrakech";
  district: string;
  transaction_type: "sale" | "rent";
  property_type: "apartment" | "villa" | "studio" | "house" | "land" | "office" | "commercial";
  query_text: string;
  priority: "high" | "medium" | "low";
  target_domain?: string;
  query_family?: "general" | "brand_hint";
};

export type OpenSerpProviderInfo = {
  provider: "openserp";
  provider_mode: "local_cli" | "local_http";
  provider_endpoint: string;
  provider_live_or_fixture: "live";
  provider_version?: string;
};

export type OpenSerpQueryExecution = {
  engine: Exclude<OpenSerpEngine, "google">;
  query: OpenSerpIngestionQuery;
  raw_results: OpenSerpRawResult[];
  fetched_at: string;
};

export type OpenSerpQueryAttemptStatus =
  | "success"
  | "timeout"
  | "provider_process_error"
  | "invalid_cli_arguments"
  | "encoding_error"
  | "output_parse_error"
  | "rate_limit"
  | "provider_unavailable"
  | "query_syntax_rejected"
  | "empty_results"
  | "domain_no_results"
  | "checkpoint_error"
  | "unknown";

export type OpenSerpQueryAttempt = {
  engine: Exclude<OpenSerpEngine, "google">;
  query_text: string;
  target_domain: string | null;
  started_at: string;
  duration_ms: number;
  exit_code: number | null;
  stdout_status: "results" | "empty_results" | "invalid_json" | "none";
  stderr_category: OpenSerpQueryAttemptStatus;
  result_count: number;
  retry_count: number;
  final_status: "success" | "failed";
  error_message: string | null;
};

export type OpenSerpQueryExecutionReport = {
  query_id: string;
  query_text: string;
  city: OpenSerpIngestionQuery["city"];
  district: string;
  property_type: OpenSerpIngestionQuery["property_type"];
  transaction_type: OpenSerpIngestionQuery["transaction_type"];
  target_domain: string | null;
  attempts: OpenSerpQueryAttempt[];
  executed: boolean;
  failed: boolean;
  zero_result_query: boolean;
  technical_failure: boolean;
  final_status: OpenSerpQueryAttemptStatus | "success";
  result_count: number;
};

export type OpenSerpClassificationLane =
  | "individual_listing"
  | "discovery_page"
  | "reject_out_of_scope"
  | "quarantine";

export type OpenSerpExtractedAttributes = {
  title: string;
  short_description: string | null;
  city: string | null;
  district: string | null;
  transaction_type: "sale" | "rent" | null;
  property_type: "apartment" | "villa" | "studio" | "house" | "land" | "office" | "commercial" | null;
  price_mad: number | null;
  currency: "MAD" | null;
  surface_m2: number | null;
  bedrooms_count: number | null;
};

export type OpenSerpClassifiedResult = {
  query_id: string;
  engine: Exclude<OpenSerpEngine, "google">;
  rank: number;
  original_url: string;
  canonical_source_url: string;
  source_domain: string;
  classification_lane: OpenSerpClassificationLane;
  classification_reasons: string[];
  extracted: OpenSerpExtractedAttributes;
  title: string;
  snippet: string | null;
  discovered_at: string;
  raw_result_hash: string;
  provider_result_id: string | null;
  external_id: string | null;
};

export type OpenSerpListingCandidate = OpenSerpClassifiedResult & {
  candidate_id: string;
  canonical_fingerprint: string;
  seen_query_ids: string[];
  seen_run_ids: string[];
};

export type OpenSerpDryRunMetrics = {
  queries_planned: number;
  queries_executed: number;
  queries_failed: number;
  zero_result_queries: number;
  quota_errors: number;
  provider_errors: number;
  raw_results: number;
  accepted_results: number;
  rejected_results: number;
  individual_candidates: number;
  discovery_pages: number;
  rejected_out_of_scope: number;
  quarantined: number;
  unique_source_urls: number;
  exact_duplicates_removed: number;
  cities_covered: number;
  phone_hits: number;
  whatsapp_hits: number;
  personal_email_hits: number;
  secret_hits: number;
};

export type OpenSerpWriteManifest = {
  run_id: string;
  manifest_sha256?: string;
  source_run_id?: string;
  candidate_count: number;
  selected_candidates?: string[];
  new_listing_fingerprints: string[];
  new_property_listing_ids?: number[];
  existing_listing_ids_to_update: number[];
  new_source_urls: string[];
  existing_source_urls_to_update: string[];
  excluded_candidates?: Array<{ candidate_id: string; reason: string }>;
  maximum_writes: {
    max_new_property_listings: number;
    max_updated_property_listings: number;
    max_new_listing_sources: number;
  };
  expected_counts_after: {
    new_property_listings: number;
    updated_property_listings: number;
    new_listing_sources: number;
    updated_listing_sources: number;
  };
};

export type OpenSerpRollbackManifest = {
  run_id: string;
  manifest_sha256?: string;
  source_run_id?: string;
  new_property_listing_ids: number[];
  new_listing_source_urls: string[];
  updated_property_listing_snapshots: unknown[];
  updated_listing_source_snapshots: unknown[];
  rollback_order: string[];
  verification_queries: string[];
  checksums?: {
    property_snapshot_sha256: string;
    source_snapshot_sha256: string;
  };
};

export type FirstWriteSelectionAlgorithmVersion = "openserp-first-write-v1";

export type LockedFirstWriteManifest = {
  source_run_id: string;
  first_write_run_id: string;
  generated_at: string;
  manifest_sha256: string;
  candidate_file_path: string;
  candidate_file_sha256: string;
  candidate_count: number;
  selected_count: number;
  selection_algorithm_version: FirstWriteSelectionAlgorithmVersion;
  selected_candidate_ids: string[];
  selected_source_urls: string[];
  excluded_candidate_ids: string[];
  exclusion_reasons: Record<string, string>;
  city_targets: {
    Casablanca: number;
    Rabat: number;
    Marrakech: number;
  };
};
