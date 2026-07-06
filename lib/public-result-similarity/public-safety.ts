import type { PublicResultSimilaritySummary } from "./types";

const FORBIDDEN_PUBLIC_SIMILARITY_WORDING = [
  "doublon confirmé",
  "annonce dupliquée",
  "annonce copiée",
  "arnaque",
  "annonce suspecte",
  "annonce fiable",
  "annonce vérifiée",
  "score de similarité",
  "score de fiabilité",
  "prix de marché",
  "prix officiel",
  "prix réel",
  "sous le marché",
  "au-dessus du marché",
];

const FORBIDDEN_KEYS = [
  "similarity_score",
  "similarity_group_id",
  "raw_similarity_signals",
  "threshold_details",
  "cache_key",
  "evidence_ref",
  "contact",
  "gallery",
  "image",
];

export function assertPublicResultSimilaritySafety(summary: PublicResultSimilaritySummary): void {
  const serialized = JSON.stringify(summary).toLowerCase();
  for (const wording of FORBIDDEN_PUBLIC_SIMILARITY_WORDING) {
    if (serialized.includes(wording.toLowerCase())) {
      throw new Error(`Unsafe public similarity wording detected: ${wording}`);
    }
  }

  for (const key of FORBIDDEN_KEYS) {
    if (serialized.includes(`"${key.toLowerCase()}"`)) {
      throw new Error(`Unsafe public similarity field exposure detected: ${key}`);
    }
  }
}
