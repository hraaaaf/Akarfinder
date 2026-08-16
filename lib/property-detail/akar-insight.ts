import { PUBLIC_SERP_INTELLIGENCE_VERSION } from "@/lib/intelligence/public-serp-intelligence-types";
import type { PublicPropertyDetailV2 } from "@/lib/property-detail/public-property-detail-v2";

export type AkarInsightKey = "market" | "multisource" | "attention";

export type AkarInsightItem = {
  key: AkarInsightKey;
  label: string;
  value: string;
};

export type AkarInsightModel = {
  version: typeof PUBLIC_SERP_INTELLIGENCE_VERSION;
  score: number | null;
  scoreLabel: string | null;
  coverageLabel: string | null;
  items: AkarInsightItem[];
};

function nonEmpty(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function buildAkarInsightModel(detail: PublicPropertyDetailV2): AkarInsightModel {
  const items: AkarInsightItem[] = [];
  const market = detail.market.status === "available" ? nonEmpty(detail.market.label) : null;
  const multisource = detail.multisource.status === "supported" ? nonEmpty(detail.multisource.label) : null;
  const attention = nonEmpty(detail.conclusion.attention_label);

  if (market) items.push({ key: "market", label: "Position marché", value: market });
  if (multisource) items.push({ key: "multisource", label: "Multi-source", value: multisource });
  if (attention) items.push({ key: "attention", label: "À examiner", value: attention });

  return {
    version: PUBLIC_SERP_INTELLIGENCE_VERSION,
    score: detail.conclusion.akar_score,
    scoreLabel: nonEmpty(detail.conclusion.akar_score_label),
    coverageLabel: nonEmpty(detail.conclusion.coverage_label),
    items,
  };
}
