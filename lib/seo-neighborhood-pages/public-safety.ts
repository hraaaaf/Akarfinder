const FORBIDDEN_WORDING = [
  "toutes les annonces",
  "meilleures annonces",
  "annonces vérifiées",
  "annonces fiables",
  "annonces certifiées",
  "prix officiel",
  "prix réel",
  "prix de marché",
  "meilleur prix",
  "bon plan garanti",
  "disponible confirmé",
  "source certifiée",
  "marketplace",
  "quartier sûr",
  "quartier dangereux",
  "quartier riche",
  "quartier pauvre",
  "investissement garanti",
  "rentable garanti",
  "sous le marché",
  "au-dessus du marché",
  "liste complète",
  "liste exhaustive",
];

const FORBIDDEN_DATA_KEYS = [
  "value_low",
  "value_median",
  "value_high",
  "evidence_ref",
  "source_registry",
  "internal_score",
];

export function assertNeighborhoodPageSafety(content: string): void {
  const lower = content.toLowerCase();

  for (const term of FORBIDDEN_WORDING) {
    if (lower.includes(term)) {
      throw new Error(
        `Neighborhood page contains forbidden wording: "${term}"`,
      );
    }
  }

  for (const key of FORBIDDEN_DATA_KEYS) {
    if (lower.includes(key)) {
      throw new Error(
        `Neighborhood page exposes forbidden data key: "${key}"`,
      );
    }
  }
}

export function assertNoSerperInNeighborhoodPages(code: string): void {
  const patterns = [
    /searchGateway|fetchSerper|SERPER_API|gateway\s*\(/gi,
    /serper\.com|searx|search_result/gi,
  ];

  for (const pattern of patterns) {
    if (pattern.test(code)) {
      throw new Error(
        `Neighborhood pages must not call Serper/Gateway. Found pattern: ${pattern}`,
      );
    }
  }
}
