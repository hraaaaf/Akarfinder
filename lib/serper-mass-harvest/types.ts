export type HarvestPhase = "fixed" | "adaptive" | "discovery" | "refresh";

export type HarvestSourceId =
  | "mubawab"
  | "avito"
  | "sarouty"
  | "agenz"
  | "1immo"
  | "mouldar"
  | "sakane"
  | "dabaannonce"
  | "souqcity"
  | "afribaba"
  | "darkom"
  | "soukimmobilier"
  | "masaken"
  | "long_tail";

export type HarvestQuery = {
  id: string;
  phase: HarvestPhase;
  source_id: HarvestSourceId;
  query: string;
  city?: string;
  property_type?: string;
  intent?: "sale" | "rent";
  parent_query_id?: string;
};

export type HarvestRawResult = {
  title?: string;
  link?: string;
  snippet?: string;
  position?: number;
};

export type HarvestObservation = {
  query: HarvestQuery;
  result_rank: number;
  source_domain: string;
  source_url: string;
  canonical_url: string;
  title: string | null;
  snippet: string | null;
  discovery_status: "accepted" | "rejected" | "unclassified";
  eligibility_reasons: string[];
};

export type HarvestQueryMetrics = {
  query: HarvestQuery;
  raw_results: number;
  unique_results: number;
  detail_candidates: number;
  accepted_results: number;
  rejected_results: number;
  unclassified_results: number;
  duplicate_results: number;
  category_or_noise_results: number;
  new_unique_results: number;
  yield_ratio: number;
};

export type HarvestRunSummary = {
  run_id: string;
  mode: "plan" | "run" | "apply";
  hard_cap: number;
  calls_reserved: number;
  calls_succeeded: number;
  calls_failed: number;
  raw_results: number;
  observations: number;
  persisted: number;
  unique_canonical_urls: number;
  accepted: number;
  rejected: number;
  unclassified: number;
  fixed_queries: number;
  adaptive_queries: number;
  discovery_queries: number;
  refresh_queries: number;
  query_metrics: HarvestQueryMetrics[];
};
