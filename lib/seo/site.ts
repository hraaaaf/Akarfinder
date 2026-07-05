// SEO-FOUNDATION-1 — configuration SEO centralisée.
//
// siteUrl est l'URL de production RÉELLEMENT servie aujourd'hui (Vercel).
// futureDomain (akarfinder.ma) est documenté mais NON activé tant que le
// domaine n'est pas branché : l'utiliser prématurément dans metadataBase
// casserait canonical/OG/sitemap (URLs pointant vers un domaine qui ne sert
// rien).

export const siteConfig = {
  siteName: "AkarFinder",
  siteUrl: "https://akarfinder.vercel.app",
  // Domaine futur — à activer uniquement quand DNS + Vercel domain sont branchés.
  // Ne pas utiliser ailleurs dans le code tant que ce jour n'est pas arrivé.
  futureDomain: "https://akarfinder.ma",
  defaultTitle: "AkarFinder — Moteur de recherche immobilier au Maroc",
  defaultDescription:
    "Comparez les résultats immobiliers au Maroc, consultez la source originale et trouvez des repères utiles pour mieux décider.",
  defaultOgImage: "/brand/og-image.png",
  twitterCard: "summary_large_image" as const,
  locale: "fr_MA",
} as const;

export type SiteConfig = typeof siteConfig;
