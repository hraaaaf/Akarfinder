import { buildPublicPageMetadata } from "@/lib/seo/public-page-metadata";

export const metadata = buildPublicPageMetadata({
  title: "Vendre au Maroc — Préparez votre vente | AkarFinder",
  description: "Estimation indicative, prix observés, annonces similaires et repères de marché pour préparer la vente de votre bien au Maroc. Repères indicatifs — à confirmer avant décision.",
  canonicalPath: "/vendre",
});

export default function VendreLayout({ children }: { children: React.ReactNode }) {
  return children;
}
