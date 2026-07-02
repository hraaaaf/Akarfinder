import Link from "next/link";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Container } from "@/components/ui/Container";

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
    a: "Pour les annonces indexées depuis une source tierce, le contact et la visite se font directement avec cette source, via le lien affiché sur la fiche.",
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
    <main className="flex flex-col" style={{ minHeight: "100svh" }}>
      <SiteHeader />
      <div className="flex-1 py-14 sm:py-20">
        <Container className="max-w-2xl">
          <h1 className="text-[2rem] font-extrabold tracking-[-0.04em] text-foreground sm:text-[2.4rem]">
            Questions fréquentes
          </h1>
          <div className="mt-8 space-y-5">
            {FAQS.map((item) => (
              <div key={item.q} className="rounded-[1.2rem] border border-border/20 bg-card p-5">
                <h2 className="text-[1rem] font-extrabold text-foreground">{item.q}</h2>
                <p className="mt-2 text-[14px] leading-6 text-muted-foreground">{item.a}</p>
              </div>
            ))}
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
