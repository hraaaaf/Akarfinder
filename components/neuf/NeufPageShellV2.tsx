import Link from "next/link";
import { ArrowRight, Building2, Compass, Info, Search, ShieldCheck } from "lucide-react";

import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Container } from "@/components/ui/Container";

const PRINCIPLES = [
  {
    icon: Search,
    title: "Recherche d’abord",
    text: "Les programmes neufs disponibles dans le moteur sont recherchés comme les autres résultats, avec leur source et leur niveau d’information.",
  },
  {
    icon: ShieldCheck,
    title: "Aucun projet fictif présenté comme actif",
    text: "Une démonstration commerciale reste séparée de l’inventaire réel et toujours explicitement labellisée comme exemple.",
  },
  {
    icon: Building2,
    title: "Données promoteur qualifiées",
    text: "Lorsqu’un partenaire sera actif, ses projets seront publiés à partir de données déclarées, structurées et autorisées — jamais inventées pour remplir une page.",
  },
];

export function NeufPageShellV2() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader compact />

      <section className="relative overflow-hidden border-b border-border/12 bg-surface py-12 dark:border-white/8 dark:bg-deepblue sm:py-16 lg:py-20">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
            <div className="max-w-3xl">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-bronze-500">Immobilier neuf</p>
              <h1 className="mt-3 text-[2.35rem] font-extrabold leading-[1.04] tracking-[-0.05em] sm:text-[3.5rem]">
                Cherchez le neuf sans confondre inventaire réel et démonstration.
              </h1>
              <p className="mt-4 max-w-2xl text-[14px] leading-7 text-muted-foreground sm:text-[15.5px]">
                AkarFinder ne présente pas de faux programme partenaire pour donner l’impression d’un catalogue actif. Utilisez le moteur pour rechercher les offres disponibles ; les exemples de pages promoteur restent dans l’espace Démo.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/search?transaction_type=new" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-bronze-500 to-bronze-700 px-5 py-3 text-[13.5px] font-extrabold text-white">
                  Rechercher dans le neuf <ArrowRight size={14} aria-hidden="true" />
                </Link>
                <Link href="/compagnon" className="inline-flex items-center gap-2 rounded-xl border border-border/20 bg-card px-5 py-3 text-[13.5px] font-extrabold dark:border-white/12 dark:bg-white/[0.04]">
                  Définir Mon Projet <Compass size={14} aria-hidden="true" />
                </Link>
              </div>
            </div>

            <aside className="rounded-3xl border border-amber-400/25 bg-amber-500/8 p-6 dark:bg-amber-400/[0.05]">
              <div className="flex items-start gap-3">
                <Info size={19} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-300" aria-hidden="true" />
                <div>
                  <p className="text-[13px] font-extrabold">État actuel de cette page</p>
                  <p className="mt-2 text-[12.5px] leading-6 text-muted-foreground">
                    Aucun inventaire partenaire n’est présenté ici comme actif. Les résultats éventuels du moteur peuvent provenir de sources publiques ou autorisées et doivent être lus selon leur niveau d’information.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </Container>
      </section>

      <section className="py-12 lg:py-16">
        <Container>
          <div className="max-w-2xl">
            <p className="text-[10.5px] font-extrabold uppercase tracking-[0.2em] text-bronze-500">Comment AkarFinder traite le neuf</p>
            <h2 className="mt-2 text-[1.7rem] font-extrabold tracking-[-0.04em]">Une séparation claire entre recherche, preuve et vente B2B</h2>
          </div>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {PRINCIPLES.map(({ icon: Icon, title, text }) => (
              <article key={title} className="rounded-2xl border border-border/15 bg-card p-5 dark:border-white/10 dark:bg-white/[0.04]">
                <Icon size={18} className="text-bronze-500" aria-hidden="true" />
                <h3 className="mt-4 text-[14px] font-extrabold">{title}</h3>
                <p className="mt-2 text-[12px] leading-5 text-muted-foreground">{text}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-y border-border/12 bg-surface py-12 dark:border-white/8">
        <Container>
          <div className="grid gap-5 lg:grid-cols-2">
            <article className="rounded-3xl border border-border/15 bg-card p-6 dark:border-white/10 dark:bg-white/[0.04]">
              <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-bronze-500">Vous êtes acheteur</p>
              <h2 className="mt-3 text-xl font-extrabold">Cherchez les offres disponibles</h2>
              <p className="mt-2 text-[13px] leading-6 text-muted-foreground">Le moteur reste la surface canonique pour filtrer, comparer le niveau d’information et ouvrir la source originale lorsqu’il s’agit d’une offre observée.</p>
              <Link href="/search?transaction_type=new" className="mt-5 inline-flex items-center gap-2 text-[13px] font-extrabold text-bronze-500">Ouvrir la recherche Neuf <ArrowRight size={13} aria-hidden="true" /></Link>
            </article>

            <article className="rounded-3xl border border-border/15 bg-card p-6 dark:border-white/10 dark:bg-white/[0.04]">
              <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-bronze-500">Vous êtes promoteur</p>
              <h2 className="mt-3 text-xl font-extrabold">Découvrez la future expérience partenaire</h2>
              <p className="mt-2 text-[13px] leading-6 text-muted-foreground">Les démonstrations sont fictives et séparées du produit public. Elles montrent le niveau de structuration visé avant activation de vrais partenaires.</p>
              <div className="mt-5 flex flex-wrap gap-4">
                <Link href="/demo/promoteur" className="inline-flex items-center gap-2 text-[13px] font-extrabold text-bronze-500">Voir la démo promoteur <ArrowRight size={13} aria-hidden="true" /></Link>
                <Link href="/promoteurs" className="inline-flex items-center gap-2 text-[13px] font-extrabold text-foreground/75">Espace promoteurs <ArrowRight size={13} aria-hidden="true" /></Link>
              </div>
            </article>
          </div>
        </Container>
      </section>

      <SiteFooter />
    </main>
  );
}
