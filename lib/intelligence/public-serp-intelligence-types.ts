export const PUBLIC_SERP_INTELLIGENCE_VERSION = "1.0" as const;

export type PublicSerpIntelligenceStatus = "available" | "insufficient_data";

export type PublicSerpIntelligenceSignalCode =
  | "completeness"
  | "freshness"
  | "market_context"
  | "multisource";

export interface PublicSerpIntelligenceSignalV1 {
  code: PublicSerpIntelligenceSignalCode;
  label: string;
}

export interface PublicSerpIntelligenceSummaryV1 {
  version: typeof PUBLIC_SERP_INTELLIGENCE_VERSION;
  status: PublicSerpIntelligenceStatus;
  score: number | null;
  score_label: string;
  coverage_label: string;
  signals: PublicSerpIntelligenceSignalV1[];
  attention_label: string | null;
  disclaimer: string;
}
