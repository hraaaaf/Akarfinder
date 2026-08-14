import Link from "next/link";

import { SecondaryPageShell } from "@/components/layout/SecondaryPageShell";
import { ui } from "@/components/ui/design-system";

export const metadata = {
  title: "À propos — AkarFinder",
  description: "AkarFinder, moteur de comparaison immobilier au Maroc.",
};

export default function AProposPage() {
  return (
    <SecondaryPageShell
      eyebrow="À propos"
      title="À propos d'AkarFinder"
      intro="Un moteur de recherche immobilier conçu pour comparer plus clairement les offres, leurs sources et les repères utiles avant de contacter."
    >
      <div className="space-y-5 text-[14px] leading-7 text-slate-600 sm:text-[14.5px]">
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
      <Link href="/search" className={`${ui.secondaryActionPill} mt-7 min-h-11 px-4`}>
        Explorer les biens
      </Link>
    </SecondaryPageShell>
  );
}
