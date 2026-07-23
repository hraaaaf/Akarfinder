import { UserContinuityWorkspace } from "@/components/account/UserContinuityWorkspace";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Container } from "@/components/ui/Container";

export const metadata = {
  title: "Mon Projet AkarFinder | Projets, recherches et favoris",
  description: "Retrouvez Mon Projet, vos recherches sauvegardées, favoris, alertes, comparaisons et préférences AkarFinder.",
};

export default function MyProjectPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#F7FAFF_0%,#FFFFFF_36%)] text-foreground">
      <SiteHeader />
      <Container className="py-10 sm:py-14 lg:py-16">
        <div className="mb-8 max-w-3xl">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#0B63CE]">Mon Projet AkarFinder</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.035em] text-[#071B33] sm:text-5xl">Votre recherche ne repart plus de zéro.</h1>
          <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">Chaque projet peut conserver ses critères structurés et servir de point de reprise pour la recherche, les favoris, les alertes et les comparaisons.</p>
        </div>
        <UserContinuityWorkspace />
      </Container>
    </main>
  );
}
