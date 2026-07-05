import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { Container } from "@/components/ui/Container";
import { SearchProfileWizard } from "@/components/search-profile/SearchProfileWizard";

export const metadata: Metadata = {
  title: "Créer mon profil de recherche — AkarFinder",
  description:
    "Construisez votre profil de recherche immobilière au Maroc étape par étape : projet, budget indicatif, critères, quartier et priorités. Profil indicatif — non contractuel, rien n'est envoyé sans votre accord.",
  alternates: {
    canonical: "/profil-recherche",
  },
};

export default function SearchProfilePage() {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader variant="light" />

      <section className="pt-12 pb-16 lg:pt-16 lg:pb-20">
        <Container>
          <SearchProfileWizard />
        </Container>
      </section>

      <SiteFooter />
    </main>
  );
}
