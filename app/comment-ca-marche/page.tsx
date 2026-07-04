import Link from "next/link";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Container } from "@/components/ui/Container";

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
    <main className="flex flex-col" style={{ minHeight: "100svh" }}>
      <SiteHeader />
      <div className="flex-1 py-14 sm:py-20">
        <Container className="max-w-2xl">
          <h1 className="text-[2rem] font-extrabold tracking-[-0.04em] text-foreground sm:text-[2.4rem]">
            Comment ça marche
          </h1>
          <div className="mt-8 space-y-6">
            {STEPS.map((step) => (
              <div key={step.title} className="rounded-[1.2rem] border border-border/20 bg-card p-5">
                <h2 className="text-[1rem] font-extrabold text-foreground">{step.title}</h2>
                <p className="mt-2 text-[14px] leading-6 text-muted-foreground">{step.text}</p>
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
