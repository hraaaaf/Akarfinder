import { buildPublicPageMetadata } from "@/lib/seo/public-page-metadata";

export const metadata = buildPublicPageMetadata({
  title: "Immobilier neuf au Maroc — AkarFinder",
  description: "Recherchez les offres immobilières neuves disponibles dans le moteur AkarFinder. Les démonstrations promoteur restent séparées de l'inventaire réel et clairement identifiées comme exemples.",
  canonicalPath: "/neuf",
});

export default function NeufLayout({ children }: { children: React.ReactNode }) {
  return children;
}
