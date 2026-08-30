import { MonProjetWizardP1A } from "@/components/companion/MonProjetWizardP1A";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Container } from "@/components/ui/Container";
import { ui } from "@/components/ui/design-system";
import "./p0-polish.css";

export const metadata = {
  title: "Mon Projet immobilier | AkarFinder",
  description: "Structurez votre projet immobilier étape par étape avant de lancer une recherche AkarFinder.",
};

export default function MonProjetPage() {
  return (
    <main className={`min-h-screen ${ui.pageLight}`}>
      <SiteHeader searchMode fluid />
      <Container className="pb-24 pt-5 sm:pb-12 sm:pt-8 lg:py-8">
        <MonProjetWizardP1A />
      </Container>
    </main>
  );
}
