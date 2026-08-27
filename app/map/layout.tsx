import { buildPublicPageMetadata } from "@/lib/seo/public-page-metadata";

export const metadata = buildPublicPageMetadata({
  title: "Carte immobilière du Maroc — Villes et quartiers | AkarFinder",
  description: "Explorez le Maroc par ville puis quartier. Les contours publiés sont des repères AkarFinder sourcés, sans prétention de frontière administrative officielle.",
  canonicalPath: "/map",
});

export default function MapLayout({ children }: { children: React.ReactNode }) {
  return children;
}
