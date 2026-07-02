import Link from "next/link";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Container } from "@/components/ui/Container";

export const metadata = {
  title: "À propos — AkarFinder",
  description: "AkarFinder, moteur de comparaison immobilier au Maroc.",
};

export default function AProposPage() {
  return (
    <main className="flex flex-col" style={{ minHeight: "100svh" }}>
      <SiteHeader />
      <div className="flex-1 py-14 sm:py-20">
        <Container className="max-w-2xl">
          <h1 className="text-[2rem] font-extrabold tracking-[-0.04em] text-foreground sm:text-[2.4rem]">
            À propos d&apos;AkarFinder
          </h1>
          <div className="mt-6 space-y-5 text-[14.5px] leading-7 text-muted-foreground">
            <p>
              AkarFinder est un moteur de recherche immobilier pour le Maroc. Le site affiche des résultats
              provenant de sources originales et des annonces de partenaires autorisés pour aider à
              comparer les repères du quartier, les prix et les signaux de confiance avant de contacter.
            </p>
            <p>
              Le produit est en version bêta et continue d&apos;évoluer. La source de chaque annonce est
              toujours affichée, et le contact reste géré par la source d&apos;origine sauf pour les
              annonces de partenaires autorisés.
            </p>
          </div>
          <Link
            href="/"
            className="mt-8 inline-flex items-center gap-2 text-[13.5px] font-extrabold text-deepblue transition hover:gap-2.5"
          >
            <span aria-hidden="true">←</span> Retour à l&apos;accueil
          </Link>
        </Container>
      </div>
      <SiteFooter />
    </main>
  );
}
