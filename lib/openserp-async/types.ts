import type {
  PublicPropertyIndexEngine,
  PublicPropertyIndexPropertyType,
  PublicPropertyIndexRecord,
  PublicPropertyIndexResultSource,
  PublicPropertyIndexTransactionType,
} from "@/lib/public-property-index/types";

export type OpenSerpEngine = "bing" | "ecosia" | "google";

export type OpenSerpRawResult = {
  title?: string;
  snippet?: string;
  url?: string;
  link?: string;
  displayUrl?: string;
  display_url?: string;
  source_host?: string;
  price?: number | string;
  surface?: number | string;
};

export type OpenSerpSearchRequest = {
  engine: OpenSerpEngine;
  query: string;
  limit?: number;
  locale?: string;
};

export type OpenSerpSearchResponse = {
  engine: Exclude<OpenSerpEngine, "google">;
  query: string;
  results: OpenSerpRawResult[];
  fetched_at: string;
  provider: "openserp_async_poc";
};

export type OpenSerpMappedRecord = PublicPropertyIndexRecord;

export type OpenSerpMapperHints = {
  engine: Exclude<OpenSerpEngine, "google">;
  query: string;
  observed_at?: string;
  result_source?: PublicPropertyIndexResultSource;
  provider_engine?: PublicPropertyIndexEngine;
  source_host?: string;
  inferred_city?: string;
  inferred_neighborhood?: string;
  inferred_property_type?: PublicPropertyIndexPropertyType;
  inferred_transaction_type?: PublicPropertyIndexTransactionType;
};
