import { buildPublicPageMetadata } from "@/lib/seo/public-page-metadata";

export const metadata = buildPublicPageMetadata({
  title: "AkarFinder Pro — Données immobilières structurées pour agences et promoteurs",
  description: "Programme pilote AkarFinder Pro pour structurer des données immobilières autorisées, améliorer les fiches et la recherche, puis qualifier la demande sans promesse de résultat.",
  canonicalPath: "/pro",
});

export default function ProLayout({ children }: { children: React.ReactNode }) {
  return children;
}
