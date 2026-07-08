// SEO City Pages — Public safety checks
// Ensure no forbidden wording, no price claims, no exhaustiveness claims

const FORBIDDEN_WORDING = [
  "toutes les annonces",
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
  "portefeuille",
  "liste complète",
  "liste exhaustive",
  "toutes les propriétés",
  "annonces sûres",
  "annonces sécurisées",
];

const FORBIDDEN_CONCEPTS = [
  "value_low",
  "value_median",
  "value_high",
  "evidence_ref",
  "source_registry",
  "internal_score",
];

export function assertSeoCityPageSafety(content: string): void {
  const lowerContent = content.toLowerCase();

  for (const term of FORBIDDEN_WORDING) {
    if (lowerContent.includes(term)) {
      throw new Error(
        `SEO city page contains forbidden wording: "${term}" in content: "${content.slice(0, 100)}..."`,
      );
    }
  }

  for (const concept of FORBIDDEN_CONCEPTS) {
    if (lowerContent.includes(concept)) {
      throw new Error(
        `SEO city page exposes forbidden concept: "${concept}" in content: "${content.slice(0, 100)}..."`,
      );
    }
  }
}

export function assertNoSerperInSeoPages(code: string): void {
  const serperPatterns = [
    /searchGateway|fetchSerper|SERPER_API|gateway\s*\(/gi,
    /serper\.com|searx|search_result/gi,
  ];

  for (const pattern of serperPatterns) {
    if (pattern.test(code)) {
      throw new Error(
        `SEO city pages must not call Serper directly. Found pattern: ${pattern}`,
      );
    }
  }
}
