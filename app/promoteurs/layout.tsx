import { buildPublicPageMetadata } from "@/lib/seo/public-page-metadata";

export const metadata = buildPublicPageMetadata({
  title: "AkarFinder Pro pour promoteurs immobiliers",
  description: "Structurez projets, typologies, prix, plans, médias et droits avant publication dans les expériences AkarFinder.",
  canonicalPath: "/promoteurs",
});

export default function PromoteursLayout({ children }: { children: React.ReactNode }) {
  return children;
}
