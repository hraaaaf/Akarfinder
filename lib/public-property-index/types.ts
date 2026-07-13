export type PublicPropertyIndexEngine = "bing" | "ecosia" | "duckduckgo" | "manual";

export type PublicPropertyIndexResultSource = "openserp_async_poc" | "manual_seed";

export type PublicPropertyIndexTransactionType = "buy" | "rent" | "new";

export type PublicPropertyIndexPropertyType =
  | "Appartement"
  | "Villa"
  | "Studio"
  | "Terrain"
  | "Bureau"
  | "Maison"
  | "Autre";

export type PublicPropertyIndexRecord = {
  id: string;
  source_host: string;
  source_url: string;
  title: string;
  short_snippet?: string;
  inferred_city?: string;
  inferred_neighborhood?: string;
  inferred_property_type?: PublicPropertyIndexPropertyType;
  inferred_transaction_type?: PublicPropertyIndexTransactionType;
  public_price?: number | null;
  public_surface?: number | null;
  result_source: PublicPropertyIndexResultSource;
  provider_engine?: PublicPropertyIndexEngine;
  observed_at: string;
  created_at: string;
  updated_at: string;
  observation_count: number;
};

export type PublicPropertyIndexSearchQuery = {
  q?: string;
  city?: string;
  neighborhood?: string;
  property_type?: string;
  transaction_type?: string;
  limit?: number;
};

export type PublicPropertyIndexSearchResponse = {
  ok: true;
  source: "public_property_index_poc";
  results_label: "Résultats publics observés";
  results: PublicPropertyIndexRecord[];
};

export interface PublicPropertyIndexStore {
  search(query: PublicPropertyIndexSearchQuery): Promise<PublicPropertyIndexRecord[]>;
  upsert(records: PublicPropertyIndexRecord[]): Promise<void>;
}
