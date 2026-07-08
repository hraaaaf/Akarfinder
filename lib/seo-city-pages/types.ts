// SEO City Intent Pages — Static content structure (no Serper calls, no invented data)
// RULE: All wording is public-safe, non-promissive, explanatory only

export type CitySlug = "casablanca" | "rabat" | "marrakech" | "tanger" | "agadir";

export type SearchIntent = "acheter" | "louer";

export interface CityMetadata {
  slug: CitySlug;
  displayName: string; // Casablanca, Rabat, etc.
  frenchName: string; // For i18n future
  description: string; // Canonical description (used in page meta + content)
  neighborhoods?: string[]; // Popular neighborhood names for inline links (optional in V1)
  popularSearches: string[]; // Examples: "appartement", "villa", "programme neuf"
}

export interface CityPageContent {
  city: CityMetadata;
  h1: string;
  introText: string; // Non-promissive, explains AkarFinder = search engine
  intentSections?: IntentSection[]; // V2: acheter/louer sections
}

export interface IntentSection {
  intent: SearchIntent;
  title: string; // e.g. "Acheter à Casablanca"
  description: string;
  ctaText: string;
  ctaUrl: string; // /search?q=...
}

export interface SeoMetadata {
  title: string;
  description: string; // Max 160 chars
  canonical: string;
  ogTitle: string;
  ogDescription: string;
  ogImage?: string;
}

// Validation
export function isValidCitySlug(slug: unknown): slug is CitySlug {
  const valid: CitySlug[] = ["casablanca", "rabat", "marrakech", "tanger", "agadir"];
  return typeof slug === "string" && valid.includes(slug as CitySlug);
}
