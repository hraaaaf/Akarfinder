import { buildPublicPageMetadata } from "@/lib/seo/public-page-metadata";

export const metadata = buildPublicPageMetadata({
  title: "Acheter au Maroc — AkarFinder",
  description: "Explorez les biens à vendre au Maroc selon votre ville, votre budget et votre projet, avec des informations et des sources explicites.",
  canonicalPath: "/acheter",
});

export default function AcheterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
