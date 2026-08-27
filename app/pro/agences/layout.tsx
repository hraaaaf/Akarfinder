import { buildPublicPageMetadata } from "@/lib/seo/public-page-metadata";

export const metadata = buildPublicPageMetadata({
  title: "AkarFinder Pro pour agences immobilières",
  description: "Structurez vos données de biens, leurs droits et leur complétude avant publication dans les expériences AkarFinder.",
  canonicalPath: "/pro/agences",
});

export default function ProAgencesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
