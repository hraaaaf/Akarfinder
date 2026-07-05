// P5B — Reliability score, badge, and reasons.
// Distinct from data_completeness_score (presence of fields).
// reliability_score = estimated trust in the listing's quality.

export type ReliabilityBadgeLabel =
  | "Très complète"
  | "Complète"
  | "Limitée"
  | "Très limitée";

export type ReliabilityResult = {
  score: number;
  badge: ReliabilityBadgeLabel;
  reasons: string[];
};

export type ReliabilityInput = {
  data_completeness_score: number;
  field_confidence_json: string | null;
  price_mad: number | null;
  surface_m2: number | null;
  city: string | null;
  description_snippet: string | null;
  seller_name: string | null;
  images_count: number | null;
  duplicate_score: number;
};

type FieldConfidence = Record<string, string>;

function parseConfidence(json: string | null): FieldConfidence {
  if (!json) return {};
  try {
    return JSON.parse(json) as FieldConfidence;
  } catch {
    return {};
  }
}

function countHighConfidence(conf: FieldConfidence): number {
  return Object.values(conf).filter((v) => v === "high").length;
}

export function badgeFromScore(score: number): ReliabilityBadgeLabel {
  if (score >= 85) return "Très complète";
  if (score >= 70) return "Complète";
  if (score >= 50) return "Limitée";
  return "Très limitée";
}

export function computeReliabilityScore(input: ReliabilityInput): ReliabilityResult {
  const reasons: string[] = [];
  let score = 0;

  // --- Positive contributors ---

  // data_completeness_score → up to 25 pts
  const completenessContrib = Math.round((input.data_completeness_score / 100) * 25);
  score += completenessContrib;
  if (input.data_completeness_score >= 70) {
    reasons.push("Données complètes");
  }

  // field_confidence → up to 20 pts (2 pts per high-confidence field, max 10 fields)
  const conf = parseConfidence(input.field_confidence_json);
  const highCount = countHighConfidence(conf);
  const confidenceContrib = Math.min(20, highCount * 2);
  score += confidenceContrib;

  // price_mad present and plausible (50k–100M MAD) → up to 15 pts
  const priceMad = input.price_mad ?? 0;
  if (priceMad > 0 && priceMad >= 50_000 && priceMad <= 100_000_000) {
    score += 15;
    reasons.push("Prix présent");
  }

  // surface_m2 present and plausible (5–10 000 m²) → up to 10 pts
  const surfaceM2 = input.surface_m2 ?? 0;
  if (surfaceM2 > 0 && surfaceM2 >= 5 && surfaceM2 <= 10_000) {
    score += 10;
    reasons.push("Surface présente");
  }

  // images_count > 0 → 10 pts
  if ((input.images_count ?? 0) > 0) {
    score += 10;
    reasons.push("Photos disponibles");
  }

  // seller_name present → 10 pts
  if (input.seller_name && input.seller_name.trim().length > 0) {
    score += 10;
    reasons.push("Vendeur identifié");
  }

  // duplicate_score effect → up to 10 pts bonus
  if (input.duplicate_score < 0.40) {
    score += 10;
  } else if (input.duplicate_score < 0.70) {
    score += 5;
  }
  // >= 0.70 → no bonus, penalty applied below

  // city present
  if (input.city && input.city.trim().length > 0) {
    reasons.push("Ville confirmée");
  }

  // --- Penalties ---

  if (priceMad === 0 || priceMad < 50_000 || priceMad > 100_000_000) {
    score -= 15;
  }

  if (surfaceM2 === 0 || surfaceM2 < 5 || surfaceM2 > 10_000) {
    score -= 10;
  }

  if (!input.city || input.city.trim().length === 0) {
    score -= 15;
    reasons.push("Ville absente");
  }

  if (!input.description_snippet || input.description_snippet.trim().length === 0) {
    score -= 5;
  }

  if (!input.seller_name || input.seller_name.trim().length === 0) {
    score -= 5;
    reasons.push("Vendeur non identifié");
  }

  if (input.duplicate_score >= 0.90) {
    score -= 10;
    reasons.push("Doublon possible");
  } else if (input.duplicate_score >= 0.70) {
    reasons.push("Doublon probable");
  } else if (input.duplicate_score >= 0.40) {
    reasons.push("Annonce similaire détectée");
  }

  // Neighbourhood (district) is not in ReliabilityInput — note absence if needed
  // (district check happens at the mapping layer if district is null)

  const finalScore = Math.max(0, Math.min(100, Math.round(score)));
  return { score: finalScore, badge: badgeFromScore(finalScore), reasons };
}
