import { CompanionWizard } from "@/components/companion/CompanionWizard";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Container } from "@/components/ui/Container";

export const metadata = {
  title: "Compagnon AkarFinder | Construire Mon Projet immobilier",
  description: "Structurez Mon Projet immobilier étape par étape avant de lancer la recherche AkarFinder.",
};

export default function CompanionPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#F7FAFF_0%,#FFFFFF_42%)] text-foreground">
      <SiteHeader />
      <Container className="py-10 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 text-center sm:mb-10">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#0B63CE]">Compagnon · Mon Projet AkarFinder</p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.035em] text-[#071B33] sm:text-5xl">Construisons Mon Projet avant de chercher.</h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
              Le Compagnon ne choisit pas à votre place. Il transforme vos objectifs, contraintes, préférences et compromis en un projet de recherche explicite, modifiable et réutilisable.
            </p>
          </div>
          <CompanionWizard />
          <p className="mx-auto mt-5 max-w-2xl text-center text-[11px] leading-relaxed text-slate-400">
            Les recommandations et scores ne sont calculés que lorsque des données suffisantes sont disponibles. Une information absente n'est jamais interprétée comme un mauvais signal.
          </p>
        </div>
      </Container>
    </main>
  );
}
