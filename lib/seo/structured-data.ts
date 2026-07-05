import { siteConfig } from "@/lib/seo/site";

// SEO-FOUNDATION-1 — schemas structurés PRUDENTS uniquement.
//
// Interdit (doctrine Gateway) : RealEstateListing, Offer, AggregateRating,
// Review, ou tout schema impliquant un prix/une disponibilité "garantie" ou
// "certifiée" sur des résultats Gateway externes. Ces schemas ne concernent
// que l'identité du site, jamais les annonces tierces affichées en aperçu.

export function getOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.siteName,
    url: siteConfig.siteUrl,
    logo: `${siteConfig.siteUrl}/brand/logo-default.png`,
  };
}

export function getWebsiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.siteName,
    url: siteConfig.siteUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteConfig.siteUrl}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}
