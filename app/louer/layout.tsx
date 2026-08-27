import { buildPublicPageMetadata } from "@/lib/seo/public-page-metadata";

export const metadata = buildPublicPageMetadata({
  title: "Louer au Maroc — AkarFinder",
  description: "Recherchez une location au Maroc selon votre zone, votre budget mensuel et le type de logement, avec des informations et des sources explicites.",
  canonicalPath: "/louer",
});

export default function LouerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
