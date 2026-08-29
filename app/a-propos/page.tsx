import Link from "next/link";
import { BadgeCheck, ExternalLink, Search } from "lucide-react";

import { SecondaryPageShell } from "@/components/layout/SecondaryPageShell";
import { ui } from "@/components/ui/design-system";

export const metadata = {
  title: "À propos — AkarFinder",
  description: "AkarFinder, moteur de comparaison immobilier au Maroc.",
};

const PRINCIPLES = [
  {
    icon: Search,
    title: "Comparer plus clairement",
    text: "Rassembler des résultats pour mieux comparer les repères du quartier, les prix et les informations disponibles.",
  },
  {
    icon: BadgeCheck,
    title: "Source visible",
    text: "La source de chaque annonce reste affichée pour distinguer l’origine des informations présentées.",
  },
  {
    icon: ExternalLink,
    title: "Contact à l’origine",
    text: "Le contact reste géré par la source d’origine, sauf pour les annonces de partenaires autorisés.",
  },
] as const;

export default function AProposPage() {
  return (
    <SecondaryPageShell
      eyebrow="À propos"
      title="À propos d'AkarFinder"
      intro="Un moteur de recherche immobilier conçu pour comparer plus clairement les offres, leurs sources et les repères utiles avant de contacter."
      maxWidth="3xl"
    >
      <div className="grid gap-3 md:grid-cols-3" data-p1-editorial-about>
        {PRINCIPLES.map(({ icon: Icon, title, text }) => (
          <article key={title} className="rounded-[18px] border border-[#DCE8F5] bg-[#F8FBFF] p-5">
            <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-white text-[#0B63CE] shadow-[0_5px_16px_rgba(11,31,58,0.06)]">
              <Icon size={18} strokeWidth={2.2} aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-[0.98rem] font-extrabold text-[#0B1F3A]">{title}</h2>
            <p className="mt-2 text-[13px] leading-6 text-slate-600">{text}</p>
          </article>
        ))}
      </div>

      <div className="mt-5 rounded-[18px] border border-[#DCE8F5] bg-white p-5 sm:p-6">
        <p className="text-[13.5px] leading-6 text-slate-600">
          AkarFinder est un moteur de recherche immobilier pour le Maroc. Le produit est en version bêta et continue d’évoluer, sans masquer la provenance des résultats affichés.
        </p>
        <Link href="/search" className={`${ui.secondaryActionPill} mt-5 min-h-11 px-4`}>
          Explorer les biens
        </Link>
      </div>
    </SecondaryPageShell>
  );
}
