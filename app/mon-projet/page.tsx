import Link from "next/link";

import { MonProjetWizardP1A } from "@/components/companion/MonProjetWizardP1A";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Container } from "@/components/ui/Container";

export const metadata = {
  title: "Mon Projet immobilier | AkarFinder",
  description: "Structurez votre projet immobilier étape par étape avant de lancer une recherche AkarFinder.",
};

export default function MonProjetPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#F7FAFF_0%,#FFFFFF_42%)] text-foreground">
      <SiteHeader />
      <Container className="py-6 sm:py-12 lg:py-16">
        <div className="mb-5 flex justify-end">
          <Link href="/mon-projet/espace" className="text-xs font-extrabold text-[#0B63CE] hover:underline">
            Retrouver mes projets enregistrés
          </Link>
        </div>
        <MonProjetWizardP1A />
      </Container>
    </main>
  );
}
