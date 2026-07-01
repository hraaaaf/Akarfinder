import { calculatePriceGap, type PriceGapInput, type PricePosition } from "./price-gap-calculator";

export type MarketPriceScoreConfidence = "high" | "medium" | "low";
export type MarketPriceScoreTone = "success" | "info" | "warning" | "danger";

export type MarketPriceScoreDisplay = {
  label: string;
  description: string;
  title: string;
  confidence: MarketPriceScoreConfidence;
  tone: MarketPriceScoreTone;
  position: Exclude<PricePosition, "insufficient_data">;
};

const POSITION_DISPLAY: Record<
  Exclude<PricePosition, "insufficient_data">,
  { label: string; description: string; tone: MarketPriceScoreTone }
> = {
  below_market: {
    label: "Sous le marché",
    description: "Le prix/m² affiché est inférieur au repère Yakeey.",
    tone: "success",
  },
  near_market: {
    label: "Aligné marché",
    description: "Le prix/m² est proche du repère Yakeey.",
    tone: "info",
  },
  above_market: {
    label: "Au-dessus du marché",
    description: "Le prix/m² dépasse le repère Yakeey sans être extrême.",
    tone: "warning",
  },
  overpriced: {
    label: "Fortement au-dessus",
    description: "Le prix/m² est nettement supérieur au repère Yakeey.",
    tone: "danger",
  },
};

function confidenceFromScope(scope: PriceGapResultLike["benchmark_scope"]): MarketPriceScoreConfidence {
  if (scope === "neighborhood") return "high";
  if (scope === "city") return "medium";
  return "low";
}

type PriceGapResultLike = {
  benchmark_scope: "city" | "neighborhood" | null;
  price_position: PricePosition;
};

export function getMarketPriceScoreDisplay(input: PriceGapInput): MarketPriceScoreDisplay | null {
  const result = calculatePriceGap(input);
  if (result.price_position === "insufficient_data") return null;

  const config = POSITION_DISPLAY[result.price_position];
  const confidence = confidenceFromScope(result.benchmark_scope);
  const title = `Référence marché Yakeey · ${config.description}`;

  return {
    label: config.label,
    description: config.description,
    title,
    confidence,
    tone: config.tone,
    position: result.price_position,
  };
}

