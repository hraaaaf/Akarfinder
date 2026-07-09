import type { NeighborhoodMetadata, NeighborhoodSeoMeta } from "./types";

export function neighborhoodPageTitle(n: NeighborhoodMetadata): string {
  return `Immobilier ${n.displayName} ${n.cityDisplayName} | Recherche d'annonces avec AkarFinder`;
}

export function neighborhoodPageDescription(n: NeighborhoodMetadata): string {
  return `Explorez des résultats immobiliers publics à ${n.displayName}, ${n.cityDisplayName} avec AkarFinder et vérifiez chaque détail sur la source originale.`;
}

export function generateNeighborhoodSeoMetadata(
  n: NeighborhoodMetadata,
  baseUrl: string = "https://akarfinder.vercel.app",
): NeighborhoodSeoMeta {
  const title = neighborhoodPageTitle(n);
  const description = neighborhoodPageDescription(n);
  const canonical = `${baseUrl}/immobilier/${n.citySlug}/${n.slug}`;

  return {
    title,
    description: description.slice(0, 160),
    canonical,
    ogTitle: title,
    ogDescription: description,
  };
}
