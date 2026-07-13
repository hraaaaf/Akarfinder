import type {
  PublicPropertyIndexEngine,
  PublicPropertyIndexPropertyType,
  PublicPropertyIndexRecord,
  PublicPropertyIndexResultSource,
  PublicPropertyIndexTransactionType,
} from "@/lib/public-property-index/types";

export type OpenSerpEngine = "bing" | "ecosia" | "google";

export type OpenSerpRawResult = {
  id?: string;
  rank?: number;
  type?: string;
  title?: string;
  snippet?: string;
  url?: string;
  link?: string;
  domain?: string;
  displayUrl?: string;
  display_url?: string;
  source_host?: string;
  favicon?: string;
  price?: number | string;
  surface?: number | string;
  engine?: string;
  position?: {
    absolute?: number;
  };
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
  version?: string;
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
