import Link from "next/link";

import { MonProjetWizardP1A } from "@/components/companion/MonProjetWizardP1A";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Container } from "@/components/ui/Container";
import { ui } from "@/components/ui/design-system";

export const metadata = {
  title: "Mon Projet immobilier | AkarFinder",
  description: "Structurez votre projet immobilier étape par étape avant de lancer une recherche AkarFinder.",
};

export default function MonProjetPage() {
  return (
    <main className={`min-h-screen ${ui.pageLight}`}>
      <SiteHeader searchMode fluid />
      <Container className="pb-24 pt-5 sm:pb-12 sm:pt-8 lg:py-10">
        <div className="mb-4 flex justify-end">
          <Link
            href="/mon-projet/espace"
            className={`${ui.secondaryActionPill} min-h-10 px-4 text-[11.5px]`}
          >
            Retrouver mes projets enregistrés
          </Link>
        </div>
        <MonProjetWizardP1A />
      </Container>
    </main>
  );
}
