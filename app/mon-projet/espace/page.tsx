import { UserContinuityWorkspace } from "@/components/account/UserContinuityWorkspace";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Container } from "@/components/ui/Container";

export const metadata = {
  title: "Mes projets AkarFinder | Recherches et favoris",
  description: "Retrouvez vos projets, recherches sauvegardées, favoris, alertes et comparaisons AkarFinder.",
};

export default function MyProjectsWorkspacePage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#F7FAFF_0%,#FFFFFF_36%)] text-foreground">
      <SiteHeader />
      <Container className="py-10 sm:py-14 lg:py-16">
        <div className="mb-8 max-w-3xl">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#0B63CE]">Mes projets AkarFinder</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.035em] text-[#071B33] sm:text-5xl">Votre recherche ne repart plus de zéro.</h1>
          <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">Retrouvez les projets réellement enregistrés dans votre espace, ainsi que leur continuité disponible.</p>
        </div>
        <UserContinuityWorkspace />
      </Container>
    </main>
  );
}
