export type PublicResultSimilarityPublicLabel = "Résultat similaire possible";

export type PublicResultSimilaritySignal =
  | "same_city"
  | "same_neighborhood"
  | "same_transaction_type"
  | "same_property_type"
  | "close_price"
  | "close_surface"
  | "similar_title"
  | "same_source_host"
  | "different_source_host";

export type PublicResultSimilarityInput = {
  id: string;
  title: string;
  snippet?: string;
  original_url: string;
  display_url: string;
  source_name: string;
  source_host?: string;
};

export type PublicResultSimilaritySummary = {
  similar_possible: boolean;
  similar_count?: number;
  similar_public_label?: PublicResultSimilarityPublicLabel;
  similar_reasons_public: string[];
};

export type PublicResultSimilarityInternalSummary = PublicResultSimilaritySummary & {
  similarity_score: number;
  similarity_group_id?: string;
  raw_similarity_signals: PublicResultSimilaritySignal[];
  threshold_details: {
    same_city: boolean;
    compatible_transaction_type: boolean;
    compatible_property_type: boolean;
    strong_signal_count: number;
  };
};

export type PublicResultSimilarityGroup = {
  group_id: string;
  result_ids: string[];
  summaries: Record<string, PublicResultSimilarityInternalSummary>;
};
