import Link from "next/link";

import { SecondaryPageShell } from "@/components/layout/SecondaryPageShell";
import { ui } from "@/components/ui/design-system";

export const metadata = {
  title: "FAQ — AkarFinder",
  description: "Questions fréquentes sur AkarFinder.",
};

const FAQS = [
  {
    q: "D'où viennent les annonces ?",
    a: "AkarFinder affiche des résultats provenant de plusieurs sources publiques et partenaires autorisés. La source de chaque résultat est toujours visible.",
  },
  {
    q: "Puis-je contacter directement depuis AkarFinder ?",
    a: "Pour les résultats web issus de sources externes, le contact et la visite se font directement avec cette source, via le lien affiché sur la fiche.",
  },
  {
    q: "Que signifie l'indice de complétude affiché sur une annonce ?",
    a: "C'est un repère indicatif calculé selon la présence des informations (prix, surface, description...) et la cohérence des données. Il ne remplace pas une vérification directe auprès de la source.",
  },
  {
    q: "Comment demander le retrait d'une annonce ?",
    a: "Utilisez la page Demande de retrait, accessible depuis le footer du site.",
  },
];

export default function FaqPage() {
  return (
    <SecondaryPageShell
      eyebrow="Aide"
      title="Questions fréquentes"
      intro="Les réponses essentielles sur les sources, le contact, les repères affichés et les demandes de retrait."
    >
      <div className="space-y-3">
        {FAQS.map((item) => (
          <article key={item.q} className="rounded-[1.2rem] border border-slate-200/80 bg-slate-50/80 p-5">
            <h2 className="text-[1rem] font-extrabold text-[#0B1F3A]">{item.q}</h2>
            <p className="mt-2 text-[13.5px] leading-6 text-slate-600">{item.a}</p>
          </article>
        ))}
      </div>
      <div className="mt-7 flex flex-wrap gap-2">
        <Link href="/search" className={`${ui.primaryActionPill} min-h-11 px-5`}>
          Explorer les biens
        </Link>
        <Link href="/contact" className={`${ui.secondaryActionPill} min-h-11 px-4`}>
          Nous contacter
        </Link>
      </div>
    </SecondaryPageShell>
  );
}
