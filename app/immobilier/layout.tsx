import { buildPublicPageMetadata } from "@/lib/seo/public-page-metadata";

export const metadata = buildPublicPageMetadata({
  title: "Immobilier au Maroc | AkarFinder",
  description: "Explorez l'immobilier au Maroc par ville et quartier, puis lancez une recherche structurée avec sources et niveaux d'information explicites.",
  canonicalPath: "/immobilier",
});

export default function ImmobilierLayout({ children }: { children: React.ReactNode }) {
  return children;
}
