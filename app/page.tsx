import type { Metadata } from "next";
import { GoogleLikeHero } from "@/components/home/GoogleLikeHero";
import { MarketPulse } from "@/components/landing/MarketPulse";
import { CityIntentGrid } from "@/components/landing/CityIntentGrid";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const metadata: Metadata = {
  title: "AkarFinder — Toutes les annonces immobilières du Maroc",
  description:
    "Cherchez, filtrez et comparez les annonces immobilières du Maroc depuis plusieurs sources, avec accès à la source originale.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader variant="transparent" compact />
      <GoogleLikeHero />

      <section aria-labelledby="home-results-title" className="border-b border-border/10 bg-background py-10 sm:py-14">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#0B63CE]">
                Résultats disponibles
              </p>
              <h2 id="home-results-title" className="mt-2 text-2xl font-extrabold tracking-[-0.04em] sm:text-3xl">
                Commencez par les biens, pas par les explications.
              </h2>
            </div>
            <a href="/search" className="text-[13px] font-extrabold text-[#0B63CE] hover:underline">
              Voir tous les résultats →
            </a>
          </div>
          <MarketPulse />
        </div>
      </section>

      <CityIntentGrid />
      <SiteFooter />
    </main>
  );
}
