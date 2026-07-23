import Link from "next/link";
import { ArrowRight, Building2, Compass, Map, Search } from "lucide-react";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Container } from "@/components/ui/Container";
import { getAllCities } from "@/lib/seo-city-pages/city-seo-data";

export const metadata = {
  title: "Immobilier au Maroc | AkarFinder",
  description:
    "Explorez l'immobilier au Maroc par ville et quartier, puis lancez une recherche structurée avec sources et niveaux d'information explicites.",
  robots: { index: true, follow: true },
};

export default function ImmobilierPage() {
  const cities = getAllCities();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader compact />

      <section className="border-b border-border/12 bg-surface py-12 dark:border-white/8 dark:bg-deepblue sm:py-16 lg:py-20">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
            <div className="max-w-3xl">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-bronze-500">Index immobilier local</p>
              <h1 className="mt-3 text-[2.35rem] font-extrabold leading-[1.04] tracking-[-0.05em] sm:text-[3.6rem]">Explorez le Maroc par ville, quartier et intention.</h1>
              <p className="mt-4 max-w-2xl text-[14px] leading-7 text-muted-foreground sm:text-[15.5px]">Cette porte d’entrée relie le moteur de recherche, les entités géographiques canoniques et les repères quartier. Elle n’est pas un catalogue parallèle.</p>

              <form action="/search" method="get" className="mt-7 flex overflow-hidden rounded-2xl border border-border/15 bg-card p-1 shadow-[0_16px_50px_rgba(2,10,24,0.12)] dark:border-white/10 dark:bg-white/[0.06]">
                <div className="flex min-w-0 flex-1 items-center gap-2 px-4">
                  <Search size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                  <input name="q" placeholder="Ville, quartier, type de bien…" className="min-w-0 flex-1 bg-transparent py-3.5 text-[14px] outline-none placeholder:text-muted-foreground" />
                </div>
                <button type="submit" className="rounded-xl bg-gradient-to-br from-bronze-500 to-bronze-700 px-5 py-3 text-[13px] font-extrabold text-white">Rechercher</button>
              </form>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/search?transaction_type=buy" className="rounded-full border border-border/20 px-4 py-2 text-[12px] font-bold">Acheter</Link>
                <Link href="/search?transaction_type=rent" className="rounded-full border border-border/20 px-4 py-2 text-[12px] font-bold">Louer</Link>
                <Link href="/search?transaction_type=new" className="rounded-full border border-border/20 px-4 py-2 text-[12px] font-bold">Neuf</Link>
              </div>
            </div>

            <aside className="rounded-3xl border border-border/15 bg-card p-6 dark:border-white/10 dark:bg-white/[0.04]">
              <Map size={20} className="text-bronze-500" aria-hidden="true" />
              <h2 className="mt-4 text-lg font-extrabold">Repères quartier sur la carte</h2>
              <p className="mt-2 text-[12.5px] leading-6 text-muted-foreground">Explorez des repères indicatifs séparés des résultats Search. Un repère local ne représente pas un comptage exhaustif d’annonces.</p>
              <Link href="/map" className="mt-5 inline-flex items-center gap-2 text-[13px] font-extrabold text-bronze-500">Ouvrir la carte <ArrowRight size={13} aria-hidden="true" /></Link>
            </aside>
          </div>
        </Container>
      </section>

      <section className="py-12 lg:py-16">
        <Container>
          <div className="max-w-2xl">
            <p className="text-[10.5px] font-extrabold uppercase tracking-[0.2em] text-bronze-500">Villes éligibles</p>
            <h2 className="mt-2 text-[1.75rem] font-extrabold tracking-[-0.04em]">Explorer les hubs locaux publiés</h2>
            <p className="mt-2 text-[12.5px] leading-6 text-muted-foreground">AkarFinder publie seulement les entités locales prévues par le registre et les gates SEO actuels. L’expansion nationale se fera sans générer automatiquement des pages faibles.</p>
          </div>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cities.map((city) => (
              <Link key={city.slug} href={`/immobilier/${city.slug}`} className="group rounded-2xl border border-border/15 bg-card p-5 transition hover:border-bronze-500/40 dark:border-white/10 dark:bg-white/[0.04]">
                <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-bronze-500">Ville</p>
                <h3 className="mt-2 text-xl font-extrabold">{city.displayName}</h3>
                <p className="mt-2 line-clamp-2 text-[12.5px] leading-5 text-muted-foreground">{city.description}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-[12.5px] font-extrabold text-bronze-500">Explorer <ArrowRight size={13} aria-hidden="true" /></span>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-y border-border/12 bg-surface py-12 dark:border-white/8">
        <Container>
          <div className="grid gap-4 md:grid-cols-3">
            <Link href="/search" className="rounded-2xl border border-border/15 bg-card p-5 dark:border-white/10 dark:bg-white/[0.04]"><Search size={18} className="text-bronze-500" /><h3 className="mt-4 font-extrabold">Moteur Search</h3><p className="mt-1 text-[12px] leading-5 text-muted-foreground">Résultats, sources, niveaux d’information et filtres réels.</p></Link>
            <Link href="/map" className="rounded-2xl border border-border/15 bg-card p-5 dark:border-white/10 dark:bg-white/[0.04]"><Compass size={18} className="text-bronze-500" /><h3 className="mt-4 font-extrabold">Repères quartier</h3><p className="mt-1 text-[12px] leading-5 text-muted-foreground">Carte et contexte local indicatif, séparés du volume d’offres.</p></Link>
            <Link href="/pro" className="rounded-2xl border border-border/15 bg-card p-5 dark:border-white/10 dark:bg-white/[0.04]"><Building2 size={18} className="text-bronze-500" /><h3 className="mt-4 font-extrabold">Professionnels</h3><p className="mt-1 text-[12px] leading-5 text-muted-foreground">Fournir des données autorisées et structurées à AkarFinder.</p></Link>
          </div>
        </Container>
      </section>

      <SiteFooter />
    </main>
  );
}
