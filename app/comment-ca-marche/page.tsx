import Link from "next/link";

import { SecondaryPageShell } from "@/components/layout/SecondaryPageShell";
import { ui } from "@/components/ui/design-system";

export const metadata = {
  title: "Comment ça marche — AkarFinder",
  description: "Comment fonctionne la comparaison immobilière AkarFinder.",
};

const STEPS = [
  {
    title: "1. Cherchez",
    text: "Filtrez par ville, budget et type de bien pour parcourir les résultats disponibles depuis leurs sources originales.",
  },
  {
    title: "2. Comparez",
    text: "Consultez les repères de prix, la proximité des commodités et la source d'origine pour chaque résultat.",
  },
  {
    title: "3. Contactez la source",
    text: "Chaque annonce indique sa source d'origine. Le contact et la visite se font directement avec elle.",
  },
];

export default function CommentCaMarchePage() {
  return (
    <SecondaryPageShell
      eyebrow="Mode d'emploi"
      title="Comment ça marche"
      intro="Trois étapes simples pour rechercher, comparer et revenir vers la source d'origine avec davantage de contexte."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {STEPS.map((step) => (
          <article key={step.title} className="rounded-[1.2rem] border border-slate-200/80 bg-slate-50/80 p-5">
            <h2 className="text-[1rem] font-extrabold text-[#0B1F3A]">{step.title}</h2>
            <p className="mt-2 text-[13.5px] leading-6 text-slate-600">{step.text}</p>
          </article>
        ))}
      </div>
      <Link href="/search" className={`${ui.primaryActionPill} mt-7 min-h-11 px-5`}>
        Commencer une recherche
      </Link>
    </SecondaryPageShell>
  );
}
