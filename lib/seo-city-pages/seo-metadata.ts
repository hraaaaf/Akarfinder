import type { CityMetadata, SearchIntent, SeoMetadata } from "./types";

// Generate canonical title for city page (non-promissive)
export function cityPageTitle(city: CityMetadata): string {
  return `Immobilier ${city.displayName} | Recherche d'annonces immobilières avec AkarFinder`;
}

// Generate canonical description for city page
export function cityPageDescription(city: CityMetadata): string {
  return `Explorez des résultats immobiliers publics à ${city.displayName} avec AkarFinder et vérifiez les détails sur la source originale.`;
}

// Generate canonical title for city + intent page
export function intentPageTitle(city: CityMetadata, intent: SearchIntent): string {
  const intentLabel = intent === "acheter" ? "Acheter" : "Louer";
  return `${intentLabel} à ${city.displayName} | Annonces immobilières avec AkarFinder`;
}

// Generate canonical description for city + intent page
export function intentPageDescription(
  city: CityMetadata,
  intent: SearchIntent,
): string {
  const action = intent === "acheter" ? "acheter" : "louer";
  return `Recherchez des annonces pour ${action} à ${city.displayName}, explorez plusieurs sources et vérifiez directement auprès de l'annonceur.`;
}

// Generate full SEO metadata for city page
export function generateCitySeoMetadata(
  city: CityMetadata,
  baseUrl: string = "https://akarfinder.vercel.app",
): SeoMetadata {
  const title = cityPageTitle(city);
  const description = cityPageDescription(city);
  const canonical = `${baseUrl}/immobilier/${city.slug}`;

  return {
    title,
    description: description.slice(0, 160), // Truncate to meta description length
    canonical,
    ogTitle: title,
    ogDescription: description,
  };
}

// Generate full SEO metadata for intent page
export function generateIntentSeoMetadata(
  city: CityMetadata,
  intent: SearchIntent,
  baseUrl: string = "https://akarfinder.vercel.app",
): SeoMetadata {
  const title = intentPageTitle(city, intent);
  const description = intentPageDescription(city, intent);
  const canonical = `${baseUrl}/immobilier/${city.slug}/${intent}`;

  return {
    title,
    description: description.slice(0, 160),
    canonical,
    ogTitle: title,
    ogDescription: description,
  };
}
